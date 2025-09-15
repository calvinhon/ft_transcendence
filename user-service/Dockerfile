# user-service/Dockerfile
FROM node:18-bullseye-slim

WORKDIR /app

COPY package*.json ./
# Clear npm cache and install with specific flags
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]