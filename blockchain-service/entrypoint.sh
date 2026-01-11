#!/bin/sh
set -e  # 1. Fail fast
CERT_DIR=/etc/certs
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
export HTTPS_CERT_PATH=$CERT_DIR/server.crt
export HTTPS_KEY_PATH=$CERT_DIR/server.key
export HTTPS_CA_PATH=$CERT_DIR/ca.crt
echo "$RESPONSE" | jq -r '.data.certificate' > $HTTPS_CERT_PATH
echo "$RESPONSE" | jq -r '.data.private_key' > $HTTPS_KEY_PATH
echo "$RESPONSE" | jq -r '.data.issuing_ca' > $HTTPS_CA_PATH
if command -v su-exec >/dev/null 2>&1; then
  exec su-exec node "$@"
else
  exec "$@"
fi