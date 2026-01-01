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
