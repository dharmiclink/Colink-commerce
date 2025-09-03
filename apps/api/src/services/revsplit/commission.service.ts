/**
 * RevSplit™ Commission Service
 * 
 * Handles commission rule application, calculation, and ledger entry creation
 * for the CoLink Commerce platform.
 */

import { PrismaClient, Prisma, CommissionRule, Order, OrderItem, LedgerEntry } from '@prisma/client';
import { NotFoundError, ValidationError, InternalServerError } from '../../utils/errors';
import { prisma } from '../../index';
import { logger } from '../../utils/logger';
import { CurrencyService } from '../payment/currency.service';

/**
 * Commission calculation result interface
 */
export interface CommissionCalculation {
  orderItemId: string;
  subtotal: Prisma.Decimal;
  platformFee: Prisma.Decimal;
  creatorCommission: Prisma.Decimal;
  paymentFee: Prisma.Decimal;
  sellerTake: Prisma.Decimal;
  currency: string;
  appliedRuleId: string;
  appliedRuleType: string;
}

/**
 * Ledger entry creation request interface
 */
export interface LedgerEntryRequest {
  organizationId: string;
  orderId: string;
  orderItemId?: string;
  payoutId?: string;
  entryType: string;
  amount: Prisma.Decimal;
  currency: string;
  description?: string;
  status: string;
  metadata?: Record<string, any>;
}

/**
 * Commission rule priority types
 */
export enum CommissionRuleType {
  CAMPAIGN = 'CAMPAIGN',
  SKU = 'SKU',
  PRODUCT = 'PRODUCT',
  DEFAULT = 'DEFAULT',
}

/**
 * Ledger entry types
 */
export enum LedgerEntryType {
  SALE = 'SALE',
  COMMISSION = 'COMMISSION',
  PLATFORM_FEE = 'PLATFORM_FEE',
  PAYMENT_FEE = 'PAYMENT_FEE',
  PAYOUT = 'PAYOUT',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

/**
 * Ledger entry status
 */
export enum LedgerEntryStatus {
  RESERVED = 'RESERVED',
  CLEARED = 'CLEARED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

/**
 * RevSplit™ Commission Service
 * Handles all commission-related operations
 */
export class CommissionService {
  private prisma: PrismaClient;
  private currencyService: CurrencyService;

  constructor() {
    this.prisma = prisma;
    this.currencyService = new CurrencyService();
  }

  /**
   * Find the applicable commission rule for an order item
   * Priority: Campaign > SKU > Product > Default
   */
  public async findApplicableCommissionRule(
    orderItem: OrderItem & {
      order: Order;
      sku: { productId: string };
    },
    campaignId?: string
  ): Promise<CommissionRule> {
    const { order, sku } = orderItem;
    const { organizationId } = order;
    const { productId } = sku;

    // Step 1: Try to find a campaign-specific rule if campaignId is provided
    if (campaignId) {
      const campaignRule = await this.prisma.commissionRule.findFirst({
        where: {
          organizationId,
          campaignId,
          type: CommissionRuleType.CAMPAIGN,
          isActive: true,
          startDate: {
            lte: new Date(),
          },
          endDate: {
            gte: new Date(),
          },
        },
      });

      if (campaignRule) {
        logger.debug(
          { ruleId: campaignRule.id, type: CommissionRuleType.CAMPAIGN },
          'Found campaign-specific commission rule'
        );
        return campaignRule;
      }
    }

    // Step 2: Try to find an SKU-specific rule
    const skuRule = await this.prisma.commissionRule.findFirst({
      where: {
        organizationId,
        skuId: orderItem.skuId,
        type: CommissionRuleType.SKU,
        isActive: true,
        startDate: {
          lte: new Date(),
        },
        endDate: {
          gte: new Date(),
        },
      },
    });

    if (skuRule) {
      logger.debug(
        { ruleId: skuRule.id, type: CommissionRuleType.SKU },
        'Found SKU-specific commission rule'
      );
      return skuRule;
    }

    // Step 3: Try to find a product-specific rule
    const productRule = await this.prisma.commissionRule.findFirst({
      where: {
        organizationId,
        productId,
        type: CommissionRuleType.PRODUCT,
        isActive: true,
        startDate: {
          lte: new Date(),
        },
        endDate: {
          gte: new Date(),
        },
      },
    });

    if (productRule) {
      logger.debug(
        { ruleId: productRule.id, type: CommissionRuleType.PRODUCT },
        'Found product-specific commission rule'
      );
      return productRule;
    }

    // Step 4: Fall back to the default rule
    const defaultRule = await this.prisma.commissionRule.findFirst({
      where: {
        organizationId,
        type: CommissionRuleType.DEFAULT,
        isActive: true,
        startDate: {
          lte: new Date(),
        },
        endDate: {
          gte: new Date(),
        },
      },
    });

    if (defaultRule) {
      logger.debug(
        { ruleId: defaultRule.id, type: CommissionRuleType.DEFAULT },
        'Using default commission rule'
      );
      return defaultRule;
    }

    // If no rule is found, throw an error
    throw new NotFoundError(
      'No applicable commission rule found',
      'COMMISSION_RULE_NOT_FOUND',
      { organizationId, productId, skuId: orderItem.skuId }
    );
  }

  /**
   * Calculate commission for an order item
   * Formula:
   * - platform_fee = subtotal * platform_fee_pct
   * - creator_commission = subtotal * creator_pct
   * - seller_take = subtotal - platform_fee - creator_commission - payment_fees
   * - where subtotal = qty * unit_price (post-discount)
   */
  public async calculateCommission(
    orderItem: OrderItem & {
      order: Order;
      sku: { productId: string };
    },
    paymentFeePercent: number = 0.029, // Default payment processing fee (2.9%)
    campaignId?: string
  ): Promise<CommissionCalculation> {
    try {
      // Find the applicable commission rule
      const rule = await this.findApplicableCommissionRule(orderItem, campaignId);

      // Calculate the subtotal (quantity * unit price after discount)
      const subtotal = orderItem.subtotal;

      // Calculate platform fee
      let platformFee = new Prisma.Decimal(subtotal)
        .mul(rule.platformFeePercent)
        .div(100);

      // Calculate creator commission
      let creatorCommission = new Prisma.Decimal(subtotal)
        .mul(rule.creatorPercent)
        .div(100);

      // Apply minimum commission cap if set
      if (rule.minCommission && creatorCommission.lessThan(rule.minCommission)) {
        creatorCommission = rule.minCommission;
      }

      // Apply maximum commission cap if set
      if (rule.maxCommission && creatorCommission.greaterThan(rule.maxCommission)) {
        creatorCommission = rule.maxCommission;
      }

      // Calculate payment processing fee
      const paymentFee = new Prisma.Decimal(subtotal)
        .mul(new Prisma.Decimal(paymentFeePercent));

      // Calculate seller take
      const sellerTake = new Prisma.Decimal(subtotal)
        .minus(platformFee)
        .minus(creatorCommission)
        .minus(paymentFee);

      // Ensure seller take is not negative
      if (sellerTake.lessThan(0)) {
        logger.warn(
          {
            orderItemId: orderItem.id,
            subtotal: subtotal.toString(),
            platformFee: platformFee.toString(),
            creatorCommission: creatorCommission.toString(),
            paymentFee: paymentFee.toString(),
            sellerTake: sellerTake.toString(),
          },
          'Negative seller take calculated, adjusting commission'
        );

        // Adjust creator commission to ensure seller take is at least 0
        creatorCommission = new Prisma.Decimal(subtotal)
          .minus(platformFee)
          .minus(paymentFee);

        if (creatorCommission.lessThan(0)) {
          creatorCommission = new Prisma.Decimal(0);
        }
      }

      return {
        orderItemId: orderItem.id,
        subtotal,
        platformFee,
        creatorCommission,
        paymentFee,
        sellerTake: sellerTake.lessThan(0) ? new Prisma.Decimal(0) : sellerTake,
        currency: orderItem.order.currency,
        appliedRuleId: rule.id,
        appliedRuleType: rule.type,
      };
    } catch (error) {
      logger.error(
        { error, orderItemId: orderItem.id },
        'Error calculating commission'
      );
      throw error;
    }
  }

  /**
   * Create ledger entries for an order item commission calculation
   * Uses double-entry accounting pattern
   */
  public async createLedgerEntries(
    calculation: CommissionCalculation,
    order: Order,
    creatorId: string
  ): Promise<LedgerEntry[]> {
    const entries: LedgerEntryRequest[] = [];
    const { organizationId } = order;

    try {
      // Start a transaction to ensure all entries are created or none
      return await this.prisma.$transaction(async (tx) => {
        // 1. Create SALE entry (credit to seller)
        const saleEntry = await tx.ledgerEntry.create({
          data: {
            organizationId,
            orderId: order.id,
            orderItemId: calculation.orderItemId,
            entryType: LedgerEntryType.SALE,
            amount: calculation.subtotal,
            currency: calculation.currency,
            description: `Sale revenue for order item ${calculation.orderItemId}`,
            status: LedgerEntryStatus.RESERVED,
            metadata: {
              calculationId: `calc_${Date.now()}`,
              appliedRuleId: calculation.appliedRuleId,
              appliedRuleType: calculation.appliedRuleType,
            },
          },
        });

        // 2. Create PLATFORM_FEE entry (debit from seller, credit to platform)
        const platformFeeEntry = await tx.ledgerEntry.create({
          data: {
            organizationId,
            orderId: order.id,
            orderItemId: calculation.orderItemId,
            entryType: LedgerEntryType.PLATFORM_FEE,
            amount: calculation.platformFee,
            currency: calculation.currency,
            description: `Platform fee for order item ${calculation.orderItemId}`,
            status: LedgerEntryStatus.RESERVED,
            metadata: {
              calculationId: `calc_${Date.now()}`,
              appliedRuleId: calculation.appliedRuleId,
              appliedRuleType: calculation.appliedRuleType,
            },
          },
        });

        // 3. Create COMMISSION entry (debit from seller, credit to creator)
        const commissionEntry = await tx.ledgerEntry.create({
          data: {
            organizationId,
            orderId: order.id,
            orderItemId: calculation.orderItemId,
            entryType: LedgerEntryType.COMMISSION,
            amount: calculation.creatorCommission,
            currency: calculation.currency,
            description: `Creator commission for order item ${calculation.orderItemId}`,
            status: LedgerEntryStatus.RESERVED,
            metadata: {
              calculationId: `calc_${Date.now()}`,
              appliedRuleId: calculation.appliedRuleId,
              appliedRuleType: calculation.appliedRuleType,
              creatorId,
            },
          },
        });

        // 4. Create PAYMENT_FEE entry (debit from seller)
        const paymentFeeEntry = await tx.ledgerEntry.create({
          data: {
            organizationId,
            orderId: order.id,
            orderItemId: calculation.orderItemId,
            entryType: LedgerEntryType.PAYMENT_FEE,
            amount: calculation.paymentFee,
            currency: calculation.currency,
            description: `Payment processing fee for order item ${calculation.orderItemId}`,
            status: LedgerEntryStatus.RESERVED,
            metadata: {
              calculationId: `calc_${Date.now()}`,
              appliedRuleId: calculation.appliedRuleId,
              appliedRuleType: calculation.appliedRuleType,
            },
          },
        });

        return [saleEntry, platformFeeEntry, commissionEntry, paymentFeeEntry];
      });
    } catch (error) {
      logger.error(
        { error, orderItemId: calculation.orderItemId },
        'Error creating ledger entries'
      );
      throw new InternalServerError(
        'Failed to create ledger entries',
        'LEDGER_ENTRY_CREATION_FAILED',
        { orderItemId: calculation.orderItemId }
      );
    }
  }

  /**
   * Process commission for a complete order
   * Calculates commissions for all items and creates ledger entries
   */
  public async processOrderCommissions(
    orderId: string,
    campaignId?: string,
    creatorId?: string
  ): Promise<{
    calculations: CommissionCalculation[];
    ledgerEntries: LedgerEntry[];
  }> {
    try {
      // Fetch the order with items and related data
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              sku: {
                select: {
                  productId: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND', { orderId });
      }

      // If creatorId is not provided but campaignId is, try to get the creator from the campaign
      if (!creatorId && campaignId) {
        const campaign = await this.prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { creatorId: true },
        });

        if (campaign) {
          creatorId = campaign.creatorId;
        }
      }

      if (!creatorId) {
        throw new ValidationError(
          'Creator ID is required for commission processing',
          'CREATOR_ID_REQUIRED'
        );
      }

      const calculations: CommissionCalculation[] = [];
      const ledgerEntries: LedgerEntry[] = [];

      // Process each order item
      for (const item of order.orderItems) {
        // Calculate commission
        const calculation = await this.calculateCommission(
          {
            ...item,
            order,
          },
          0.029, // Default payment fee percentage
          campaignId
        );

        calculations.push(calculation);

        // Create ledger entries
        const entries = await this.createLedgerEntries(calculation, order, creatorId);
        ledgerEntries.push(...entries);
      }

      return { calculations, ledgerEntries };
    } catch (error) {
      logger.error({ error, orderId }, 'Error processing order commissions');
      throw error;
    }
  }

  /**
   * Clear reserved ledger entries after order confirmation
   * Changes status from RESERVED to CLEARED
   */
  public async clearLedgerEntries(orderId: string): Promise<LedgerEntry[]> {
    try {
      // Find all RESERVED entries for this order
      const reservedEntries = await this.prisma.ledgerEntry.findMany({
        where: {
          orderId,
          status: LedgerEntryStatus.RESERVED,
        },
      });

      if (reservedEntries.length === 0) {
        logger.info({ orderId }, 'No reserved ledger entries found to clear');
        return [];
      }

      // Update all entries to CLEARED status
      const clearedEntries = await this.prisma.$transaction(
        reservedEntries.map((entry) =>
          this.prisma.ledgerEntry.update({
            where: { id: entry.id },
            data: {
              status: LedgerEntryStatus.CLEARED,
              clearedAt: new Date(),
            },
          })
        )
      );

      logger.info(
        { orderId, count: clearedEntries.length },
        'Ledger entries cleared successfully'
      );
      return clearedEntries;
    } catch (error) {
      logger.error({ error, orderId }, 'Error clearing ledger entries');
      throw new InternalServerError(
        'Failed to clear ledger entries',
        'LEDGER_ENTRY_CLEARING_FAILED',
        { orderId }
      );
    }
  }

  /**
   * Cancel ledger entries for an order (e.g., refund, cancellation)
   */
  public async cancelLedgerEntries(
    orderId: string,
    reason: string
  ): Promise<LedgerEntry[]> {
    try {
      // Find all entries for this order that are not already cancelled
      const activeEntries = await this.prisma.ledgerEntry.findMany({
        where: {
          orderId,
          status: {
            notIn: [LedgerEntryStatus.CANCELLED],
          },
        },
      });

      if (activeEntries.length === 0) {
        logger.info({ orderId }, 'No active ledger entries found to cancel');
        return [];
      }

      // Update all entries to CANCELLED status
      const cancelledEntries = await this.prisma.$transaction(
        activeEntries.map((entry) =>
          this.prisma.ledgerEntry.update({
            where: { id: entry.id },
            data: {
              status: LedgerEntryStatus.CANCELLED,
              metadata: {
                ...entry.metadata,
                cancellationReason: reason,
                cancelledAt: new Date().toISOString(),
              },
            },
          })
        )
      );

      logger.info(
        { orderId, count: cancelledEntries.length },
        'Ledger entries cancelled successfully'
      );
      return cancelledEntries;
    } catch (error) {
      logger.error({ error, orderId }, 'Error cancelling ledger entries');
      throw new InternalServerError(
        'Failed to cancel ledger entries',
        'LEDGER_ENTRY_CANCELLATION_FAILED',
        { orderId }
      );
    }
  }

  /**
   * Get pending commissions for a creator
   * Returns all CLEARED commissions that haven't been paid out
   */
  public async getPendingCreatorCommissions(
    creatorId: string,
    currency?: string
  ): Promise<{
    totalAmount: Prisma.Decimal;
    currency: string;
    commissions: LedgerEntry[];
  }> {
    try {
      // Find all cleared commission entries for this creator
      const commissions = await this.prisma.ledgerEntry.findMany({
        where: {
          entryType: LedgerEntryType.COMMISSION,
          status: LedgerEntryStatus.CLEARED,
          metadata: {
            path: ['creatorId'],
            equals: creatorId,
          },
          ...(currency ? { currency } : {}),
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Calculate total amount
      const totalAmount = commissions.reduce(
        (sum, entry) => sum.add(entry.amount),
        new Prisma.Decimal(0)
      );

      // If currency conversion is needed and there are multiple currencies,
      // we would handle that here with the CurrencyService
      let targetCurrency = currency || (commissions[0]?.currency || 'USD');
      
      // If we need to convert currencies
      if (!currency && commissions.some(entry => entry.currency !== targetCurrency)) {
        // Group by currency
        const currencyGroups = commissions.reduce((acc, entry) => {
          if (!acc[entry.currency]) {
            acc[entry.currency] = new Prisma.Decimal(0);
          }
          acc[entry.currency] = acc[entry.currency].add(entry.amount);
          return acc;
        }, {} as Record<string, Prisma.Decimal>);
        
        // Convert all to target currency and sum
        let convertedTotal = new Prisma.Decimal(0);
        for (const [fromCurrency, amount] of Object.entries(currencyGroups)) {
          if (fromCurrency === targetCurrency) {
            convertedTotal = convertedTotal.add(amount);
          } else {
            const convertedAmount = await this.currencyService.convert(
              amount,
              fromCurrency,
              targetCurrency
            );
            convertedTotal = convertedTotal.add(convertedAmount);
          }
        }
        
        return {
          totalAmount: convertedTotal,
          currency: targetCurrency,
          commissions,
        };
      }

      return {
        totalAmount,
        currency: targetCurrency,
        commissions,
      };
    } catch (error) {
      logger.error({ error, creatorId }, 'Error fetching pending creator commissions');
      throw new InternalServerError(
        'Failed to fetch pending commissions',
        'COMMISSION_FETCH_FAILED',
        { creatorId }
      );
    }
  }

  /**
   * Mark commissions as paid when a payout is processed
   */
  public async markCommissionsAsPaid(
    commissionIds: string[],
    payoutId: string
  ): Promise<LedgerEntry[]> {
    try {
      // Update all specified commission entries to PAID status
      const paidEntries = await this.prisma.$transaction(
        commissionIds.map((id) =>
          this.prisma.ledgerEntry.update({
            where: { id },
            data: {
              status: LedgerEntryStatus.PAID,
              payoutId,
              paidAt: new Date(),
            },
          })
        )
      );

      logger.info(
        { payoutId, count: paidEntries.length },
        'Commissions marked as paid successfully'
      );
      return paidEntries;
    } catch (error) {
      logger.error({ error, payoutId }, 'Error marking commissions as paid');
      throw new InternalServerError(
        'Failed to mark commissions as paid',
        'COMMISSION_PAYMENT_UPDATE_FAILED',
        { payoutId }
      );
    }
  }

  /**
   * Reconcile commissions with actual payouts
   * Useful for audit and reporting purposes
   */
  public async reconcileCommissions(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalCommissions: Prisma.Decimal;
    totalPaid: Prisma.Decimal;
    totalPending: Prisma.Decimal;
    reconciliationStatus: 'BALANCED' | 'DISCREPANCY';
    discrepancyAmount?: Prisma.Decimal;
  }> {
    try {
      // Get all commission entries in the date range
      const commissions = await this.prisma.ledgerEntry.findMany({
        where: {
          organizationId,
          entryType: LedgerEntryType.COMMISSION,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Calculate totals
      const totalCommissions = commissions.reduce(
        (sum, entry) => sum.add(entry.amount),
        new Prisma.Decimal(0)
      );

      const paidCommissions = commissions.filter(
        (entry) => entry.status === LedgerEntryStatus.PAID
      );
      const totalPaid = paidCommissions.reduce(
        (sum, entry) => sum.add(entry.amount),
        new Prisma.Decimal(0)
      );

      const pendingCommissions = commissions.filter(
        (entry) =>
          entry.status === LedgerEntryStatus.CLEARED ||
          entry.status === LedgerEntryStatus.RESERVED
      );
      const totalPending = pendingCommissions.reduce(
        (sum, entry) => sum.add(entry.amount),
        new Prisma.Decimal(0)
      );

      // Check if everything balances
      const expectedBalance = totalPaid.add(totalPending);
      const discrepancyAmount = totalCommissions.sub(expectedBalance);
      const reconciliationStatus =
        discrepancyAmount.equals(0) ? 'BALANCED' : 'DISCREPANCY';

      return {
        totalCommissions,
        totalPaid,
        totalPending,
        reconciliationStatus,
        ...(reconciliationStatus === 'DISCREPANCY' ? { discrepancyAmount } : {}),
      };
    } catch (error) {
      logger.error(
        { error, organizationId, startDate, endDate },
        'Error reconciling commissions'
      );
      throw new InternalServerError(
        'Failed to reconcile commissions',
        'COMMISSION_RECONCILIATION_FAILED',
        { organizationId }
      );
    }
  }
}

// Export a singleton instance
export const commissionService = new CommissionService();
