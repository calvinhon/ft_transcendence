FROM node:18-alpine

WORKDIR /app


# Copy shared common package tarball
COPY ./packages/common/ft-transcendence-common-1.0.0.tgz ./

# Copy package files
COPY ./auth-service/package*.json ./
COPY ./auth-service/tsconfig.json ./

# Install dependencies and common package from tarball
RUN npm install ft-transcendence-common-1.0.0.tgz && npm install

# Copy source code
COPY ./auth-service/src/ ./src/

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Create and set permissions for database directory
RUN mkdir -p /app/database && chown -R node:node /app/database

# Switch to non-root user
USER node

# Start using compiled JavaScript
CMD ["node", "dist/server.js"]
