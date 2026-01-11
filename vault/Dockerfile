FROM hashicorp/vault:1.21.1

RUN apk add --update --no-cache jq

COPY ./config/config.hcl /vault/config/config.hcl

COPY ./setup.sh /vault/

COPY ./ca.crt /usr/local/share/

RUN chmod +x /vault/setup.sh

CMD [ "/vault/setup.sh" ]