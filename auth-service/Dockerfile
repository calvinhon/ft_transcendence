FROM node:18-alpine

WORKDIR /app

# Copy shared common package tarball
COPY ./packages/common/ft-transcendence-common-1.0.0.tgz ./

# Copy package files
COPY ./auth-service/package*.json ./
COPY ./auth-service/tsconfig.json ./

# Install dependencies and common package from tarball
RUN npm install ft-transcendence-common-1.0.0.tgz && npm install

# Copy source code
COPY ./auth-service/src/ ./src/

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Copy entrypoint to perform runtime initialization on mounts
COPY ./auth-service/entrypoint.sh /app/entrypoint.sh

COPY ./auth-service/ca.crt /usr/local/share/ca.crt

RUN chmod +x /app/entrypoint.sh && apk add curl jq

ENTRYPOINT ["/app/entrypoint.sh"]

CMD ["node", "dist/server.js"]