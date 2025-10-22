FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY game-service/package*.json ./
COPY game-service/tsconfig.json ./

# Install ALL dependencies (including devDependencies for TypeScript compilation)
RUN npm install

# Copy source code and shared types
COPY game-service/src/ ./src/
COPY shared/ ./shared/

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Copy database directory
COPY game-service/database/ ./database/

EXPOSE 3000

# Start using compiled JavaScript
CMD ["node", "dist/server.js"]
