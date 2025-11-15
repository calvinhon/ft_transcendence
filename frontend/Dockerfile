# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy all configuration files
COPY package*.json ./
COPY tsconfig.json ./tsconfig.json
COPY webpack.config.js ./

# Install dependencies
RUN npm install

# Copy source code and shared types
COPY src/ ./src/
COPY css/ ./css/
COPY index.html ./
COPY assets/ ./assets/
# COPY ../shared/ ./shared/

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
