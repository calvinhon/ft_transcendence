# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy all configuration files
COPY package*.json ./
COPY ../tsconfig.json ./tsconfig.json
COPY vite.config.js ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/
COPY css/ ./css/
COPY index.html ./

# Clean any existing build artifacts and build the application
RUN rm -rf dist node_modules/.vite && npm run build && ls -la dist/assets/ || echo "Build failed"

# Production stage
FROM nginx:alpine

# Create the www-data user and group for nginx to use
RUN addgroup -g 101 -S nginx && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx || true

# Copy all built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html/
COPY --from=builder /app/css /usr/share/nginx/html/css

# Copy SSL certificates and nginx configuration
COPY nginx/certs /etc/nginx/certs
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/modsecurity.conf /etc/nginx/modsecurity.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
