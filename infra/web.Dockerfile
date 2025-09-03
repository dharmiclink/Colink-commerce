# CoLink Commerce Web Dockerfile
# Multi-stage build for optimized production image

# ===== BUILD STAGE =====
FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.6.10 --activate

# Set working directory
WORKDIR /app

# Copy package files for better layer caching
COPY package.json pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application with standalone output
# This creates a standalone build that doesn't require node_modules
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @colink-commerce/web build

# ===== PRODUCTION STAGE =====
FROM node:18-alpine AS production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Copy standalone build and required files
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Create a non-root user and switch to it
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextuser -u 1001 -G nodejs && \
    chown -R nextuser:nodejs /app

USER nextuser

# Expose the port
EXPOSE 3000

# Set the health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start the application
CMD ["node", "apps/web/server.js"]
