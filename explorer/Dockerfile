FROM node:22-alpine

WORKDIR /app

# Install Ethernal globally
RUN npm install -g ethernal

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Start Ethernal with proper configuration
CMD ["ethernal", "listen", "--port", "3000", "--rpc", "http://blockchain:8545"]