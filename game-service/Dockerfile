<<<<<<< HEAD
# game-service/Dockerfile
=======
>>>>>>> origin/feature/backend_solo
FROM node:18-alpine

WORKDIR /app

<<<<<<< HEAD
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
=======
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
>>>>>>> origin/feature/backend_solo
