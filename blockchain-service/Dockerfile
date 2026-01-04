FROM node:18-alpine

WORKDIR /app

COPY ./blockchain-service/package*.json ./
COPY ./blockchain-service/tsconfig.json ./

# Copy shared common package tarball
COPY ./packages/common/ft-transcendence-common-1.0.0.tgz ./

# Install dependencies and common package from tarball (include dev deps so TypeScript is available for build)
RUN npm install ft-transcendence-common-1.0.0.tgz && npm install

COPY ./blockchain-service/src/ ./src/

RUN npm run build

CMD ["node", "dist/server.js"]
