#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

echo "🔐 Testing Auth Service Endpoints"
echo "================================"

# Note: This script assumes the auth service is already running
# For standalone testing, uncomment the following lines:
# npm run dev &
# SERVICE_PID=$!
# sleep 3

# Set the target server (defaults to service internal port if running in container)
TARGET=${TARGET:-http://localhost:3000}

echo -e "\n1. Testing Health Endpoint: (target=$TARGET)"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/health" || true)
if [ "$HTTP" != "200" ]; then
  echo "❌ Health check failed: $HTTP"
  exit 1
fi

echo -e "\n\n2. Testing User Registration: (target=$TARGET)"
RES=$(curl -s -w "\\n%{http_code}" -X POST "$TARGET/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
HTTP=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | sed '$d')
echo "$BODY"
if [ "$HTTP" != "200" ] && [ "$HTTP" != "201" ]; then
  echo "❌ Registration failed: $HTTP"
  echo "$BODY"
  exit 1
fi

echo -e "\n\n3. Testing User Login: (target=$TARGET)"
RES=$(curl -s -w "\\n%{http_code}" -X POST "$TARGET/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
HTTP=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | sed '$d')
echo "$BODY"
if [ "$HTTP" != "200" ]; then
  echo "❌ Login failed: $HTTP"
  echo "$BODY"
  exit 1
fi

TOKEN=$(curl -s -X POST "$TARGET/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo -e "\n\n4. Testing Token Verification: (target=$TARGET)"
if [ -n "$TOKEN" ]; then
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$TARGET/verify" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' || true)
  if [ "$HTTP" != "200" ]; then
    echo "❌ Verify token failed: $HTTP"
    exit 1
  fi
else
  echo "No token available for verification"
fi

echo -e "\n\n5. Testing Profile Access (with token):"
if [ -n "$TOKEN" ]; then
  # Get userId from login response
  USER_ID=$(curl -s -X POST "$TARGET/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"password123"}' | grep -o '"userId":[0-9]*' | grep -o '[0-9]*')
  curl -s -X GET "$TARGET/profile/$USER_ID" \
    -H "Authorization: Bearer $TOKEN"
else
  echo "No token available for profile access"
fi

echo -e "\n\n6. Testing Forgot Password: (target=$TARGET)"
RES=$(curl -s -w "\\n%{http_code}" -X POST "$TARGET/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
HTTP=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | sed '$d')
echo "$BODY"
if [ "$HTTP" != "200" ] && [ "$HTTP" != "201" ]; then
  echo "❌ Forgot password failed: $HTTP"
  exit 1
fi

echo -e "\n\n7. Testing Reset Password: (target=$TARGET)"
RES=$(curl -s -w "\\n%{http_code}" -X POST "$TARGET/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"token":"fake-reset-token","newPassword":"newpassword123"}'
HTTP=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | sed '$d')
echo "$BODY"
# Reset may return not found for fake token; ensure non-500
if [ "$HTTP" -ge 500 ]; then
  echo "❌ Reset password returned server error: $HTTP"
  exit 1
fi

# For standalone testing, uncomment the following line:
# kill $SERVICE_PID 2>/dev/null

echo -e "\n\n✅ All auth endpoint tests completed!"