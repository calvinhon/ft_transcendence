FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN apk add --no-cache curl bash

COPY hardhat.config.cjs ./
COPY contracts ./contracts
COPY scripts ./scripts
# COPY test ./test

RUN mkdir -p /app/data /app/deployments

EXPOSE 8545

CMD ["tail", "-f", "/dev/null"]