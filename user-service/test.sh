#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Set the target server (defaults to service internal port if running in container)
TARGET=${TARGET:-http://localhost:3004}

echo "🧪 Testing User Service Endpoints (target=$TARGET)"
echo "================================================"

echo -e "\n1. Testing Health Endpoint:"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/health" || true)
if [ "$HTTP" != "200" ]; then
  echo "❌ Health check failed: $HTTP"
  exit 1
fi
curl -s "$TARGET/health"

echo -e "\n\n2. Testing Profile Creation/Get (User 1):"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/profile/1" || true)
if [ "$HTTP" != "200" ]; then
  echo "❌ Profile get failed: $HTTP"
  exit 1
fi
curl -s "$TARGET/profile/1"

echo -e "\n\n3. Testing Profile Update (User 1):"
RES=$(curl -s -w "\\n%{http_code}" -X PUT "$TARGET/profile/1" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"TestPlayer","bio":"Test bio","country":"US"}')
HTTP=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | sed '$d')
if [ "$HTTP" != "200" ]; then
  echo "❌ Profile update failed: $HTTP"
  echo "$BODY"
  exit 1
fi
echo "$BODY"

echo -e "\n\n4. Testing Achievements List:"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/achievements" || true)
if [ "$HTTP" != "200" ]; then
  echo "❌ Achievements list failed: $HTTP"
  exit 1
fi
curl -s "$TARGET/achievements"

echo -e "\n\n5. Testing User Achievements (User 1):"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/achievements/1" || true)
if [ "$HTTP" != "200" ]; then
  echo "❌ User achievements failed: $HTTP"
  exit 1
fi
curl -s "$TARGET/achievements/1"

echo -e "\n\n6. Testing Achievement Unlock (User 1, Achievement 1):"
RES=$(curl -s -w "\\n%{http_code}" -X POST "$TARGET/achievement/unlock" \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","achievementId":1}')
HTTP=$(echo "$RES" | tail -n1)
BODY=$(echo "$RES" | sed '$d')
if [ "$HTTP" != "200" ] && [ "$HTTP" != "409" ]; then
  echo "❌ Achievement unlock failed: $HTTP"
  echo "$BODY"
  exit 1
fi
echo "$BODY"

echo -e "\n\n7. Testing User Search:"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/search/users?query=test&limit=5" || true)
if [ "$HTTP" != "200" ]; then
  echo "❌ User search failed: $HTTP"
  exit 1
fi
curl -s "$TARGET/search/users?query=test&limit=5"

echo -e "\n\n8. Testing Online Users:"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET/users/online" || true)
if [ "$HTTP" != "200" ]; then
  echo "❌ Online users failed: $HTTP"
  exit 1
fi
curl -s "$TARGET/users/online"

echo -e "\n✅ All tests passed!"
curl -s "http://localhost:3004/leaderboard?type=wins&limit=10"

echo -e "\n\n12. Testing Profile After Updates (User 1):"
curl -s http://localhost:3004/profile/1

echo -e "\n\n13. Testing User Achievements After Unlock (User 1):"
curl -s http://localhost:3004/achievements/1

# For standalone testing, uncomment the following line:
# kill $SERVICE_PID 2>/dev/null

echo -e "\n\n✅ All endpoint tests completed!"
