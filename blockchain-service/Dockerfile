FROM node:22-alpine

WORKDIR /app

# Copy shared common package tarball
COPY ./packages/common/ft-transcendence-common-1.0.0.tgz ./

# Copy package files
COPY ./blockchain-service/package*.json ./
COPY ./blockchain-service/tsconfig.json ./

# Install dependencies and common package from tarball
RUN npm install ft-transcendence-common-1.0.0.tgz && npm install

COPY ./blockchain-service/src/ ./src/

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]
