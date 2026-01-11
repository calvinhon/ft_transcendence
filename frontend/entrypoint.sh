#!/bin/sh
set -e  # 1. Fail fast

if [ -z "$VAULT_TOKEN" ]; then
  exit 2
fi
if [ -z "$VAULT_ROLE" ]; then
  exit 3
fi
CERT_DIR=/etc/nginx/certs
export VAULT_ROLE="client-traffic"
export HTTPS_CERT_PATH=$CERT_DIR/cert.pem
export HTTPS_KEY_PATH=$CERT_DIR/key.pem
export HTTPS_CA_PATH=$CERT_DIR/ca.crt
mkdir -p $CERT_DIR
sleep 5
RESPONSE=$(curl -s --cacert /usr/local/share/ca.crt --request POST --header "X-Vault-Token: $VAULT_TOKEN" --data "{\"common_name\": \"localhost\", \"alt_names\": \"localhost,$HOST,$HOST-service\"}" "$VAULT_ADDR/v1/pki/issue/$VAULT_ROLE")
if echo "$RESPONSE" | grep -q "errors"; then
  exit 4
fi
echo "$RESPONSE" | jq -r '.data.certificate' > $HTTPS_CERT_PATH
echo "$RESPONSE" | jq -r '.data.private_key' > $HTTPS_KEY_PATH
echo "$RESPONSE" | jq -r '.data.issuing_ca' > $HTTPS_CA_PATH
exec "$@"