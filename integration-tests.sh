#!/bin/bash
set -e

echo "🚀 Running integration test: bring up Docker Compose"
docker compose up --build -d

echo "⏳ Waiting 6s for services to initialize..."
sleep 6

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

echo "\n- USER REGISTRATION:"
RES=$(curl -s -X POST "$TARGET/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"inttest","email":"inttest@example.com","password":"password123"}')
if [ "$JQ" -eq 1 ]; then echo "$RES" | jq .; else echo "$RES"; fi
  -H "Content-Type: application/json" \
  -d '{"username":"inttest","email":"inttest@example.com","password":"password123"}' | jq .

echo "\n- LOGIN:"
RES=$(curl -s -X POST "$TARGET/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"inttest","password":"password123"}')
if [ "$JQ" -eq 1 ]; then echo "$RES" | jq .; else echo "$RES"; fi
  -H "Content-Type: application/json" \
  -d '{"username":"inttest","password":"password123"}' | jq .

echo "\n✅ Integration tests completed (basic checks)."

echo "🎯 If you want to test directly to a service, set TARGET to e.g. http://localhost:3001 (auth service host port) or run the per-service test scripts in each service folder."

echo "Tip: To stop the stack: docker compose down"

exit 0
