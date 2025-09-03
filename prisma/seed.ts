/**
 * CoLink Commerce Database Seed Script
 * 
 * This script populates the database with realistic demo data for the CoLink Commerce platform.
 * It creates demo sellers, creators, products, campaigns, and other essential data for testing
 * and demonstration purposes.
 * 
 * Usage:
 * - Run with: npx prisma db seed
 * - Reset DB: npx prisma migrate reset (will run seed automatically)
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import * as crypto from 'crypto';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Constants for seed data
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Password123!';

// Currency codes for Southeast Asia
const CURRENCIES = {
  MYR: 'MYR', // Malaysian Ringgit
  IDR: 'IDR', // Indonesian Rupiah
  PHP: 'PHP', // Philippine Peso
  THB: 'THB', // Thai Baht
  USD: 'USD', // US Dollar (for international)
};

// Countries in Southeast Asia
const SEA_COUNTRIES = {
  MY: 'Malaysia',
  ID: 'Indonesia',
  PH: 'Philippines',
  TH: 'Thailand',
  SG: 'Singapore',
};

// Platform types
const PLATFORMS = {
  SHOPEE: 'SHOPEE',
  LAZADA: 'LAZADA',
  SHOPIFY: 'SHOPIFY',
  WOOCOMMERCE: 'WOOCOMMERCE',
};

// Product categories for Southeast Asia
const PRODUCT_CATEGORIES = {
  BEAUTY: 'Beauty & Personal Care',
  FASHION: 'Fashion & Apparel',
  ELECTRONICS: 'Electronics & Gadgets',
  HOME: 'Home & Living',
  HEALTH: 'Health & Wellness',
  FOOD: 'Food & Beverages',
};

// Creator niches
const CREATOR_NICHES = [
  'Beauty', 'Fashion', 'Tech', 'Lifestyle', 'Fitness', 'Food',
  'Travel', 'Gaming', 'Parenting', 'Education', 'Finance',
];

// Role definitions
const ROLES = {
  ADMIN: 'ADMIN',
  SELLER: 'SELLER',
  CREATOR: 'CREATOR',
};

// Tier levels
const TIERS = {
  SILVER: { name: 'Silver', level: 1, minSales: 0 },
  GOLD: { name: 'Gold', level: 2, minSales: 1000 },
  PLATINUM: { name: 'Platinum', level: 3, minSales: 5000 },
  DIAMOND: { name: 'Diamond', level: 4, minSales: 20000 },
};

// Badge categories
const BADGE_CATEGORIES = {
  SALES: 'SALES',
  ENGAGEMENT: 'ENGAGEMENT',
  ACHIEVEMENT: 'ACHIEVEMENT',
};

/**
 * Helper function to encrypt sensitive data
 */
function encryptData(data: string): string {
  // In a real environment, use proper encryption with a secure key
  // This is a simplified version for the seed script
  const encryptionKey = process.env.ENCRYPTION_KEY || 'a-32-byte-string-for-aes-256-encryption';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Helper function to generate a hashed password
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Helper function to generate a random date within a range
 */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Helper function to generate a random decimal within a range
 */
function randomDecimal(min: number, max: number, places: number = 2): Prisma.Decimal {
  const value = min + Math.random() * (max - min);
  return new Prisma.Decimal(value.toFixed(places));
}

/**
 * Helper function to generate a random integer within a range
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Helper function to pick a random item from an array
 */
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Helper function to pick multiple random items from an array
 */
function randomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Helper function to generate a random color
 */
function randomColor(): string {
  const colors = [
    'Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Purple',
    'Pink', 'Orange', 'Brown', 'Grey', 'Navy', 'Teal', 'Maroon',
  ];
  return randomItem(colors);
}

/**
 * Helper function to generate a random size
 */
function randomSize(): string {
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '38', '39', '40', '41', '42'];
  return randomItem(sizes);
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Start a transaction for the entire seeding process
    await prisma.$transaction(async (tx) => {
      // Step 1: Create roles
      console.log('Creating roles...');
      const adminRole = await tx.role.upsert({
        where: { name: ROLES.ADMIN },
        update: {},
        create: {
          name: ROLES.ADMIN,
          description: 'Administrator with full access',
          permissions: ['*'],
        },
      });

      const sellerRole = await tx.role.upsert({
        where: { name: ROLES.SELLER },
        update: {},
        create: {
          name: ROLES.SELLER,
          description: 'Seller with access to products and orders',
          permissions: [
            'products:read', 'products:write',
            'orders:read', 'orders:write',
            'campaigns:read',
          ],
        },
      });

      const creatorRole = await tx.role.upsert({
        where: { name: ROLES.CREATOR },
        update: {},
        create: {
          name: ROLES.CREATOR,
          description: 'Creator with access to campaigns and analytics',
          permissions: [
            'campaigns:read', 'campaigns:write',
            'products:read',
            'analytics:read',
          ],
        },
      });

      console.log(`Created ${ROLES.ADMIN}, ${ROLES.SELLER}, and ${ROLES.CREATOR} roles`);

      // Step 2: Create tiers for gamification
      console.log('Creating tiers...');
      const tiers = await Promise.all(
        Object.values(TIERS).map(tier => 
          tx.tier.upsert({
            where: { name: tier.name },
            update: {},
            create: {
              name: tier.name,
              description: `${tier.name} tier members get ${tier.level * 5}% bonus on special campaigns`,
              level: tier.level,
              minSales: new Prisma.Decimal(tier.minSales),
              imageUrl: `https://colink-commerce-assets.s3.amazonaws.com/tiers/${tier.name.toLowerCase()}.png`,
              benefits: {
                commissionBonus: tier.level * 0.5,
                earlyAccess: tier.level >= 2,
                prioritySupport: tier.level >= 3,
                exclusiveProducts: tier.level >= 4,
              },
              isActive: true,
            },
          })
        )
      );

      console.log(`Created ${tiers.length} tiers for gamification`);

      // Step 3: Create badges
      console.log('Creating badges...');
      const badges = [];
      
      // Sales badges
      badges.push(
        await tx.badge.upsert({
          where: { name_level: { name: 'First Sale', level: 1 } },
          update: {},
          create: {
            name: 'First Sale',
            description: 'Completed your first sale',
            imageUrl: 'https://colink-commerce-assets.s3.amazonaws.com/badges/first_sale.png',
            category: BADGE_CATEGORIES.SALES,
            level: 1,
            criteria: { sales: 1 },
            isActive: true,
          },
        })
      );

      badges.push(
        await tx.badge.upsert({
          where: { name_level: { name: 'Sales Star', level: 1 } },
          update: {},
          create: {
            name: 'Sales Star',
            description: 'Reached 10 sales',
            imageUrl: 'https://colink-commerce-assets.s3.amazonaws.com/badges/sales_star_1.png',
            category: BADGE_CATEGORIES.SALES,
            level: 1,
            criteria: { sales: 10 },
            isActive: true,
          },
        })
      );

      badges.push(
        await tx.badge.upsert({
          where: { name_level: { name: 'Sales Star', level: 2 } },
          update: {},
          create: {
            name: 'Sales Star',
            description: 'Reached 50 sales',
            imageUrl: 'https://colink-commerce-assets.s3.amazonaws.com/badges/sales_star_2.png',
            category: BADGE_CATEGORIES.SALES,
            level: 2,
            criteria: { sales: 50 },
            isActive: true,
          },
        })
      );

      // Engagement badges
      badges.push(
        await tx.badge.upsert({
          where: { name_level: { name: 'Campaign Creator', level: 1 } },
          update: {},
          create: {
            name: 'Campaign Creator',
            description: 'Created your first campaign',
            imageUrl: 'https://colink-commerce-assets.s3.amazonaws.com/badges/campaign_creator.png',
            category: BADGE_CATEGORIES.ENGAGEMENT,
            level: 1,
            criteria: { campaigns: 1 },
            isActive: true,
          },
        })
      );

      badges.push(
        await tx.badge.upsert({
          where: { name_level: { name: 'Social Butterfly', level: 1 } },
          update: {},
          create: {
            name: 'Social Butterfly',
            description: 'Connected 3 social media accounts',
            imageUrl: 'https://colink-commerce-assets.s3.amazonaws.com/badges/social_butterfly.png',
            category: BADGE_CATEGORIES.ENGAGEMENT,
            level: 1,
            criteria: { socialConnections: 3 },
            isActive: true,
          },
        })
      );

      // Achievement badges
      badges.push(
        await tx.badge.upsert({
          where: { name_level: { name: 'Top Performer', level: 1 } },
          update: {},
          create: {
            name: 'Top Performer',
            description: 'Ranked in the top 10 creators for a month',
            imageUrl: 'https://colink-commerce-assets.s3.amazonaws.com/badges/top_performer.png',
            category: BADGE_CATEGORIES.ACHIEVEMENT,
            level: 1,
            criteria: { topRank: 10, period: 'MONTHLY' },
            isActive: true,
          },
        })
      );

      console.log(`Created ${badges.length} badges for gamification`);

      // Step 4: Create feature flags
      console.log('Creating feature flags...');
      const featureFlags = [
        { name: 'USE_MOCK_CONNECTORS', description: 'Use mock connectors for development', isEnabled: true },
        { name: 'ENABLE_ANALYTICS', description: 'Enable analytics tracking', isEnabled: true },
        { name: 'ENABLE_GAMIFICATION', description: 'Enable gamification features', isEnabled: true },
        { name: 'ENABLE_I18N', description: 'Enable internationalization', isEnabled: true },
        { name: 'USE_AUTH0', description: 'Use Auth0 instead of Clerk', isEnabled: false },
      ];

      for (const flag of featureFlags) {
        await tx.featureFlag.upsert({
          where: { name: flag.name },
          update: { isEnabled: flag.isEnabled },
          create: {
            name: flag.name,
            description: flag.description,
            isEnabled: flag.isEnabled,
          },
        });
      }

      console.log(`Created ${featureFlags.length} feature flags`);

      // Step 5: Create seller organizations and users
      console.log('Creating seller organizations and users...');
      
      const sellerOrgs = [
        {
          name: 'BeautyGlow Cosmetics',
          slug: 'beautyglow',
          country: SEA_COUNTRIES.MY,
          currency: CURRENCIES.MYR,
          categories: [PRODUCT_CATEGORIES.BEAUTY],
          platform: PLATFORMS.SHOPEE,
        },
        {
          name: 'FashionVibe',
          slug: 'fashionvibe',
          country: SEA_COUNTRIES.ID,
          currency: CURRENCIES.IDR,
          categories: [PRODUCT_CATEGORIES.FASHION],
          platform: PLATFORMS.LAZADA,
        },
        {
          name: 'GadgetHub',
          slug: 'gadgethub',
          country: SEA_COUNTRIES.PH,
          currency: CURRENCIES.PHP,
          categories: [PRODUCT_CATEGORIES.ELECTRONICS],
          platform: PLATFORMS.SHOPIFY,
        },
        {
          name: 'WellnessWorld',
          slug: 'wellnessworld',
          country: SEA_COUNTRIES.TH,
          currency: CURRENCIES.THB,
          categories: [PRODUCT_CATEGORIES.HEALTH],
          platform: PLATFORMS.WOOCOMMERCE,
        },
        {
          name: 'HomeLuxe Living',
          slug: 'homeluxe',
          country: SEA_COUNTRIES.SG,
          currency: CURRENCIES.USD,
          categories: [PRODUCT_CATEGORIES.HOME],
          platform: PLATFORMS.SHOPEE,
        },
      ];

      const sellerUsers = [];
      const sellerOrganizations = [];
      const storeConnections = [];

      for (let i = 0; i < sellerOrgs.length; i++) {
        const org = sellerOrgs[i];
        const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
        
        // Create seller user
        const user = await tx.user.create({
          data: {
            email: `seller${i + 1}@${org.slug}.com`,
            name: `${org.name} Admin`,
            password: hashedPassword,
            isActive: true,
            isEmailVerified: true,
            preferredLanguage: 'en',
          },
        });
        sellerUsers.push(user);

        // Create organization
        const organization = await tx.organization.create({
          data: {
            name: org.name,
            slug: org.slug,
            logo: `https://colink-commerce-assets.s3.amazonaws.com/logos/${org.slug}.png`,
            website: `https://www.${org.slug}.com`,
            description: `${org.name} is a leading ${org.categories[0].toLowerCase()} brand in ${org.country}.`,
            country: org.country,
            currency: org.currency,
            isVerified: true,
            verificationDate: new Date(),
          },
        });
        sellerOrganizations.push(organization);

        // Create user-organization relationship
        await tx.userOrganization.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            roleId: sellerRole.id,
            isDefault: true,
          },
        });

        // Create seller profile
        await tx.sellerProfile.create({
          data: {
            userId: user.id,
            businessName: org.name,
            businessType: 'Company',
            businessAddress: `123 ${org.name} Street`,
            businessCity: org.country === SEA_COUNTRIES.MY ? 'Kuala Lumpur' :
                         org.country === SEA_COUNTRIES.ID ? 'Jakarta' :
                         org.country === SEA_COUNTRIES.PH ? 'Manila' :
                         org.country === SEA_COUNTRIES.TH ? 'Bangkok' : 'Singapore',
            businessState: org.country === SEA_COUNTRIES.MY ? 'Kuala Lumpur' :
                          org.country === SEA_COUNTRIES.ID ? 'Jakarta' :
                          org.country === SEA_COUNTRIES.PH ? 'Metro Manila' :
                          org.country === SEA_COUNTRIES.TH ? 'Bangkok' : 'Singapore',
            businessPostalCode: '10000',
            businessCountry: org.country,
            taxIdentifier: `TAX${100000 + i}`,
            bankName: 'International Bank',
            bankAccountNumber: encryptData(`1234567890${i}`),
            bankAccountName: org.name,
            bankSwiftCode: 'ABCDEF12',
            stripeConnectId: `acct_${nanoid(14)}`,
            xenditAccountId: `xnd_${nanoid(14)}`,
            isVerified: true,
            verificationDate: new Date(),
          },
        });

        // Create store connection
        const storeConnection = await tx.storeConnection.create({
          data: {
            organizationId: organization.id,
            platform: org.platform,
            name: `${org.name} ${org.platform} Store`,
            accessToken: encryptData(`access_token_${nanoid(24)}`),
            refreshToken: encryptData(`refresh_token_${nanoid(24)}`),
            tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            storeId: `store_${nanoid(10)}`,
            storeUrl: `https://${org.platform.toLowerCase()}.com/shop/${org.slug}`,
            metadata: {
              storeRating: 4.8,
              followerCount: 1000 + i * 500,
              isOfficial: true,
            },
            isActive: true,
            lastSyncAt: new Date(),
          },
        });
        storeConnections.push(storeConnection);

        // Create organization feature flags
        for (const flag of featureFlags) {
          await tx.organizationFeatureFlag.create({
            data: {
              organizationId: organization.id,
              featureFlagId: (await tx.featureFlag.findUnique({ where: { name: flag.name } })).id,
              isEnabled: flag.isEnabled,
            },
          });
        }

        // Create default commission rule for organization
        await tx.commissionRule.create({
          data: {
            organizationId: organization.id,
            name: 'Default Commission',
            description: 'Default commission rule for all products',
            type: 'DEFAULT',
            creatorPercent: new Prisma.Decimal(10), // 10%
            platformFeePercent: new Prisma.Decimal(5), // 5%
            currency: org.currency,
            isActive: true,
          },
        });
      }

      console.log(`Created ${sellerUsers.length} seller users and organizations`);

      // Step 6: Create creator users
      console.log('Creating creator users...');
      
      const creatorData = [
        {
          name: 'Aisha Rahman',
          email: 'aisha@creator.com',
          displayName: 'AishaBeauty',
          bio: 'Beauty and skincare enthusiast from Malaysia',
          country: SEA_COUNTRIES.MY,
          niches: ['Beauty', 'Lifestyle'],
        },
        {
          name: 'Budi Santoso',
          email: 'budi@creator.com',
          displayName: 'BudiFashion',
          bio: 'Indonesian fashion influencer and style consultant',
          country: SEA_COUNTRIES.ID,
          niches: ['Fashion', 'Lifestyle'],
        },
        {
          name: 'Carlos Reyes',
          email: 'carlos@creator.com',
          displayName: 'TechCarlos',
          bio: 'Tech reviewer and gadget enthusiast from the Philippines',
          country: SEA_COUNTRIES.PH,
          niches: ['Tech', 'Gaming'],
        },
        {
          name: 'Dara Samnang',
          email: 'dara@creator.com',
          displayName: 'DaraWellness',
          bio: 'Health and wellness coach from Thailand',
          country: SEA_COUNTRIES.TH,
          niches: ['Fitness', 'Health'],
        },
        {
          name: 'Elaine Tan',
          email: 'elaine@creator.com',
          displayName: 'ElaineCooks',
          bio: 'Food blogger and home decor enthusiast from Singapore',
          country: SEA_COUNTRIES.SG,
          niches: ['Food', 'Home'],
        },
      ];

      const creatorUsers = [];

      for (let i = 0; i < creatorData.length; i++) {
        const creator = creatorData[i];
        const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
        
        // Create creator user
        const user = await tx.user.create({
          data: {
            email: creator.email,
            name: creator.name,
            password: hashedPassword,
            isActive: true,
            isEmailVerified: true,
            preferredLanguage: 'en',
            tierId: tiers[i % tiers.length].id, // Assign different tiers
          },
        });
        creatorUsers.push(user);

        // Create creator profile
        await tx.creatorProfile.create({
          data: {
            userId: user.id,
            displayName: creator.displayName,
            bio: creator.bio,
            profileImage: `https://colink-commerce-assets.s3.amazonaws.com/creators/${creator.displayName.toLowerCase()}.jpg`,
            coverImage: `https://colink-commerce-assets.s3.amazonaws.com/creators/${creator.displayName.toLowerCase()}_cover.jpg`,
            socialLinks: {
              instagram: `https://instagram.com/${creator.displayName.toLowerCase()}`,
              tiktok: `https://tiktok.com/@${creator.displayName.toLowerCase()}`,
              youtube: `https://youtube.com/@${creator.displayName.toLowerCase()}`,
            },
            niches: creator.niches,
            preferredCategories: creator.niches.map(niche => {
              if (niche === 'Beauty') return PRODUCT_CATEGORIES.BEAUTY;
              if (niche === 'Fashion') return PRODUCT_CATEGORIES.FASHION;
              if (niche === 'Tech') return PRODUCT_CATEGORIES.ELECTRONICS;
              if (niche === 'Health' || niche === 'Fitness') return PRODUCT_CATEGORIES.HEALTH;
              if (niche === 'Food') return PRODUCT_CATEGORIES.FOOD;
              if (niche === 'Home') return PRODUCT_CATEGORIES.HOME;
              return PRODUCT_CATEGORIES.FASHION; // Default
            }),
            bankName: 'Creator Bank',
            bankAccountNumber: encryptData(`9876543210${i}`),
            bankAccountName: creator.name,
            bankSwiftCode: 'CRTBNK12',
            stripeConnectId: `acct_${nanoid(14)}`,
            xenditAccountId: `xnd_${nanoid(14)}`,
            isVerified: true,
            verificationDate: new Date(),
          },
        });

        // Add some badges to creators
        await tx.userBadge.create({
          data: {
            userId: user.id,
            badgeId: badges[0].id, // First Sale badge
            awardedAt: randomDate(new Date(2023, 0, 1), new Date()),
          },
        });

        if (i < 3) { // Give some creators more badges
          await tx.userBadge.create({
            data: {
              userId: user.id,
              badgeId: badges[3].id, // Campaign Creator badge
              awardedAt: randomDate(new Date(2023, 0, 1), new Date()),
            },
          });
        }

        if (i === 0) { // Top performer gets more badges
          await tx.userBadge.create({
            data: {
              userId: user.id,
              badgeId: badges[1].id, // Sales Star level 1
              awardedAt: randomDate(new Date(2023, 0, 1), new Date()),
            },
          });
          
          await tx.userBadge.create({
            data: {
              userId: user.id,
              badgeId: badges[6].id, // Top Performer
              awardedAt: randomDate(new Date(2023, 0, 1), new Date()),
            },
          });
        }
      }

      console.log(`Created ${creatorUsers.length} creator users`);

      // Step 7: Create products for each seller
      console.log('Creating products...');
      
      // Beauty products for BeautyGlow
      const beautyProducts = [
        {
          name: 'Glow Serum',
          description: 'Brightening vitamin C serum for radiant skin',
          brand: 'BeautyGlow',
          category: PRODUCT_CATEGORIES.BEAUTY,
          variants: [
            { name: '30ml', price: 89.90, compareAtPrice: 99.90 },
            { name: '50ml', price: 129.90, compareAtPrice: 149.90 },
          ],
        },
        {
          name: 'Hydra Moisturizer',
          description: 'Deep hydration for all skin types',
          brand: 'BeautyGlow',
          category: PRODUCT_CATEGORIES.BEAUTY,
          variants: [
            { name: '50ml', price: 79.90, compareAtPrice: 89.90 },
            { name: '100ml', price: 139.90, compareAtPrice: 159.90 },
          ],
        },
        {
          name: 'Gentle Cleanser',
          description: 'pH-balanced face wash for sensitive skin',
          brand: 'BeautyGlow',
          category: PRODUCT_CATEGORIES.BEAUTY,
          variants: [
            { name: '150ml', price: 59.90, compareAtPrice: 69.90 },
            { name: '250ml', price: 89.90, compareAtPrice: 99.90 },
          ],
        },
      ];

      // Fashion products for FashionVibe
      const fashionProducts = [
        {
          name: 'Batik Shirt',
          description: 'Modern batik pattern shirt for casual and formal occasions',
          brand: 'FashionVibe',
          category: PRODUCT_CATEGORIES.FASHION,
          variants: [
            { name: 'S / Blue', price: 299000, options: { size: 'S', color: 'Blue' } },
            { name: 'M / Blue', price: 299000, options: { size: 'M', color: 'Blue' } },
            { name: 'L / Blue', price: 299000, options: { size: 'L', color: 'Blue' } },
            { name: 'S / Green', price: 299000, options: { size: 'S', color: 'Green' } },
            { name: 'M / Green', price: 299000, options: { size: 'M', color: 'Green' } },
            { name: 'L / Green', price: 299000, options: { size: 'L', color: 'Green' } },
          ],
        },
        {
          name: 'Casual Jeans',
          description: 'Comfortable slim-fit jeans for everyday wear',
          brand: 'FashionVibe',
          category: PRODUCT_CATEGORIES.FASHION,
          variants: [
            { name: '28 / Blue', price: 349000, options: { size: '28', color: 'Blue' } },
            { name: '30 / Blue', price: 349000, options: { size: '30', color: 'Blue' } },
            { name: '32 / Blue', price: 349000, options: { size: '32', color: 'Blue' } },
            { name: '34 / Blue', price: 349000, options: { size: '34', color: 'Blue' } },
            { name: '28 / Black', price: 349000, options: { size: '28', color: 'Black' } },
            { name: '30 / Black', price: 349000, options: { size: '30', color: 'Black' } },
            { name: '32 / Black', price: 349000, options: { size: '32', color: 'Black' } },
            { name: '34 / Black', price: 349000, options: { size: '34', color: 'Black' } },
          ],
        },
      ];

      // Electronics products for GadgetHub
      const electronicsProducts = [
        {
          name: 'Wireless Earbuds',
          description: 'True wireless earbuds with noise cancellation',
          brand: 'GadgetHub',
          category: PRODUCT_CATEGORIES.ELECTRONICS,
          variants: [
            { name: 'Black', price: 2999, compareAtPrice: 3499, options: { color: 'Black' } },
            { name: 'White', price: 2999, compareAtPrice: 3499, options: { color: 'White' } },
          ],
        },
        {
          name: 'Smart Watch',
          description: 'Fitness and health tracking smartwatch',
          brand: 'GadgetHub',
          category: PRODUCT_CATEGORIES.ELECTRONICS,
          variants: [
            { name: '40mm / Black', price: 5999, compareAtPrice: 6999, options: { size: '40mm', color: 'Black' } },
            { name: '44mm / Black', price: 6499, compareAtPrice: 7499, options: { size: '44mm', color: 'Black' } },
            { name: '40mm / Silver', price: 5999, compareAtPrice: 6999, options: { size: '40mm', color: 'Silver' } },
            { name: '44mm / Silver', price: 6499, compareAtPrice: 7499, options: { size: '44mm', color: 'Silver' } },
          ],
        },
      ];

      // Health products for WellnessWorld
      const healthProducts = [
        {
          name: 'Protein Powder',
          description: 'Plant-based protein powder for fitness enthusiasts',
          brand: 'WellnessWorld',
          category: PRODUCT_CATEGORIES.HEALTH,
          variants: [
            { name: 'Chocolate / 500g', price: 890, compareAtPrice: 990, options: { flavor: 'Chocolate', size: '500g' } },
            { name: 'Vanilla / 500g', price: 890, compareAtPrice: 990, options: { flavor: 'Vanilla', size: '500g' } },
            { name: 'Chocolate / 1kg', price: 1590, compareAtPrice: 1790, options: { flavor: 'Chocolate', size: '1kg' } },
            { name: 'Vanilla / 1kg', price: 1590, compareAtPrice: 1790, options: { flavor: 'Vanilla', size: '1kg' } },
          ],
        },
        {
          name: 'Yoga Mat',
          description: 'Eco-friendly non-slip yoga mat',
          brand: 'WellnessWorld',
          category: PRODUCT_CATEGORIES.HEALTH,
          variants: [
            { name: 'Purple / 4mm', price: 790, compareAtPrice: 890, options: { color: 'Purple', thickness: '4mm' } },
            { name: 'Blue / 4mm', price: 790, compareAtPrice: 890, options: { color: 'Blue', thickness: '4mm' } },
            { name: 'Purple / 6mm', price: 990, compareAtPrice: 1090, options: { color: 'Purple', thickness: '6mm' } },
            { name: 'Blue / 6mm', price: 990, compareAtPrice: 1090, options: { color: 'Blue', thickness: '6mm' } },
          ],
        },
      ];

      // Home products for HomeLuxe
      const homeProducts = [
        {
          name: 'Scented Candle Set',
          description: 'Set of 3 premium scented candles',
          brand: 'HomeLuxe',
          category: PRODUCT_CATEGORIES.HOME,
          variants: [
            { name: 'Relaxing Spa', price: 39.90, compareAtPrice: 49.90 },
            { name: 'Tropical Paradise', price: 39.90, compareAtPrice: 49.90 },
            { name: 'Festive Collection', price: 44.90, compareAtPrice: 54.90 },
          ],
        },
        {
          name: 'Bamboo Bedding Set',
          description: 'Luxurious bamboo fiber bedding set',
          brand: 'HomeLuxe',
          category: PRODUCT_CATEGORIES.HOME,
          variants: [
            { name: 'Queen / White', price: 129.90, compareAtPrice: 149.90, options: { size: 'Queen', color: 'White' } },
            { name: 'King / White', price: 149.90, compareAtPrice: 169.90, options: { size: 'King', color: 'White' } },
            { name: 'Queen / Grey', price: 129.90, compareAtPrice: 149.90, options: { size: 'Queen', color: 'Grey' } },
            { name: 'King / Grey', price: 149.90, compareAtPrice: 169.90, options: { size: 'King', color: 'Grey' } },
          ],
        },
      ];

      // Map products to organizations
      const productsByOrg = [
        { org: sellerOrganizations[0], products: beautyProducts, currency: CURRENCIES.MYR },
        { org: sellerOrganizations[1], products: fashionProducts, currency: CURRENCIES.IDR },
        { org: sellerOrganizations[2], products: electronicsProducts, currency: CURRENCIES.PHP },
        { org: sellerOrganizations[3], products: healthProducts, currency: CURRENCIES.THB },
        { org: sellerOrganizations[4], products: homeProducts, currency: CURRENCIES.USD },
      ];

      const allProducts = [];

      // Create products for each organization
      for (const { org, products, currency } of productsByOrg) {
        const storeConnection = storeConnections.find(sc => sc.organizationId === org.id);
        
        for (const productData of products) {
          // Create product
          const product = await tx.product.create({
            data: {
              organizationId: org.id,
              storeConnectionId: storeConnection.id,
              externalId: `prod_${nanoid(10)}`,
              name: productData.name,
              description: productData.description,
              brand: productData.brand,
              category: productData.category,
              images: [
                `https://colink-commerce-assets.s3.amazonaws.com/products/${org.slug}_${productData.name.toLowerCase().replace(/\s+/g, '_')}_1.jpg`,
                `https://colink-commerce-assets.s3.amazonaws.com/products/${org.slug}_${productData.name.toLowerCase().replace(/\s+/g, '_')}_2.jpg`,
              ],
              url: `https://${storeConnection.platform.toLowerCase()}.com/shop/${org.slug}/products/${productData.name.toLowerCase().replace(/\s+/g, '-')}`,
              isActive: true,
              metadata: {
                rating: randomDecimal(4, 5, 1),
                reviewCount: randomInt(10, 500),
                isPromoted: Math.random() > 0.7,
              },
            },
          });
          
          allProducts.push(product);

          // Create SKUs for each variant
          for (let i = 0; i < productData.variants.length; i++) {
            const variant = productData.variants[i];
            const sku = await tx.sKU.create({
              data: {
                productId: product.id,
                externalId: `sku_${nanoid(10)}`,
                sku: `${product.externalId.substring(5, 10)}-${i + 1}`,
                barcode: `${randomInt(100000000000, 999999999999)}`,
                name: variant.name,
                options: variant.options || {},
                price: new Prisma.Decimal(variant.price),
                compareAtPrice: variant.compareAtPrice ? new Prisma.Decimal(variant.compareAtPrice) : null,
                currency,
                weight: new Prisma.Decimal(randomDecimal(0.1, 2, 2)),
                weightUnit: 'kg',
                dimensions: {
                  length: randomInt(5, 30),
                  width: randomInt(5, 30),
                  height: randomInt(2, 15),
                  unit: 'cm',
                },
                isActive: true,
              },
            });

            // Create inventory snapshot
            await tx.inventorySnapshot.create({
              data: {
                storeConnectionId: storeConnection.id,
                productId: product.id,
                skuId: sku.id,
                quantity: randomInt(10, 100),
                reservedQuantity: 0,
                snapshotDate: new Date(),
              },
            });

            // Create product-specific commission rule for some products
            if (i === 0 && Math.random() > 0.7) {
              await tx.commissionRule.create({
                data: {
                  organizationId: org.id,
                  name: `${productData.name} Special Commission`,
                  description: `Special commission rate for ${productData.name}`,
                  type: 'PRODUCT',
                  productId: product.id,
                  creatorPercent: new Prisma.Decimal(randomDecimal(12, 18, 2)), // 12-18%
                  platformFeePercent: new Prisma.Decimal(5), // 5%
                  currency,
                  isActive: true,
                },
              });
            }

            // Create SKU-specific commission rule for some variants
            if (Math.random() > 0.8) {
              await tx.commissionRule.create({
                data: {
                  organizationId: org.id,
                  name: `${variant.name} Special Commission`,
                  description: `Special commission rate for ${productData.name} - ${variant.name}`,
                  type: 'SKU',
                  skuId: sku.id,
                  creatorPercent: new Prisma.Decimal(randomDecimal(15, 20, 2)), // 15-20%
                  platformFeePercent: new Prisma.Decimal(5), // 5%
                  currency,
                  isActive: true,
                },
              });
            }
          }
        }
      }

      console.log(`Created products and SKUs for all sellers`);

      // Step 8: Create campaigns for creators
      console.log('Creating campaigns...');
      
      const campaigns = [];
      
      for (let i = 0; i < creatorUsers.length; i++) {
        const creator = creatorUsers[i];
        const creatorProfile = await tx.creatorProfile.findUnique({
          where: { userId: creator.id },
        });
        
        // Select a random organization for this campaign
        const orgIndex = i % sellerOrganizations.length;
        const organization = sellerOrganizations[orgIndex];
        
        // Create 1-2 campaigns per creator
        const campaignCount = Math.random() > 0.5 ? 2 : 1;
        
        for (let j = 0; j < campaignCount; j++) {
          const campaignName = j === 0 
            ? `${creatorProfile.displayName}'s Favorites`
            : `${creatorProfile.displayName}'s ${['Summer', 'Holiday', 'Special', 'Must-Have'][randomInt(0, 3)]} Picks`;
          
          const campaign = await tx.campaign.create({
            data: {
              organizationId: organization.id,
              creatorId: creator.id,
              name: campaignName,
              slug: campaignName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, ''),
              description: `Handpicked products recommended by ${creatorProfile.displayName}`,
              isActive: true,
              isPublished: true,
              publishedAt: randomDate(new Date(2023, 0, 1), new Date()),
              vanityUrl: `/c/${creatorProfile.displayName.toLowerCase()}/${campaignName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`,
              layout: randomItem(['DEFAULT', 'GRID', 'LIST', 'CAROUSEL']),
              theme: randomItem(['DEFAULT', 'LIGHT', 'DARK']),
              clickAttributionWindow: 7, // 7 days
              viewAttributionWindow: 1, // 1 day
              attributionModel: 'LAST_TOUCH',
              metadata: {
                featuredImage: `https://colink-commerce-assets.s3.amazonaws.com/campaigns/${creatorProfile.displayName.toLowerCase()}_${j + 1}.jpg`,
                socialPlatforms: ['instagram', 'tiktok'],
              },
            },
          });
          
          campaigns.push(campaign);
          
          // Create campaign-specific commission rule
          await tx.commissionRule.create({
            data: {
              organizationId: organization.id,
              name: `${campaignName} Commission`,
              description: `Special commission rate for ${campaignName} campaign`,
              type: 'CAMPAIGN',
              campaignId: campaign.id,
              creatorPercent: new Prisma.Decimal(randomDecimal(12, 20, 2)), // 12-20%
              platformFeePercent: new Prisma.Decimal(5), // 5%
              currency: organization.currency,
              isActive: true,
            },
          });
          
          // Add 3-5 products to the campaign
          const orgProducts = allProducts.filter(p => p.organizationId === organization.id);
          const selectedProducts = randomItems(orgProducts, randomInt(3, Math.min(5, orgProducts.length)));
          
          for (let k = 0; k < selectedProducts.length; k++) {
            const product = selectedProducts[k];
            
            await tx.campaignProduct.create({
              data: {
                campaignId: campaign.id,
                productId: product.id,
                displayOrder: k,
                isActive: true,
                customTitle: Math.random() > 0.7 ? `${creatorProfile.displayName}'s Pick: ${product.name}` : null,
                customDescription: Math.random() > 0.7 ? `I absolutely love this ${product.name}! It's perfect for everyday use.` : null,
              },
            });
          }
          
          // Create tracking links
          const shortCode = nanoid(8);
          await tx.trackingLink.create({
            data: {
              organizationId: organization.id,
              campaignId: campaign.id,
              shortCode,
              url: `${process.env.PUBLIC_BASE_URL || 'https://colink.commerce'}/c/${creatorProfile.displayName.toLowerCase()}/${campaignName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '')}`,
              utmSource: creatorProfile.displayName.toLowerCase(),
              utmMedium: 'social',
              utmCampaign: campaignName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, ''),
              utmContent: 'link',
              qrCodeUrl: `https://colink-commerce-assets.s3.amazonaws.com/qrcodes/${shortCode}.png`,
              isActive: true,
            },
          });
          
          // Create some click and view events
          const clickCount = randomInt(50, 500);
          const viewCount = randomInt(100, 1000);
          
          for (let click = 0; click < clickCount; click++) {
            await tx.clickEvent.create({
              data: {
                trackingLinkId: (await tx.trackingLink.findFirst({ 
                  where: { campaignId: campaign.id } 
                })).id,
                campaignId: campaign.id,
                ip: encryptData(`192.168.${randomInt(1, 255)}.${randomInt(1, 255)}`),
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                referrer: randomItem([
                  'https://instagram.com',
                  'https://tiktok.com',
                  'https://facebook.com',
                  null
                ]),
                device: 'mobile',
                browser: 'safari',
                os: 'ios',
                country: Object.values(SEA_COUNTRIES)[randomInt(0, 4)],
                createdAt: randomDate(new Date(2023, 0, 1), new Date()),
              },
            });
          }
          
          for (let view = 0; view < viewCount; view++) {
            await tx.viewEvent.create({
              data: {
                trackingLinkId: (await tx.trackingLink.findFirst({ 
                  where: { campaignId: campaign.id } 
                })).id,
                campaignId: campaign.id,
                ip: encryptData(`192.168.${randomInt(1, 255)}.${randomInt(1, 255)}`),
                userAgent: randomItem([
                  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                ]),
                referrer: randomItem([
                  'https://instagram.com',
                  'https://tiktok.com',
                  'https://facebook.com',
                  null
                ]),
                device: randomItem(['mobile', 'desktop', 'tablet']),
                browser: randomItem(['safari', 'chrome', 'firefox']),
                os: randomItem(['ios', 'macos', 'windows', 'android']),
                country: Object.values(SEA_COUNTRIES)[randomInt(0, 4)],
                duration: randomInt(10, 300), // 10 seconds to 5 minutes
                createdAt: randomDate(new Date(2023, 0, 1), new Date()),
              },
            });
          }
        }
      }

      console.log(`Created ${campaigns.length} campaigns with tracking links and events`);

      // Step 9: Create sample orders and ledger entries
      console.log('Creating sample orders and ledger entries...');
      
      // Create 10-20 orders across different organizations
      const orderCount = randomInt(10, 20);
      
      for (let i = 0; i < orderCount; i++) {
        // Pick a random organization and its store connection
        const orgIndex = randomInt(0, sellerOrganizations.length - 1);
        const organization = sellerOrganizations[orgIndex];
        const storeConnection = storeConnections.find(sc => sc.organizationId === organization.id);
        
        // Create order
        const order = await tx.order.create({
          data: {
            organizationId: organization.id,
            storeConnectionId: storeConnection.id,
            externalId: `order_${nanoid(10)}`,
            externalCreatedAt: randomDate(new Date(2023, 0, 1), new Date()),
            customerEmail: `customer${i}@example.com`,
            customerName: `Customer ${i}`,
            customerPhone: `+6012${randomInt(1000000, 9999999)}`,
            currency: organization.currency,
            subtotal: new Prisma.Decimal(0), // Will be updated after adding items
            shipping: new Prisma.Decimal(randomDecimal(5, 15, 2)),
            tax: new Prisma.Decimal(0), // Will be updated after adding items
            discount: new Prisma.Decimal(0),
            total: new Prisma.Decimal(0), // Will be updated after adding items
            status: randomItem(['PENDING', 'PAID', 'FULFILLED']),
            paymentMethod: randomItem(['CREDIT_CARD', 'BANK_TRANSFER', 'E_WALLET']),
            shippingAddress: {
              name: `Customer ${i}`,
              address1: `${randomInt(1, 100)} Main Street`,
              address2: randomItem(['Apt 4B', 'Suite 300', null]),
              city: organization.country === SEA_COUNTRIES.MY ? 'Kuala Lumpur' :
                    organization.country === SEA_COUNTRIES.ID ? 'Jakarta' :
                    organization.country === SEA_COUNTRIES.PH ? 'Manila' :
                    organization.country === SEA_COUNTRIES.TH ? 'Bangkok' : 'Singapore',
              state: organization.country === SEA_COUNTRIES.MY ? 'Kuala Lumpur' :
                     organization.country === SEA_COUNTRIES.ID ? 'Jakarta' :
                     organization.country === SEA_COUNTRIES.PH ? 'Metro Manila' :
                     organization.country === SEA_COUNTRIES.TH ? 'Bangkok' : 'Singapore',
              postalCode: randomInt(10000, 99999).toString(),
              country: organization.country,
              phone: `+6012${randomInt(1000000, 9999999)}`,
            },
            billingAddress: {
              name: `Customer ${i}`,
              address1: `${randomInt(1, 100)} Main Street`,
              address2: randomItem(['Apt 4B', 'Suite 300', null]),
              city: organization.country === SEA_COUNTRIES.MY ? 'Kuala Lumpur' :
                    organization.country === SEA_COUNTRIES.ID ? 'Jakarta' :
                    organization.country === SEA_COUNTRIES.PH ? 'Manila' :
                    organization.country === SEA_COUNTRIES.TH ? 'Bangkok' : 'Singapore',
              state: organization.country === SEA_COUNTRIES.MY ? 'Kuala Lumpur' :
                     organization.country === SEA_COUNTRIES.ID ? 'Jakarta' :
                     organization.country === SEA_COUNTRIES.PH ? 'Metro Manila' :
                     organization.country === SEA_COUNTRIES.TH ? 'Bangkok' : 'Singapore',
              postalCode: randomInt(10000, 99999).toString(),
              country: organization.country,
              phone: `+6012${randomInt(1000000, 9999999)}`,
            },
          },
        });
        
        // Get products for this organization
        const orgProducts = allProducts.filter(p => p.organizationId === organization.id);
        
        // Add 1-3 items to the order
        const itemCount = randomInt(1, 3);
        let orderSubtotal = new Prisma.Decimal(0);
        
        for (let j = 0; j < itemCount; j++) {
          // Pick a random product
          const product = randomItem(orgProducts);
          
          // Get SKUs for this product
          const skus = await tx.sKU.findMany({
            where: { productId: product.id },
          });
          
          // Pick a random SKU
          const sku = randomItem(skus);
          
          // Random quantity between 1 and 3
          const quantity = randomInt(1, 3);
          
          // Calculate item subtotal and total
          const subtotal = new Prisma.Decimal(sku.price).mul(quantity);
          const itemTotal = subtotal; // No discounts in this example
          
          // Add to order subtotal
          orderSubtotal = orderSubtotal.add(subtotal);
          
          // Create order item
          const orderItem = await tx.orderItem.create({
            data: {
              orderId: order.id,
              skuId: sku.id,
              externalId: `item_${nanoid(10)}`,
              name: `${product.name} - ${sku.name}`,
              quantity,
              unitPrice: sku.price,
              subtotal,
              discount: new Prisma.Decimal(0),
              tax: new Prisma.Decimal(subtotal).mul(0.1), // 10% tax
              total: itemTotal,
            },
          });
          
          // Find a campaign that includes this product
          const campaignProduct = await tx.campaignProduct.findFirst({
            where: {
              productId: product.id,
              campaign: {
                organizationId: organization.id,
                isActive: true,
                isPublished: true,
              },
            },
            include: {
              campaign: {
                include: {
                  creator: true,
                },
              },
            },
          });
          
          // If there's a campaign, create conversion event and ledger entries
          if (campaignProduct) {
            const campaign = campaignProduct.campaign;
            
            // Create conversion event
            await tx.conversionEvent.create({
              data: {
                campaignId: campaign.id,
                orderId: order.id,
                orderItemId: orderItem.id,
                conversionType: 'PURCHASE',
                attributionSource: randomItem(['CLICK', 'VIEW']),
                attributionModel: campaign.attributionModel,
                metadata: {
                  convertedAt: order.externalCreatedAt.toISOString(),
                },
              },
            });
            
            // Find applicable commission rule
            const commissionRule = await tx.commissionRule.findFirst({
              where: {
                organizationId: organization.id,
                campaignId: campaign.id,
                isActive: true,
              },
            }) || await tx.commissionRule.findFirst({
              where: {
                organizationId: organization.id,
                type: 'DEFAULT',
                isActive: true,
              },
            });
            
            if (commissionRule) {
              // Calculate commissions
              const platformFee = new Prisma.Decimal(subtotal)
                .mul(commissionRule.platformFeePercent)
                .div(100);
              
              const creatorCommission = new Prisma.Decimal(subtotal)
                .mul(commissionRule.creatorPercent)
                .div(100);
              
              const paymentFee = new Prisma.Decimal(subtotal)
                .mul(0.029); // 2.9% payment processing fee
              
              const sellerTake = new Prisma.Decimal(subtotal)
                .minus(platformFee)
                .minus(creatorCommission)
                .minus(paymentFee);
              
              // Create ledger entries
              
              // 1. Sale entry
              await tx.ledgerEntry.create({
                data: {
                  organizationId: organization.id,
                  orderId: order.id,
                  orderItemId: orderItem.id,
                  entryType: 'SALE',
                  amount: subtotal,
                  currency: organization.currency,
                  description: `Sale revenue for order ${order.externalId}, item ${orderItem.name}`,
                  status: order.status === 'PAID' ? 'CLEARED' : 'RESERVED',
                  clearedAt: order.status === 'PAID' ? order.externalCreatedAt : null,
                  metadata: {
                    calculationId: `calc_${nanoid(10)}`,
                    appliedRuleId: commissionRule.id,
                    appliedRuleType: commissionRule.type,
                  },
                },
              });
              
              // 2. Platform fee entry
              await tx.ledgerEntry.create({
                data: {
                  organizationId: organization.id,
                  orderId: order.id,
                  orderItemId: orderItem.id,
                  entryType: 'PLATFORM_FEE',
                  amount: platformFee,
                  currency: organization.currency,
                  description: `Platform fee for order ${order.externalId}, item ${orderItem.name}`,
                  status: order.status === 'PAID' ? 'CLEARED' : 'RESERVED',
                  clearedAt: order.status === 'PAID' ? order.externalCreatedAt : null,
                  metadata: {
                    calculationId: `calc_${nanoid(10)}`,
                    appliedRuleId: commissionRule.id,
                    appliedRuleType: commissionRule.type,
                  },
                },
              });
              
              // 3. Creator commission entry
              await tx.ledgerEntry.create({
                data: {
                  organizationId: organization.id,
                  orderId: order.id,
                  orderItemId: orderItem.id,
                  entryType: 'COMMISSION',
                  amount: creatorCommission,
                  currency: organization.currency,
                  description: `Creator commission for order ${order.externalId}, item ${orderItem.name}`,
                  status: order.status === 'PAID' ? 'CLEARED' : 'RESERVED',
                  clearedAt: order.status === 'PAID' ? order.externalCreatedAt : null,
                  metadata: {
                    calculationId: `calc_${nanoid(10)}`,
                    appliedRuleId: commissionRule.id,
                    appliedRuleType: commissionRule.type,
                    creatorId: campaign.creatorId,
                  },
                },
              });
              
              // 4. Payment fee entry
              await tx.ledgerEntry.create({
                data: {
                  organizationId: organization.id,
                  orderId: order.id,
                  orderItemId: orderItem.id,
                  entryType: 'PAYMENT_FEE',
                  amount: paymentFee,
                  currency: organization.currency,
                  description: `Payment processing fee for order ${order.externalId}, item ${orderItem.name}`,
                  status: order.status === 'PAID' ? 'CLEARED' : 'RESERVED',
                  clearedAt: order.status === 'PAID' ? order.externalCreatedAt : null,
                  metadata: {
                    calculationId: `calc_${nanoid(10)}`,
                    appliedRuleId: commissionRule.id,
                    appliedRuleType: commissionRule.type,
                  },
                },
              });
            }
          }
        }
        
        // Calculate tax
        const orderTax = new Prisma.Decimal(orderSubtotal).mul(0.1); // 10% tax
        
        // Calculate total
        const orderTotal = new Prisma.Decimal(orderSubtotal)
          .add(order.shipping)
          .add(orderTax)
          .minus(order.discount);
        
        // Update order with correct totals
        await tx.order.update({
          where: { id: order.id },
          data: {
            subtotal: orderSubtotal,
            tax: orderTax,
            total: orderTotal,
          },
        });
        
        // Create payment intent for the order
        await tx.paymentIntent.create({
          data: {
            organizationId: organization.id,
            orderId: order.id,
            provider: randomItem(['STRIPE', 'XENDIT', 'DUITNOW']),
            externalId: `pi_${nanoid(24)}`,
            amount: orderTotal,
            currency: organization.currency,
            status: order.status === 'PENDING' ? 'PENDING' : 'SUCCEEDED',
            paymentMethod: order.paymentMethod,
            paymentFee: new Prisma.Decimal(orderTotal).mul(0.029), // 2.9% payment fee
            metadata: {
              paymentProcessor: randomItem(['stripe', 'xendit', 'duitnow']),
              paymentType: randomItem(['credit_card', 'bank_transfer', 'e_wallet']),
            },
          },
        });
      }

      console.log(`Created ${orderCount} orders with items and ledger entries`);

      // Step 10: Create payouts for some creators
      console.log('Creating payouts for creators...');
      
      // Process payouts for a few creators
      const payoutCreators = creatorUsers.slice(0, 3); // First 3 creators
      
      for (const creator of payoutCreators) {
        // Find cleared commission entries for this creator
        const commissionEntries = await tx.ledgerEntry.findMany({
          where: {
            entryType: 'COMMISSION',
            status: 'CLEARED',
            metadata: {
              path: ['creatorId'],
              equals: creator.id,
            },
          },
        });
        
        if (commissionEntries.length > 0) {
          // Group by currency
          const entriesByCurrency = commissionEntries.reduce((acc, entry) => {
            if (!acc[entry.currency]) {
              acc[entry.currency] = [];
            }
            acc[entry.currency].push(entry);
            return acc;
          }, {} as Record<string, typeof commissionEntries>);
          
          // Process each currency group
          for (const [currency, entries] of Object.entries(entriesByCurrency)) {
            // Calculate total amount
            const totalAmount = entries.reduce(
              (sum, entry) => sum.add(entry.amount),
              new Prisma.Decimal(0)
            );
            
            // Create payout
            const payout = await tx.payout.create({
              data: {
                organizationId: entries[0].organizationId,
                recipient: creator.id,
                recipientType: 'USER',
                provider: randomItem(['STRIPE', 'XENDIT', 'BANK_TRANSFER']),
                externalId: `po_${nanoid(24)}`,
                amount: totalAmount,
                fee: new Prisma.Decimal(totalAmount).mul(0.01), // 1% payout fee
                currency,
                status: randomItem(['SUCCEEDED', 'PROCESSING']),
                description: `Payout to ${creator.name} for commissions earned`,
                bankName: 'Creator Bank',
                bankAccountNumber: encryptData(`9876543210`),
                bankAccountName: creator.name,
                bankSwiftCode: 'CRTBNK12',
                reference: `REF${nanoid(8)}`,
                scheduledDate: new Date(),
                processedDate: new Date(),
                metadata: {
                  entryCount: entries.length,
                  periodStart: entries[0].createdAt.toISOString(),
                  periodEnd: entries[entries.length - 1].createdAt.toISOString(),
                },
              },
            });
            
            // Update ledger entries to link to this payout
            for (const entry of entries) {
              await tx.ledgerEntry.update({
                where: { id: entry.id },
                data: {
                  payoutId: payout.id,
                  status: payout.status === 'SUCCEEDED' ? 'PAID' : 'CLEARED',
                  paidAt: payout.status === 'SUCCEEDED' ? payout.processedDate : null,
                },
              });
            }
          }
        }
      }

      console.log('Created payouts for creators');

      // Step 11: Create leaderboard entries
      console.log('Creating leaderboard entries...');
      
      // Create leaderboard entries for all creators
      const periods = ['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'];
      
      for (const period of periods) {
        // Get all creators
        const creators = await tx.user.findMany({
          where: {
            creatorProfile: {
              isNot: null,
            },
          },
          include: {
            creatorProfile: true,
          },
        });
        
        // Generate random sales data for each creator
        const leaderboardData = creators.map(creator => ({
          creator,
          salesAmount: randomDecimal(1000, 50000, 2),
          ordersCount: randomInt(10, 200),
          commissionAmount: randomDecimal(100, 5000, 2),
          conversionRate: randomDecimal(1, 10, 2),
        }));
        
        // Sort by sales amount to determine rank
        leaderboardData.sort((a, b) => 
          b.salesAmount.greaterThan(a.salesAmount) ? 1 : -1
        );
        
        // Create leaderboard entries
        for (let i = 0; i < leaderboardData.length; i++) {
          const data = leaderboardData[i];
          
          let startDate, endDate;
          const now = new Date();
          
          if (period === 'DAILY') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          } else if (period === 'WEEKLY') {
            const day = now.getDay();
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - day), 23, 59, 59);
          } else if (period === 'MONTHLY') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          } else {
            // ALL_TIME - no dates needed
            startDate = null;
            endDate = null;
          }
          
          await tx.leaderboardEntry.create({
            data: {
              userId: data.creator.id,
              period,
              startDate,
              endDate,
              salesAmount: data.salesAmount,
              ordersCount: data.ordersCount,
              commissionAmount: data.commissionAmount,
              conversionRate: data.conversionRate,
              rank: i + 1,
              metadata: {
                displayName: data.creator.creatorProfile.displayName,
                profileImage: data.creator.creatorProfile.profileImage,
              },
            },
          });
        }
      }

      console.log(`Created leaderboard entries for all periods`);

      // Step 12: Create notifications for users
      console.log('Creating notifications for users...');
      
      // Create some notifications for all users
      const allUsers = [...sellerUsers, ...creatorUsers];
      
      for (const user of allUsers) {
        // Create 2-5 notifications per user
        const notificationCount = randomInt(2, 5);
        
        for (let i = 0; i < notificationCount; i++) {
          const notificationType = randomItem(['INFO', 'SUCCESS', 'WARNING', 'ERROR']);
          let title, message;
          
          if (notificationType === 'INFO') {
            title = randomItem([
              'Welcome to CoLink Commerce',
              'New Feature Available',
              'Platform Update',
              'Tips & Tricks',
            ]);
            message = randomItem([
              'Welcome to CoLink Commerce! Get started by exploring your dashboard.',
              'We\'ve added new analytics features. Check them out!',
              'The platform has been updated with performance improvements.',
              'Did you know you can customize your campaign pages? Try it now!',
            ]);
          } else if (notificationType === 'SUCCESS') {
            title = randomItem([
              'Campaign Published',
              'Sale Completed',
              'Payout Processed',
              'New Badge Earned',
            ]);
            message = randomItem([
              'Your campaign has been successfully published!',
              'Congratulations! You\'ve made a sale.',
              'Your payout has been processed and will arrive in 1-3 business days.',
              'You\'ve earned a new badge! Check your profile.',
            ]);
          } else if (notificationType === 'WARNING') {
            title = randomItem([
              'Campaign Expiring Soon',
              'Low Inventory Alert',
              'Verification Required',
              'Payment Method Expiring',
            ]);
            message = randomItem([
              'Your campaign will expire in 3 days. Consider extending it.',
              'Some products in your campaigns have low inventory.',
              'Please verify your account to continue receiving payouts.',
              'Your payment method will expire soon. Please update it.',
            ]);
          } else {
            title = randomItem([
              'Campaign Error',
              'Payment Failed',
              'API Connection Issue',
              'Account Security Alert',
            ]);
            message = randomItem([
              'There was an error publishing your campaign. Please try again.',
              'A payment has failed. Please check your payment method.',
              'We\'re having trouble connecting to your store. Please reconnect.',
              'Unusual activity detected on your account. Please verify it\'s you.',
            ]);
          }
          
          await tx.notification.create({
            data: {
              userId: user.id,
              type: notificationType,
              title,
              message,
              isRead: Math.random() > 0.7,
              readAt: Math.random() > 0.7 ? randomDate(new Date(2023, 0, 1), new Date()) : null,
              link: Math.random() > 0.5 ? '/dashboard' : null,
              createdAt: randomDate(new Date(2023, 0, 1), new Date()),
            },
          });
        }
      }

      console.log(`Created notifications for all users`);

      // Step 13: Create webhook subscriptions
      console.log('Creating webhook subscriptions...');
      
      // Create webhook subscriptions for organizations
      for (const org of sellerOrganizations) {
        await tx.webhookSubscription.create({
          data: {
            organizationId: org.id,
            name: 'Order Notifications',
            url: `https://webhook.site/${nanoid(32)}`,
            secret: encryptData(nanoid(32)),
            events: ['order.created', 'order.updated', 'order.fulfilled'],
            isActive: true,
            lastTriggeredAt: randomDate(new Date(2023, 0, 1), new Date()),
            failureCount: 0,
            metadata: {
              version: '1.0',
              format: 'json',
            },
          },
        });
      }

      console.log(`Created webhook subscriptions for organizations`);

      // Step 14: Create audit logs
      console.log('Creating audit logs...');
      
      // Create some audit logs for user actions
      const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PUBLISH', 'PAYOUT'];
      const entityTypes = ['User', 'Product', 'Campaign', 'Order', 'Payout'];
      
      for (let i = 0; i < 50; i++) {
        const user = randomItem(allUsers);
        const action = randomItem(actions);
        const entityType = randomItem(entityTypes);
        
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action,
            entityType,
            entityId: nanoid(10),
            description: `User ${action.toLowerCase()}d a ${entityType.toLowerCase()}`,
            ipAddress: encryptData(`192.168.${randomInt(1, 255)}.${randomInt(1, 255)}`),
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
            createdAt: randomDate(new Date(2023, 0, 1), new Date()),
          },
        });
      }

      console.log(`Created audit logs for user actions`);
    });

    console.log('🌱 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the main function
main()
  .catch((e) => {
    console.error('❌ Fatal error during seeding:', e);
    process.exit(1);
  });
