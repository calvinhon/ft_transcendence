FROM node:20-alpine

WORKDIR /app

# Install npm explicitly
RUN apk add --no-cache npm

# Install dependencies
COPY package*.json ./
COPY tsconfig.json ./
RUN npm install

# Copy source code
COPY src/ ./src/
COPY contracts/ ./contracts/
COPY scripts/ ./scripts/
COPY test/ ./test/
COPY hardhat.config.js ./

# Build TypeScript if src exists
RUN if [ -d "src" ]; then npm run build; else echo "No TypeScript source found, using JavaScript"; fi

# Copy JavaScript files for backward compatibility
COPY *.js ./

# Compile contracts
RUN npx hardhat compile

# Create startup script with TypeScript support
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'npx hardhat node --hostname 0.0.0.0 &' >> /app/start.sh && \
    echo 'sleep 10' >> /app/start.sh && \
    echo 'if [ -f "dist/server.js" ]; then node dist/server.js; else node server.js; fi' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose ports
EXPOSE 8545 3001

# Start both hardhat node and API server
CMD ["/app/start.sh"]
