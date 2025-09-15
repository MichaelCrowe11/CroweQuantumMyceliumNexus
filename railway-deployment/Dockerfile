# Multi-stage Dockerfile for QuantumMycelium Nexus
FROM node:18-alpine AS base

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S quantum -u 1001

# Copy application code
COPY --chown=quantum:nodejs . .

# Create necessary directories
RUN mkdir -p /app/logs /app/temp && \
    chown quantum:nodejs /app/logs /app/temp

# Switch to non-root user
USER quantum

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

EXPOSE 3000

CMD ["npm", "start"]