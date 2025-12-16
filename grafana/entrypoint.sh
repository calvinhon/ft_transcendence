#!/bin/sh

# Grafana Entrypoint with Vault Integration
# This script loads the admin password from Vault before starting Grafana

set -e

echo "🔐 Grafana: Loading admin password from Vault..."

# Wait for Vault to be ready
echo "⏳ Waiting for Vault to be ready..."
for i in $(seq 1 30); do
  if curl -s http://vault:8200/v1/sys/health > /dev/null 2>&1; then
    echo "✅ Vault is ready"
    break
  fi
  echo "⏳ Vault not ready yet, waiting... ($i/30)"
  sleep 2
done

# Fetch password from Vault
VAULT_TOKEN=$VAULT_TOKEN
VAULT_ADDR=${VAULT_ADDR:-http://vault:8200}

echo "🔑 Fetching Grafana password from Vault..."
RESPONSE=$(curl -s -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/kv/data/grafana)

if [ $? -ne 0 ]; then
  echo "❌ Failed to connect to Vault"
  exit 1
fi

# Extract password from response using sed/awk instead of jq
ADMIN_PASSWORD=$(echo $RESPONSE | sed -n 's/.*"admin_password":"\([^"]*\)".*/\1/p')

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "❌ Failed to retrieve admin password from Vault"
  exit 1
fi

echo "✅ Grafana password loaded from Vault"

# Set the environment variable for Grafana
export GF_SECURITY_ADMIN_PASSWORD=$ADMIN_PASSWORD

echo "🚀 Starting Grafana with Vault-loaded credentials..."
echo "   Admin password: [PROTECTED]"

# Execute the original Grafana entrypoint
exec /run.sh