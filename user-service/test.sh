#!/bin/bash

echo "🧪 Testing User Service Endpoints"
echo "================================="

# Note: This script assumes the user service is already running
# For standalone testing, uncomment the following lines:
# npm run dev &
# SERVICE_PID=$!
# sleep 3

echo -e "\n1. Testing Health Endpoint:"
curl -s http://localhost:3004/health

echo -e "\n\n2. Testing Profile Creation/Get (User 1):"
curl -s http://localhost:3004/profile/1

echo -e "\n\n3. Testing Profile Update (User 1):"
curl -s -X PUT http://localhost:3004/profile/1 \
  -H "Content-Type: application/json" \
  -d '{"displayName":"TestPlayer","bio":"Test bio","country":"US"}'

echo -e "\n\n4. Testing Game Stats Update (User 1):"
curl -s -X POST http://localhost:3004/game/update-stats/1 \
  -H "Content-Type: application/json" \
  -d '{"wins":5,"total_games":10,"xp":100,"level":2,"campaign_level":3}'

echo -e "\n\n5. Testing Achievements List:"
curl -s http://localhost:3004/achievements

echo -e "\n\n6. Testing User Achievements (User 1):"
curl -s http://localhost:3004/achievements/1

echo -e "\n\n7. Testing Achievement Unlock (User 1, Achievement 1):"
curl -s -X POST http://localhost:3004/achievement/unlock \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","achievementId":1}'

echo -e "\n\n8. Testing Achievement Check (User 1):"
curl -s -X POST http://localhost:3004/achievement/check \
  -H "Content-Type: application/json" \
  -d '{"userId":"1"}'

echo -e "\n\n9. Testing User Search:"
curl -s "http://localhost:3004/search/users?query=test&limit=5"

echo -e "\n\n10. Testing Online Users:"
curl -s http://localhost:3004/users/online

echo -e "\n\n11. Testing Leaderboard:"
curl -s "http://localhost:3004/leaderboard?type=wins&limit=10"

echo -e "\n\n12. Testing Profile After Updates (User 1):"
curl -s http://localhost:3004/profile/1

echo -e "\n\n13. Testing User Achievements After Unlock (User 1):"
curl -s http://localhost:3004/achievements/1

# For standalone testing, uncomment the following line:
# kill $SERVICE_PID 2>/dev/null

echo -e "\n\n✅ All endpoint tests completed!"
