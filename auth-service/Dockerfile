# auth-service/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install npm explicitly (usually included, but for Alpine, ensure latest)
RUN apk add --no-cache npm

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]