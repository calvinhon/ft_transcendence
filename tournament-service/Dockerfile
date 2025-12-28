FROM node:18-alpine

WORKDIR /app

# Copy shared common package tarball
COPY ./packages/common/ft-transcendence-common-1.0.0.tgz ./

# Copy package files
COPY ./tournament-service/package*.json ./
COPY ./tournament-service/tsconfig.json ./

# Install dependencies and common package from tarball (include dev deps so TypeScript is available for build)
RUN npm install ./ft-transcendence-common-1.0.0.tgz --include=dev && npm install --include=dev

# Copy source code
COPY ./tournament-service/src/ ./src/

RUN npm run build

RUN npm prune --production

# Ensure database directory exists
RUN mkdir -p /app/database

# Database files will be created by the application if they don't exist
COPY ./tournament-service/database/ ./database/

EXPOSE 3000

CMD ["sh", "-c", "if [ -f 'dist/server.js' ]; then node dist/server.js; else node server.js; fi"]
