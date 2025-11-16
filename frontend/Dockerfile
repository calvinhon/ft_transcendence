# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy all configuration files
COPY package*.json ./
COPY ../tsconfig.json ./tsconfig.json
COPY vite.config.js ./

# Install dependencies
RUN npm install

# Copy source code and shared types
COPY src/ ./src/
COPY css/ ./css/
COPY index.html ./
COPY assets/ ./assets/
# COPY ../shared/ ./shared/

# Clean any existing build artifacts and build the application
RUN rm -rf dist node_modules/.vite && npm run build && ls -la dist/assets/ || echo "Build failed"

# Production stage
FROM nginx:alpine

# Copy all built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html/
COPY --from=builder /app/css /usr/share/nginx/html/css

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
