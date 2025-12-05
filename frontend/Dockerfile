# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy configuration files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Install dependencies
RUN npm install

# Copy source code
COPY index.html ./
COPY src/ ./src/
COPY css/ ./css/
COPY assets/ ./assets/

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
# Vite builds to 'dist' by default
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
