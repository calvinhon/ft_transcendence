FROM node:18-alpine

WORKDIR /app


# Copy shared common package tarball
COPY ./packages/common/ft-transcendence-common-1.0.0.tgz ./

# Copy service package files
COPY ./game-service/package*.json ./
COPY ./game-service/tsconfig.json ./

# Install dependencies and common package from tarball
RUN npm install ft-transcendence-common-1.0.0.tgz && npm install

# Copy source code
COPY ./game-service/src/ ./src/

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Ensure database directories exist in image layer
RUN mkdir -p /app/database /app/game-database && chown -R node:node /app/database /app/game-database || true

# Copy entrypoint to perform runtime initialization on mounts
COPY ./game-service/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/server.js"]
