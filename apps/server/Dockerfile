# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY apps/server/package.json apps/server/
COPY packages/*/package.json packages/*/
COPY packages/*/src packages/*/src

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY apps/server/src apps/server/src
COPY packages/*/src packages/*/src

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

# Create production user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health/live || exit 1

# Start the application
CMD ["bun", "run", "dist/main.js"]
