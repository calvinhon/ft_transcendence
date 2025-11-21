#!/bin/bash

echo "🧪 Testing User Service Endpoints"
echo "================================="

# Start service in background
npm run dev &
SERVICE_PID=$!
sleep 3

echo -e "\n1. Testing Health Endpoint:"
curl -s http://localhost:3000/health | jq '.'

echo -e "\n2. Testing Profile Creation/Get (User 1):"
curl -s http://localhost:3000/profile/1 | jq '.'

echo -e "\n3. Testing Profile Update (User 1):"
curl -s -X PUT http://localhost:3000/profile/1 \
  -H "Content-Type: application/json" \
  -d '{"displayName":"TestPlayer","bio":"Test bio","country":"US"}' | jq '.'

echo -e "\n4. Testing Game Stats Update (User 1):"
curl -s -X POST http://localhost:3000/game/update-stats/1 \
  -H "Content-Type: application/json" \
  -d '{"wins":5,"total_games":10,"xp":100,"level":2,"campaign_level":3}' | jq '.'

echo -e "\n5. Testing Achievements List:"
curl -s http://localhost:3000/achievements | jq '.'

echo -e "\n6. Testing User Achievements (User 1):"
curl -s http://localhost:3000/achievements/1 | jq '.'

echo -e "\n7. Testing Achievement Unlock (User 1, Achievement 1):"
curl -s -X POST http://localhost:3000/achievement/unlock \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","achievementId":1}' | jq '.'

echo -e "\n8. Testing Achievement Check (User 1):"
curl -s -X POST http://localhost:3000/achievement/check \
  -H "Content-Type: application/json" \
  -d '{"userId":"1"}' | jq '.'

echo -e "\n9. Testing User Search:"
curl -s "http://localhost:3000/search/users?query=test&limit=5" | jq '.'

echo -e "\n10. Testing Online Users:"
curl -s http://localhost:3000/users/online | jq '.'

echo -e "\n11. Testing Leaderboard:"
curl -s "http://localhost:3000/leaderboard?type=wins&limit=10" | jq '.'

echo -e "\n12. Testing Profile After Updates (User 1):"
curl -s http://localhost:3000/profile/1 | jq '.'

echo -e "\n13. Testing User Achievements After Unlock (User 1):"
curl -s http://localhost:3000/achievements/1 | jq '.'

# Kill the service
kill $SERVICE_PID 2>/dev/null

echo -e "\n✅ All endpoint tests completed!"
