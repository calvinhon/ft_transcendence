FROM node:18-alpine

WORKDIR /app

# Copy shared common package tarball
COPY ./packages/common/ft-transcendence-common-1.0.0.tgz ./

# Copy package files
COPY ./tournament-service/package*.json ./
COPY ./tournament-service/tsconfig.json ./

# Install dependencies and common package from tarball (include dev deps so TypeScript is available for build)
RUN npm install ./ft-transcendence-common-1.0.0.tgz --include=dev && npm install --include=dev && apk add curl jq

# Copy source code
COPY ./tournament-service/src/ ./src/

RUN npm run build

RUN npm prune --production

# Copy entrypoint to perform runtime initialization on mounts
COPY ./tournament-service/entrypoint.sh /app/entrypoint.sh

COPY ./tournament-service/ca.crt /usr/local/share/ca.crt

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]

CMD ["node", "dist/server.js"]
