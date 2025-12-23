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

# Ensure database directory exists
RUN mkdir -p /app/database

# Database files will be created by the application if they don't exist

EXPOSE 3000

# Use built TypeScript if available, otherwise fallback to JavaScript
CMD ["sh", "-c", "if [ -f 'dist/server.js' ]; then node dist/server.js; else node server.js; fi"]
