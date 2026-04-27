# =============================================================================
# axionax Web - Production Dockerfile
# =============================================================================
# Multi-stage build for Next.js standalone deployment with pnpm monorepo
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base - Common Node.js setup with pnpm
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

# -----------------------------------------------------------------------------
# Stage 2: Builder - Install dependencies and build
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# Copy entire monorepo (needed for pnpm workspace)
COPY . .

# Install dependencies (frozen lockfile for reproducible builds)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build the web application
RUN pnpm --filter @axionax/web build

# -----------------------------------------------------------------------------
# Stage 3: Runner - Production image
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (includes node_modules with resolved symlinks)
# Note: outputFileTracingRoot in next.config.js preserves monorepo structure
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

# Start Next.js server (path relative to monorepo root due to outputFileTracingRoot)
CMD ["node", "apps/web/server.js"]
