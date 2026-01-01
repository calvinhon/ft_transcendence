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

# Ensure database directory exists
RUN mkdir -p /app/database

# Database files will be created by the application if they don't exist

# Install su-exec for entrypoint script
RUN apk add --no-cache su-exec

# Copy entrypoint script
COPY ./packages/common/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

# Entrypoint handles user switching
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
