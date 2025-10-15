FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY auth-service/package*.json ./
COPY auth-service/tsconfig.json ./

# Install ALL dependencies (including devDependencies for TypeScript compilation)
RUN npm install

# Copy source code and shared types
COPY auth-service/src/ ./src/
COPY shared/ ./shared/

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Create and set permissions for database directory
RUN mkdir -p /app/database && chown -R node:node /app/database

# Copy database directory
COPY auth-service/database/ ./database/
RUN chown -R node:node ./database

EXPOSE 3000

# Switch to non-root user
USER node

# Start using compiled JavaScript
CMD ["node", "dist/server.js"]