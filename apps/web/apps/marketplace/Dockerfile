FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# Build contracts first (generates artifacts)
RUN pnpm --filter @axionax/contracts build
# Build SDK (depends on contracts artifacts)
RUN pnpm --filter @axionax/sdk build
# Build only the marketplace app
RUN pnpm --filter @axionax/marketplace build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g serve

# Copy the build output from the builder stage
COPY --from=builder /app/apps/marketplace/dist ./dist

EXPOSE 3002

ENV PORT=3002

# Serve on port 3002 (Single Page Application mode)
CMD ["serve", "-s", "dist", "-l", "3002"]
