FROM node:18-alpine

WORKDIR /app

COPY ./blockchain-service/package*.json ./
COPY ./blockchain-service/tsconfig.json ./

COPY ./packages/common/ft-transcendence-common-1.0.0.tgz ./

RUN npm install ft-transcendence-common-1.0.0.tgz && npm install

COPY ./blockchain-service/src/ ./src/

RUN npm run build

USER node

CMD ["node", "dist/server.js"]
