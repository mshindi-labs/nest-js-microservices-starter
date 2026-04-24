# Multi-stage Dockerfile for NestJS application
# Stage 1: Dependencies
FROM node:24-alpine AS dependencies

WORKDIR /app

# Enable corepack for pnpm support
RUN corepack enable

# Copy package files and lockfiles
COPY package*.json ./
COPY yarn.lock* pnpm-lock.yaml* ./

# Install all dependencies based on lockfile type
RUN if [ -f yarn.lock ]; then \
      echo "📦 Installing dependencies with Yarn..." && \
      yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then \
      echo "📦 Installing dependencies with pnpm..." && \
      pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      echo "📦 Installing dependencies with npm..." && \
      npm ci; \
    else \
      echo "❌ No lockfile found. Please commit your lockfile." && exit 1; \
    fi

# Stage 2: Builder
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 3: Production
FROM node:24-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Enable corepack for pnpm support
RUN corepack enable

WORKDIR /app

# Copy package files and lockfiles
COPY package*.json ./
COPY yarn.lock* pnpm-lock.yaml* ./

# Install production dependencies based on lockfile type and clean up in one layer
RUN if [ -f yarn.lock ]; then \
      echo "📦 Installing production dependencies with Yarn..." && \
      yarn install --frozen-lockfile --production; \
    elif [ -f pnpm-lock.yaml ]; then \
      echo "📦 Installing production dependencies with pnpm..." && \
      pnpm install --frozen-lockfile --prod; \
    elif [ -f package-lock.json ]; then \
      echo "📦 Installing production dependencies with npm..." && \
      npm ci --only=production; \
    else \
      echo "❌ No lockfile found. Please commit your lockfile." && exit 1; \
    fi && \
    rm -rf /root/.npm /root/.pnpm-store /root/.yarn /tmp/* && \
    rm -f yarn.lock package-lock.json pnpm-lock.yaml

# Copy Prisma schema and config for migrations
COPY --chown=nestjs:nodejs prisma ./prisma/
COPY --from=builder --chown=nestjs:nodejs /app/prisma.config.js ./prisma.config.js

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/generated ./generated

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 9010

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:9010/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/src/main.js"]
