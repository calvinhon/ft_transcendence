FROM alpine:latest

ENV VERSION=1.21.1
ENV VAULT_SKIP_VERIFY=true

RUN apk add --update --virtual .deps --no-cache gnupg ca-certificates openssl && \
    cd /tmp && \
    wget https://releases.hashicorp.com/vault/${VERSION}/vault_${VERSION}_linux_amd64.zip && \
    wget https://releases.hashicorp.com/vault/${VERSION}/vault_${VERSION}_SHA256SUMS && \
    wget https://releases.hashicorp.com/vault/${VERSION}/vault_${VERSION}_SHA256SUMS.sig && \
    gpg --keyserver hkp://keyserver.ubuntu.com --recv-keys C874011F0AB405110D02105534365D9472D7468F && \
    gpg --verify vault_${VERSION}_SHA256SUMS.sig vault_${VERSION}_SHA256SUMS && \
    grep vault_${VERSION}_linux_amd64.zip vault_${VERSION}_SHA256SUMS | sha256sum -c && \
    unzip /tmp/vault_${VERSION}_linux_amd64.zip -d /tmp && \
    ls -l && \
    pwd && \
    mv /tmp/vault /usr/local/bin/vault && \
    mkdir -p /vault/certs && \
    openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 -subj "/C=AE/ST=Abu Dhabi/L=Abu Dhabi/O=42 Abu Dhabi/OU=Dev/CN=$HOST_NAME" -keyout /vault/certs/vault-key.pem -out /vault/certs/vault-cert.pem && \
    rm -f /tmp/vault_${VERSION}_linux_amd64.zip vault_${VERSION}_SHA256SUMS ${VERSION}/vault_${VERSION}_SHA256SUMS.sig && \
    apk del .deps

COPY ./unseal.sh /vault/

RUN chmod +x /vault/unseal.sh

CMD [ "/vault/unseal.sh" ]