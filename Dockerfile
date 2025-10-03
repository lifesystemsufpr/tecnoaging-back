# Build stage
FROM node:22-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy source code and configuration files
COPY . .

# Generate Prisma client and build the application
RUN npx prisma generate
RUN npm run build

# Remove devDependencies to reduce size
RUN npm prune --omit=dev

# Production stage
FROM node:22-alpine AS production

# Create app directory with proper permissions
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy package.json for reference
COPY package*.json ./

# Copy production dependencies from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy Prisma schema and migrations (needed for production)
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copy startup script
COPY --chown=nestjs:nodejs scripts/start-production.sh ./scripts/
RUN chmod +x ./scripts/start-production.sh

# Set NODE_ENV to production
ENV NODE_ENV=production

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Add health check with the existing status endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/status || exit 1

# Use startup script that handles migrations
CMD ["./scripts/start-production.sh", "node", "dist/main.js"]
