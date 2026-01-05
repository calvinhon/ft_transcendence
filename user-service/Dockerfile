FROM node:18-alpine

WORKDIR /app


# Copy shared common package tarball
COPY ./packages/common/ft-transcendence-common-1.0.0.tgz ./

# Copy package files
COPY ./user-service/package*.json ./
COPY ./user-service/tsconfig.json ./

# Install dependencies and common package from tarball
RUN npm install ft-transcendence-common-1.0.0.tgz && npm install

# Copy source code
COPY ./user-service/src/ ./src/

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Install su-exec so we can drop privileges at runtime
RUN apk add --no-cache su-exec

# Ensure database directories exist in image layer
RUN mkdir -p /app/database /app/user-database && chown -R node:node /app/database /app/user-database || true

# Copy entrypoint to perform runtime initialization on mounts
COPY ./user-service/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Do not switch to non-root here; entrypoint will drop privileges after init
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/server.js"]
