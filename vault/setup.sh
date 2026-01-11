#!/bin/sh

# Send the server into the background
vault server -config=/vault/config/config.hcl &

VAULT_PID=$!

# Enough time to wait for startup
sleep 1

# Unsealing with the keys
vault operator unseal $KEY_1
vault operator unseal $KEY_2
vault operator unseal $KEY_3

if [ -z "$VAULT_ROLE" ]; then
  exit 2
fi

# Issue the SSL certificates
RESPONSE=$(vault write -format=json pki/issue/$VAULT_ROLE common_name="$HOST" alt_names="$HOST,localhost" ip_sans="127.0.0.1" ttl=87600h)
if echo "$RESPONSE" | grep -q "errors"; then
  exit 3
fi

mkdir -p /vault/certs

# Extract the SSL certificates
echo "$RESPONSE" | jq -r '.data.certificate' > /vault/certs/vault-cert.pem
echo "$RESPONSE" | jq -r '.data.private_key' > /vault/certs/vault-key.pem

# Enable TLS for HTTPS connections
sed -i 's|tls_disable = "true"|tls_disable = "false"\n  tls_cert_file = "/vault/certs/vault-cert.pem"\n  tls_key_file = "/vault/certs/vault-key.pem"|g' /vault/config/config.hcl

# Restart the server with TLS enabled
kill $VAULT_PID
wait $VAULT_PID 2>/dev/null || true

export VAULT_ADDR=https://127.0.0.1:8200

vault server -config=/vault/config/config.hcl &

# Save the server PID
VAULT_PID=$!

# Enough time to wait for startup
sleep 1

# Unsealing with the keys
vault operator unseal $KEY_1
vault operator unseal $KEY_2
vault operator unseal $KEY_3

wait $VAULT_PID