#!/bin/sh

# Set the correct Vault address for unsealing
export VAULT_ADDR=http://127.0.0.1:8200

# Send the server into the background
vault server -config=/vault/config/config.hcl &

# Save the server PID
VAULT_PID=$!

# Enough time to wait for startup
sleep 3

# Unsealing with the keys
vault operator unseal $KEY_1
vault operator unseal $KEY_2
vault operator unseal $KEY_3

# Waiting for the server (ensuring the script doesn't exit before the server)
wait $VAULT_PID