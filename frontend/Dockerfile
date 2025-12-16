# Build stage
FROM node:18-alpine AS builder

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

FROM alpine:3.17 AS waf
ENV NGINX_VERSION=1.29.4
ENV MODSEC_TAG=v3.0.14
ENV OWASP_TAG=v3.3.4

WORKDIR /opt

RUN echo "Installing Dependencies" && \
	apk add --no-cache autoconf automake byacc curl-dev flex g++ gcc geoip-dev git libc-dev libmaxminddb-dev libstdc++ libtool libxml2-dev linux-headers lmdb-dev make openssl-dev pcre-dev yajl-dev zlib-dev

RUN echo "Installing ModSecurity" && \
	git clone -b ${MODSEC_TAG} --depth 1 https://github.com/SpiderLabs/ModSecurity.git && \
	git -C /opt/ModSecurity submodule update --init --recursive && \
	cd /opt/ModSecurity && \
	./build.sh && ./configure --with-lmdb && \
	make && make install

RUN echo 'Cloning ModSecurity NGINX Connector and ModSec OWASP Rules, as well as Downloading and Extracting NGINX' && \
	git clone -b master --depth 1 https://github.com/SpiderLabs/ModSecurity-nginx.git && \
	git clone -b ${OWASP_TAG} --depth 1 https://github.com/coreruleset/coreruleset.git /usr/local/owasp-modsecurity-crs && \
	wget -O - https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz | tar -xz 

RUN echo "Installing NGINX Modules" && \
	cd /opt/nginx-${NGINX_VERSION} && \
	./configure --with-compat --add-dynamic-module=../ModSecurity-nginx && \
	make modules

RUN echo "Setting up ModSecurity" && \
	mv /usr/local/owasp-modsecurity-crs/crs-setup.conf.example /usr/local/owasp-modsecurity-crs/crs-setup.conf && \
	mv /usr/local/owasp-modsecurity-crs/rules/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf.example /usr/local/owasp-modsecurity-crs/rules/REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf && \
	mkdir modsec && \
	cp /opt/ModSecurity/unicode.mapping modsec && \
	cp /opt/ModSecurity/modsecurity.conf-recommended modsec/modsecurity.conf && \
	sed -i 's/SecRuleEngine DetectionOnly/SecRuleEngine On/' modsec/modsecurity.conf && \
	echo -e "Include /etc/nginx/modsec/modsecurity.conf\nInclude /usr/local/modsecurity-crs/crs-setup.conf\nInclude /usr/local/modsecurity-crs/rules/*.conf" > modsec/main.conf


# Production stage
FROM nginx:alpine

# Create the www-data user and group for nginx to use
RUN addgroup -g 101 -S nginx && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx || true

# Copy all built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html/
COPY --from=builder /app/css /usr/share/nginx/html/css
COPY --from=waf /opt/nginx-${NGINX_VERSION}/objs/ngx_http_modsecurity_module.so /usr/lib/nginx/modules/
COPY --from=waf /usr/local/modsecurity /usr/local/modsecurity
COPY --from=waf /usr/local/owasp-modsecurity-crs /usr/local/modsecurity-crs
COPY --from=waf /opt/modsec /etc/nginx/modsec

# Copy SSL certificates and nginx configuration
COPY nginx/certs /etc/nginx/certs
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Remove default nginx config to avoid conflicts
RUN rm -f /etc/nginx/conf.d/default.conf

RUN apk update --no-cache && \
	apk add --no-cache yajl libstdc++ libmaxminddb-libs lmdb libxml2 pcre

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
