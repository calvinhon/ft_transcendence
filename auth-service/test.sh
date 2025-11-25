#!/bin/bash

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
curl -s "$TARGET/health"

echo -e "\n\n2. Testing User Registration: (target=$TARGET)"
curl -s -X POST "$TARGET/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

echo -e "\n\n3. Testing User Login: (target=$TARGET)"
curl -s -X POST "$TARGET/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

TOKEN=$(curl -s -X POST "$TARGET/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo -e "\n\n4. Testing Token Verification: (target=$TARGET)"
if [ -n "$TOKEN" ]; then
  curl -s -X POST "$TARGET/verify" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}'
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
curl -s -X POST "$TARGET/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

echo -e "\n\n7. Testing Reset Password: (target=$TARGET)"
curl -s -X POST "$TARGET/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"token":"fake-reset-token","newPassword":"newpassword123"}'

# For standalone testing, uncomment the following line:
# kill $SERVICE_PID 2>/dev/null

echo -e "\n\n✅ All auth endpoint tests completed!"