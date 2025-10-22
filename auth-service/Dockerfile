<<<<<<< HEAD
# auth-service/Dockerfile
=======
>>>>>>> origin/feature/backend_solo
FROM node:18-alpine

WORKDIR /app

<<<<<<< HEAD
# Install Python and build dependencies for native modules
RUN apk add --no-cache python3 make g++ npm

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
=======
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
>>>>>>> origin/feature/backend_solo
