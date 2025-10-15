# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy all configuration files
COPY frontend/package*.json ./
COPY tsconfig.json ./tsconfig.base.json
COPY frontend/tsconfig.json ./tsconfig.json
COPY frontend/webpack.config.js ./

# Install dependencies
RUN npm install

# Copy source code and shared types
COPY frontend/src/ ./src/
COPY frontend/css/ ./css/
COPY frontend/index.html ./
COPY shared/ ./shared/

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy all built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html/dist
COPY --from=builder /app/index.html /usr/share/nginx/html/
COPY --from=builder /app/css /usr/share/nginx/html/css

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
