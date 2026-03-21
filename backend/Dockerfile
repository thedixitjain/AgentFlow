# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user and install su-exec for entrypoint
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    apk add --no-cache su-exec

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY entrypoint.sh /entrypoint.sh

# Create data and logs directories with correct ownership
RUN mkdir -p /app/data logs && chown -R nodejs:nodejs /app/data logs && \
    chmod +x /entrypoint.sh

EXPOSE 4000

ENV NODE_ENV=production

# Run as root so entrypoint can fix permissions for persistent disks (e.g. Render /var/data)
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]
