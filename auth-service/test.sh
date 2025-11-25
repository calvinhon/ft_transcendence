#!/bin/bash

echo "🔐 Testing Auth Service Endpoints"
echo "================================"

# Note: This script assumes the auth service is already running
# For standalone testing, uncomment the following lines:
# npm run dev &
# SERVICE_PID=$!
# sleep 3

echo -e "\n1. Testing Health Endpoint:"
curl -s http://localhost:3001/health

echo -e "\n\n2. Testing User Registration:"
curl -s -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

echo -e "\n\n3. Testing User Login:"
curl -s -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Extract token from login response (simplified)
TOKEN=$(curl -s -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo -e "\n\n4. Testing Token Verification:"
if [ -n "$TOKEN" ]; then
  curl -s -X POST http://localhost:3001/verify \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"$TOKEN\"}"
else
  echo "No token available for verification"
fi

echo -e "\n\n5. Testing Profile Access (with token):"
if [ -n "$TOKEN" ]; then
  curl -s -X GET http://localhost:3001/profile \
    -H "Authorization: Bearer $TOKEN"
else
  echo "No token available for profile access"
fi

echo -e "\n\n6. Testing Forgot Password:"
curl -s -X POST http://localhost:3001/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

echo -e "\n\n7. Testing Reset Password:"
curl -s -X POST http://localhost:3001/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"fake-reset-token","newPassword":"newpassword123"}'

# For standalone testing, uncomment the following line:
# kill $SERVICE_PID 2>/dev/null

echo -e "\n\n✅ All auth endpoint tests completed!"