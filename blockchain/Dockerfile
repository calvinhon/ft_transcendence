FROM node:18-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy blockchain development files
COPY hardhat.config.cjs ./
COPY contracts ./contracts
# COPY scripts ./scripts
# COPY test ./test

# Compile contracts on build
RUN npx hardhat compile

# Create data directory for blockchain state
RUN mkdir -p /app/data

EXPOSE 8545

# Start Hardhat node
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]