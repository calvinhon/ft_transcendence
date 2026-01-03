FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm install

COPY src/ ./src/

RUN npm run build

CMD ["node", "dist/server.js"]
