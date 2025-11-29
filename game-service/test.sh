#!/bin/bash

echo "🎮 Testing Game Service Endpoints"
echo "================================"

# Note: This script assumes the game service is already running
# For standalone testing, uncomment the following lines:
# npm run dev &
# SERVICE_PID=$!
# sleep 3

echo -e "\n1. Testing Health Endpoint:"
curl -s http://localhost:3002/health

echo -e "\n\n2. Testing Game History (User 1):"
curl -s http://localhost:3002/history/1

echo -e "\n\n3. Testing Game Statistics (User 1):"
curl -s http://localhost:3002/stats/1

echo -e "\n\n4. Testing Online Users:"
curl -s http://localhost:3002/online

echo -e "\n\n5. Testing WebSocket Connection (basic connectivity test):"
# Note: Full WebSocket testing would require a WebSocket client like websocat
# For now, just test that the endpoint responds (should return 400 or similar for non-WS request)
curl -s -I http://localhost:3002/ws

# For standalone testing, uncomment the following line:
# kill $SERVICE_PID 2>/dev/null

echo -e "\n\n✅ All game endpoint tests completed!"