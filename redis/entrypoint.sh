#!/bin/sh
set -e  # 1. Fail fast

CERT_DIR=/redis/certs
if [ -z "$VAULT_TOKEN" ]; then
  exit 2
fi
if [ -z "$VAULT_ROLE" ]; then
  exit 3
fi
mkdir -p $CERT_DIR
sleep 5
RESPONSE=$(curl -s --cacert /usr/local/share/ca.crt --request POST --header "X-Vault-Token: $VAULT_TOKEN" --data "{\"common_name\": \"$HOST\", \"alt_names\": \"localhost,$HOST,$HOST-service\"}" "$VAULT_ADDR/v1/pki/issue/$VAULT_ROLE")
if echo "$RESPONSE" | grep -q "errors"; then
  exit 4
fi
export HTTPS_CERT_PATH=$CERT_DIR/redis-cert.pem
export HTTPS_KEY_PATH=$CERT_DIR/redis-key.pem
export HTTPS_CA_PATH=$CERT_DIR/redis-ca.pem
echo "$RESPONSE" | jq -r '.data.certificate' > $HTTPS_CERT_PATH
echo "$RESPONSE" | jq -r '.data.private_key' > $HTTPS_KEY_PATH
echo "$RESPONSE" | jq -r '.data.issuing_ca' > $HTTPS_CA_PATH
exec redis-server --tls-port 6379 --port 0 --tls-cert-file $HTTPS_CERT_PATH --tls-key-file $HTTPS_KEY_PATH --tls-ca-cert-file $HTTPS_CA_PATH --tls-auth-clients yes


docker exec redis redis-cli --tls --cert /redis/certs/redis-cert.pem --key /redis/certs/redis-key.pem --cacert /redis/certs/redis-ca.pem KEYS "*"