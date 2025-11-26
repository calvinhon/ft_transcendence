#!/bin/bash

echo "🏆 Testing Tournament Service Endpoints"
echo "====================================="

# Note: This script assumes the tournament service is already running
# For standalone testing, uncomment the following lines:
# npm run dev &
# SERVICE_PID=$!
# sleep 3

echo -e "\n1. Testing Health Endpoint:"
curl -s http://localhost:3003/health

echo -e "\n\n2. Testing Get All Tournaments:"
curl -s http://localhost:3003/tournaments

echo -e "\n\n3. Testing Create Tournament:"
curl -s -X POST http://localhost:3003/tournaments \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Tournament","description":"A test tournament","maxParticipants":8,"createdBy":1}'

echo -e "\n\n4. Testing Get Tournament Details (ID 1):"
curl -s http://localhost:3003/tournaments/1

echo -e "\n\n5. Testing Join Tournament (ID 1, User 1):"
curl -s -X POST http://localhost:3003/tournaments/1/join \
  -H "Content-Type: application/json" \
  -d '{"userId":1}'

echo -e "\n\n6. Testing Join Tournament (ID 1, User 2):"
curl -s -X POST http://localhost:3003/tournaments/1/join \
  -H "Content-Type: application/json" \
  -d '{"userId":2}'

echo -e "\n\n7. Testing Start Tournament (ID 1):"
curl -s -X POST http://localhost:3003/tournaments/1/start \
  -H "Content-Type: application/json" \
  -d '{"startedBy":1}'

echo -e "\n\n8. Testing Get Tournament Matches (ID 1):"
curl -s http://localhost:3003/tournaments/1/matches

echo -e "\n\n9. Testing Submit Match Result (Tournament 1, Match 1):"
curl -s -X POST http://localhost:3003/tournaments/1/matches/1/result \
  -H "Content-Type: application/json" \
  -d '{"winnerId":1,"player1Score":10,"player2Score":5}'

echo -e "\n\n10. Testing Get Tournament Leaderboard (ID 1):"
curl -s http://localhost:3003/tournaments/1/leaderboard

echo -e "\n\n11. Testing Get User Tournaments (User 1):"
curl -s http://localhost:3003/tournaments/user/1

echo -e "\n\n12. Testing Leave Tournament (ID 1, User 2):"
curl -s -X POST http://localhost:3003/tournaments/1/leave \
  -H "Content-Type: application/json" \
  -d '{"userId":2}'

# For standalone testing, uncomment the following line:
# kill $SERVICE_PID 2>/dev/null

echo -e "\n\n✅ All tournament endpoint tests completed!"