FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY src/ ./src/

RUN npm run build

RUN npm prune --production

COPY database/ ./database/

EXPOSE 3000

CMD ["sh", "-c", "if [ -f 'dist/server.js' ]; then node dist/server.js; else node server.js; fi"]
