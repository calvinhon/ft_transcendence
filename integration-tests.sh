#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

echo "🚀 Running integration test: bring up Docker Compose"
docker compose up --build -d

# Wait for services to become healthy (by checking the auth health endpoint)
echo "⏳ Waiting for services to initialize..."
MAX_RETRIES=30
SLEEP_SECS=2
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "- checking auth health (try $((RETRY_COUNT+1))/$MAX_RETRIES)..."
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/auth/health || true)
  if [ "$STATUS_CODE" = "200" ]; then
    echo "✅ Auth service responded: 200"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  sleep $SLEEP_SECS
done
if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
  echo "❌ Auth service did not become healthy within expected time. Aborting tests."
  docker compose logs --no-color --tail=200
  docker compose down
  exit 2
fi

# Use NGINX host proxy for endpoint checks by default (http://localhost)
TARGET=${TARGET:-http://localhost}

# Detect jq for pretty JSON output
if command -v jq >/dev/null 2>&1; then
  JQ=1
else
  JQ=0
fi

echo "\n🧪 Testing auth endpoints via $TARGET (NGINX proxy)"
echo "- HEALTH:"
curl -s -I "$TARGET/api/auth/health" | head -n 3
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/api/auth/health" || true)
if [ "$HTTP" != "200" ]; then
  echo "❌ Health check failed: $HTTP"
  docker compose logs --no-color --tail=200
  docker compose down
  exit 3
fi

echo "\n- USER REGISTRATION:"
RES=$(curl -s -w "\\n%{http_code}" -X POST "$TARGET/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"inttest","email":"inttest@example.com","password":"password123"}')
HTTP=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | sed '$d')
if [ "$JQ" -eq 1 ]; then echo "$BODY" | jq .; else echo "$BODY"; fi
if [ "$HTTP" != "200" ] && [ "$HTTP" != "201" ]; then
  echo "❌ Registration failed with status $HTTP"
  docker compose logs --no-color --tail=200
  docker compose down
  exit 4
fi
  -H "Content-Type: application/json" \
  -d '{"username":"inttest","email":"inttest@example.com","password":"password123"}' | jq .

echo "\n- LOGIN:"
RES=$(curl -s -w "\\n%{http_code}" -X POST "$TARGET/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"inttest","password":"password123"}')
HTTP=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | sed '$d')
if [ "$JQ" -eq 1 ]; then echo "$BODY" | jq .; else echo "$BODY"; fi
if [ "$HTTP" != "200" ]; then
  echo "❌ Login failed with status $HTTP"
  docker compose logs --no-color --tail=200
  docker compose down
  exit 5
fi

TOKEN=$(echo "$BODY" | jq -r '.token // empty' || true)
if [ -z "$TOKEN" ]; then
  echo "❌ Login returned no token"
  docker compose logs --no-color --tail=200
  docker compose down
  exit 6
fi
  -H "Content-Type: application/json" \
  -d '{"username":"inttest","password":"password123"}' | jq .

echo "\n✅ Integration tests completed (basic checks)."

echo "🎯 If you want to test directly to a service, set TARGET to e.g. http://localhost:3001 (auth service host port) or run the per-service test scripts in each service folder."

echo "Tip: To stop the stack: docker compose down"

exit 0
