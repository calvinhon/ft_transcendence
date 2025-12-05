FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY hardhat.config.cjs ./
COPY contracts ./contracts
COPY scripts ./scripts
COPY entrypoint.sh ./
# COPY test ./test

RUN chmod +x entrypoint.sh

RUN npx hardhat compile

RUN mkdir -p /app/data /app/deployments

EXPOSE 8545

CMD ["./entrypoint.sh"]