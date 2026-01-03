FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm install

COPY src/ ./src/

RUN npm run build

# Switch to non-root user
USER node

CMD ["node", "dist/server.js"]
