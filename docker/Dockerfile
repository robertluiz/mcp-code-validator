# Production stage with Node.js (for compatibility)
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev

# Create non-root user
RUN addgroup -g 1001 -S nodeuser && \
    adduser -S nodeuser -u 1001

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Copy library APIs
COPY src/library-apis.ts ./src/

# Set ownership
RUN chown -R nodeuser:nodeuser /app

# Switch to non-root user
USER nodeuser

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the MCP server with node
CMD ["node", "dist/server.js"]