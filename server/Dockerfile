# ---------- Builder Stage ----------
FROM node:23.2.0-alpine AS builder

# Metadata labels
LABEL maintainer="hector@hyrivera.com"
LABEL org.opencontainers.image.source="https://github.com/hector-hyrivera/scrum-poker"
LABEL org.opencontainers.image.version="1.1.0"
LABEL org.opencontainers.image.description="Scrum Poker server component"

# Create app directory
WORKDIR /usr/src/app

# Install dependencies as root for build
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript and Vite output
RUN npm run build

# ---------- Production Stage ----------
FROM node:23.2.0-alpine AS production

# Metadata labels
LABEL maintainer="hector@hyrivera.com"
LABEL org.opencontainers.image.source="https://github.com/hector-hyrivera/scrum-poker"
LABEL org.opencontainers.image.version="1.1.0"
LABEL org.opencontainers.image.description="Scrum Poker server component"

# Create app directory
WORKDIR /usr/src/app

# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built app from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/.env* ./

# Change ownership
RUN chown -R appuser:appgroup /usr/src/app
USER appuser

# Expose port
EXPOSE 3001

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --spider -q http://localhost:3001/health || exit 1

# Start the server
CMD ["npm", "start"]