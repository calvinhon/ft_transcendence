# user-service/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY user-service/package*.json ./
COPY user-service/tsconfig.json ./

# Install ALL dependencies (including devDependencies for TypeScript compilation)
RUN npm install

# Copy source code and shared types
COPY user-service/src/ ./src/
COPY shared/ ./shared/

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Copy database directory
COPY user-service/database/ ./database/

EXPOSE 3000

# Use built TypeScript if available, otherwise fallback to JavaScript
CMD ["sh", "-c", "if [ -f 'dist/server.js' ]; then node dist/server.js; else node server.js; fi"]
