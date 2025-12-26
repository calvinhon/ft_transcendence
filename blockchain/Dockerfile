FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache curl bash

RUN npm install

COPY hardhat.config.cjs ./
COPY contracts ./contracts
COPY scripts ./scripts

RUN mkdir -p /app/data /app/deployments

EXPOSE 8545

CMD ["tail", "-f", "/dev/null"]