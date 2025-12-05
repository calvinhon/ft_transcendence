#!/bin/bash
# Vault initialization script for transcendence project

VAULT_ADDR="http://vault:8200"
VAULT_TOKEN="dev-token"

# Wait for Vault to be ready
sleep 5

# Check if Vault is running
curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null || exit 1

# Enable KV v2 secrets engine if not already enabled
curl -s -X LIST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  "$VAULT_ADDR/v1/sys/mounts" | grep -q "secret/" || \
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"type":"kv-v2"}' \
  "$VAULT_ADDR/v1/sys/mounts/secret"

# Store secrets in Vault
echo "Storing secrets in Vault..."

# JWT Secret
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"data":{"value":"'"${JWT_SECRET:-supersecretkey}"'"}}' \
  "$VAULT_ADDR/v1/secret/data/jwt-secret"

# Google OAuth credentials
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"data":{"client_id":"'"${GOOGLE_CLIENT_ID:-}"'","client_secret":"'"${GOOGLE_CLIENT_SECRET:-}"'"}}' \
  "$VAULT_ADDR/v1/secret/data/google-oauth"

# GitHub OAuth credentials
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"data":{"client_id":"'"${GITHUB_CLIENT_ID:-}"'","client_secret":"'"${GITHUB_CLIENT_SECRET:-}"'"}}' \
  "$VAULT_ADDR/v1/secret/data/github-oauth"

# Database credentials
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"data":{"db_url":"'"${DATABASE_URL:-}"'","db_user":"'"${DB_USER:-}"'","db_password":"'"${DB_PASSWORD:-}"'"}}' \
  "$VAULT_ADDR/v1/secret/data/database"

echo "Vault initialization complete"
