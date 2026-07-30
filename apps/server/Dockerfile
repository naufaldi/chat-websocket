# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files while preserving workspace directory structure
COPY package.json bun.lock tsconfig.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/server/tsconfig.json apps/server/nest-cli.json apps/server/
COPY apps/server/src apps/server/src
COPY packages/db packages/db
COPY packages/shared packages/shared

# Build workspace dependencies used by the server
WORKDIR /app/packages/shared
RUN bun run build

# Build the application
WORKDIR /app/apps/server
RUN bun run build

# Production stage
FROM oven/bun:1 AS runner

WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/server/dist dist/
COPY --from=builder /app/apps/server/node_modules node_modules/
COPY --from=builder /app/packages packages/

# Set ownership
RUN chown -R bun:bun /app

# Switch to non-root user
USER bun

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health/live || exit 1

# Start the application
CMD ["bun", "run", "dist/main.js"]
