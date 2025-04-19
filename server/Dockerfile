# Use Node.js LTS version (pin patch for reproducibility)
FROM node:23.2.0-alpine

# Metadata labels
LABEL maintainer="hector@hyrivera.com"
LABEL org.opencontainers.image.source="https://github.com/hector-hyrivera/scrum-poker"
LABEL org.opencontainers.image.version="1.1.0"
LABEL org.opencontainers.image.description="Scrum Poker server component"

# Create app directory
WORKDIR /usr/src/app

# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files as root
COPY package*.json ./

# Change ownership of app directory
RUN chown -R appuser:appgroup /usr/src/app

# Switch to non-root user
USER appuser

# Install dependencies and clean npm cache
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --spider -q http://localhost:3001/health || exit 1

# Start the server
CMD ["npm", "start"]