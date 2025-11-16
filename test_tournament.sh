#!/bin/bash
# Tournament Mode Testing Script
# This script tests all tournament functionality

BASE_URL="http://localhost:3003"
AUTH_URL="http://localhost:3001"

echo "================================================"
echo "🏆 Tournament Mode Test Suite"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

echo "📋 Test 1: Service Health Check"
echo "--------------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/list)
if [ "$response" = "200" ]; then
    test_result 0 "Tournament service is running"
else
    test_result 1 "Tournament service is not responding (HTTP $response)"
fi
echo ""

echo "📋 Test 2: Create Tournament (4 players)"
echo "--------------------------------"
create_response=$(curl -s -X POST $BASE_URL/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tournament - 4 Players",
    "description": "Testing bracket generation with 4 players",
    "maxParticipants": 4,
    "createdBy": 1
  }')

tournament_id=$(echo $create_response | grep -o '"tournamentId":[0-9]*' | grep -o '[0-9]*')

if [ -n "$tournament_id" ]; then
    test_result 0 "Tournament created successfully (ID: $tournament_id)"
else
    test_result 1 "Failed to create tournament"
    echo "Response: $create_response"
fi
echo ""

echo "📋 Test 3: Join Tournament (4 players)"
echo "--------------------------------"
for player_id in 1 2 3 4; do
    join_response=$(curl -s -X POST $BASE_URL/join \
      -H "Content-Type: application/json" \
      -d "{
        \"tournamentId\": $tournament_id,
        \"userId\": $player_id
      }")
    
    if echo "$join_response" | grep -q "Successfully joined"; then
        test_result 0 "Player $player_id joined successfully"
    else
        test_result 1 "Player $player_id failed to join"
        echo "Response: $join_response"
    fi
done
echo ""

echo "📋 Test 4: Start Tournament & Generate Bracket"
echo "--------------------------------"
start_response=$(curl -s -X POST $BASE_URL/start/$tournament_id)

first_round_matches=$(echo $start_response | grep -o '"firstRoundMatches":[0-9]*' | grep -o '[0-9]*')
total_rounds=$(echo $start_response | grep -o '"totalRounds":[0-9]*' | grep -o '[0-9]*')

if [ "$first_round_matches" = "2" ] && [ "$total_rounds" = "2" ]; then
    test_result 0 "Bracket generated correctly (2 matches, 2 rounds)"
else
    test_result 1 "Bracket generation incorrect (got $first_round_matches matches, $total_rounds rounds)"
    echo "Response: $start_response"
fi
echo ""

echo "📋 Test 5: Get Tournament Details & Verify Matches"
echo "--------------------------------"
details_response=$(curl -s $BASE_URL/details/$tournament_id)

# Count matches in the response
match_count=$(echo "$details_response" | grep -o '"match_number"' | wc -l)

if [ "$match_count" = "2" ]; then
    test_result 0 "Tournament has correct number of matches ($match_count)"
else
    test_result 1 "Tournament has incorrect number of matches (expected 2, got $match_count)"
fi
echo ""

echo "📋 Test 6: Record Match Results (Semi-Finals)"
echo "--------------------------------"
# Parse matches using python json module
match1_id=$(echo "$details_response" | python3 -c "import sys, json; matches = json.load(sys.stdin)['matches']; print(next((m['id'] for m in matches if m['round']==1 and m['match_number']==1), ''))")
match1_p1=$(echo "$details_response" | python3 -c "import sys, json; matches = json.load(sys.stdin)['matches']; print(next((m['player1_id'] for m in matches if m['round']==1 and m['match_number']==1), ''))")
match1_p2=$(echo "$details_response" | python3 -c "import sys, json; matches = json.load(sys.stdin)['matches']; print(next((m['player2_id'] for m in matches if m['round']==1 and m['match_number']==1), ''))")

match2_id=$(echo "$details_response" | python3 -c "import sys, json; matches = json.load(sys.stdin)['matches']; print(next((m['id'] for m in matches if m['round']==1 and m['match_number']==2), ''))")
match2_p1=$(echo "$details_response" | python3 -c "import sys, json; matches = json.load(sys.stdin)['matches']; print(next((m['player1_id'] for m in matches if m['round']==1 and m['match_number']==2), ''))")
match2_p2=$(echo "$details_response" | python3 -c "import sys, json; matches = json.load(sys.stdin)['matches']; print(next((m['player2_id'] for m in matches if m['round']==1 and m['match_number']==2), ''))")

echo "  Match 1 (ID $match1_id): Player $match1_p1 vs Player $match1_p2"
echo "  Match 2 (ID $match2_id): Player $match2_p1 vs Player $match2_p2"

# Record result for match 1 (player1 wins)
result1=$(curl -s -X POST $BASE_URL/match/result \
  -H "Content-Type: application/json" \
  -d "{\"matchId\": $match1_id, \"winnerId\": $match1_p1, \"player1Score\": 8, \"player2Score\": 5}")

if echo "$result1" | grep -q "successfully"; then
    test_result 0 "Match 1 result recorded (Player $match1_p1 wins 8-5)"
else
    test_result 1 "Failed to record Match 1 result"
    echo "Response: $result1"
fi

# Record result for match 2 (player2 wins)
result2=$(curl -s -X POST $BASE_URL/match/result \
  -H "Content-Type: application/json" \
  -d "{\"matchId\": $match2_id, \"winnerId\": $match2_p2, \"player1Score\": 6, \"player2Score\": 8}")

if echo "$result2" | grep -q "successfully"; then
    test_result 0 "Match 2 result recorded (Player $match2_p2 wins 8-6)"
else
    test_result 1 "Failed to record Match 2 result"
    echo "Response: $result2"
fi
echo ""

echo "📋 Test 7: Verify Next Round Created Automatically"
echo "--------------------------------"
sleep 2  # Give it time to create next round
details_response=$(curl -s $BASE_URL/details/$tournament_id)
match_count=$(echo "$details_response" | grep -o '"match_number"' | wc -l)

if [ "$match_count" = "3" ]; then
    test_result 0 "Final match created automatically (total 3 matches)"
else
    test_result 1 "Final match not created (expected 3 matches, got $match_count)"
fi
echo ""

echo "📋 Test 8: Complete Final Match"
echo "--------------------------------"
# Get the final match (round 2) using python
final_match_id=$(echo "$details_response" | python3 -c "import sys, json; matches = json.load(sys.stdin)['matches']; print(next((m['id'] for m in matches if m['round']==2), ''))")
final_player1=$(echo "$details_response" | python3 -c "import sys, json; matches = json.load(sys.stdin)['matches']; print(next((m['player1_id'] for m in matches if m['round']==2), ''))")
final_player2=$(echo "$details_response" | python3 -c "import sys, json; matches = json.load(sys.stdin)['matches']; print(next((m['player2_id'] for m in matches if m['round']==2), ''))")

echo "  Final match ID: $final_match_id (Player $final_player1 vs Player $final_player2)"

final_result=$(curl -s -X POST $BASE_URL/match/result \
  -H "Content-Type: application/json" \
  -d "{\"matchId\": $final_match_id, \"winnerId\": $final_player1, \"player1Score\": 8, \"player2Score\": 4}")

if echo "$final_result" | grep -q "successfully"; then
    test_result 0 "Final match completed (Player 1 wins tournament)"
else
    test_result 1 "Failed to record final match"
    echo "Response: $final_result"
fi
echo ""

echo "📋 Test 9: Verify Tournament Finished"
echo "--------------------------------"
sleep 2  # Give database time to update
details_response=$(curl -s $BASE_URL/details/$tournament_id)

if echo "$details_response" | grep -q '"status":"finished"'; then
    test_result 0 "Tournament marked as finished"
else
    test_result 1 "Tournament not marked as finished"
    echo "Response: $details_response"
fi

if echo "$details_response" | grep -q '"winner_id":1'; then
    test_result 0 "Winner correctly recorded (Player 1)"
else
    test_result 1 "Winner not correctly recorded"
fi
echo ""

echo "📋 Test 10: Blockchain Recording"
echo "--------------------------------"
blockchain_response=$(curl -s -X POST $BASE_URL/blockchain/record \
  -H "Content-Type: application/json" \
  -d "{
    \"tournamentId\": $tournament_id,
    \"winnerId\": 1
  }")

if echo "$blockchain_response" | grep -q "transactionHash"; then
    tx_hash=$(echo "$blockchain_response" | grep -o '"transactionHash":"[^"]*"' | cut -d'"' -f4)
    test_result 0 "Tournament recorded on blockchain (TX: ${tx_hash:0:10}...)"
else
    test_result 1 "Failed to record on blockchain"
    echo "Response: $blockchain_response"
fi
echo ""

# Edge case tests
echo "================================================"
echo "🧪 Edge Case Tests"
echo "================================================"
echo ""

echo "📋 Test 11: Non-Power-of-2 Participants (3 players)"
echo "--------------------------------"
create_response=$(curl -s -X POST $BASE_URL/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tournament - 3 Players (BYE)",
    "description": "Testing BYE handling",
    "maxParticipants": 8,
    "createdBy": 1
  }')

tournament3_id=$(echo $create_response | grep -o '"tournamentId":[0-9]*' | grep -o '[0-9]*')

for player_id in 1 2 3; do
    curl -s -X POST $BASE_URL/join \
      -H "Content-Type: application/json" \
      -d "{\"tournamentId\": $tournament3_id, \"userId\": $player_id}" > /dev/null
done

start_response=$(curl -s -X POST $BASE_URL/start/$tournament3_id)
first_round_matches=$(echo $start_response | grep -o '"firstRoundMatches":[0-9]*' | grep -o '[0-9]*')

if [ "$first_round_matches" = "2" ]; then
    test_result 0 "BYE handled correctly (2 matches for 3 players)"
else
    test_result 1 "BYE handling incorrect (got $first_round_matches matches)"
fi
echo ""

echo "📋 Test 12: Minimum Tournament (2 players)"
echo "--------------------------------"
create_response=$(curl -s -X POST $BASE_URL/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tournament - 2 Players",
    "description": "Testing minimum tournament size",
    "maxParticipants": 2,
    "createdBy": 1
  }')

tournament2_id=$(echo $create_response | grep -o '"tournamentId":[0-9]*' | grep -o '[0-9]*')

curl -s -X POST $BASE_URL/join -H "Content-Type: application/json" -d "{\"tournamentId\": $tournament2_id, \"userId\": 1}" > /dev/null
curl -s -X POST $BASE_URL/join -H "Content-Type: application/json" -d "{\"tournamentId\": $tournament2_id, \"userId\": 2}" > /dev/null

start_response=$(curl -s -X POST $BASE_URL/start/$tournament2_id)
total_rounds=$(echo $start_response | grep -o '"totalRounds":[0-9]*' | grep -o '[0-9]*')

if [ "$total_rounds" = "1" ]; then
    test_result 0 "Minimum tournament works (1 round for 2 players)"
else
    test_result 1 "Minimum tournament incorrect (got $total_rounds rounds)"
fi
echo ""

echo "📋 Test 13: Error Handling - Insufficient Players"
echo "--------------------------------"
create_response=$(curl -s -X POST $BASE_URL/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tournament - 1 Player",
    "maxParticipants": 8,
    "createdBy": 1
  }')

tournament1_id=$(echo $create_response | grep -o '"tournamentId":[0-9]*' | grep -o '[0-9]*')
curl -s -X POST $BASE_URL/join -H "Content-Type: application/json" -d "{\"tournamentId\": $tournament1_id, \"userId\": 1}" > /dev/null

start_response=$(curl -s -X POST $BASE_URL/start/$tournament1_id)

if echo "$start_response" | grep -q "at least 2 participants"; then
    test_result 0 "Error handling works for insufficient players"
else
    test_result 1 "Error handling failed for insufficient players"
    echo "Response: $start_response"
fi
echo ""

# Summary
echo "================================================"
echo "📊 Test Summary"
echo "================================================"
total_tests=$((TESTS_PASSED + TESTS_FAILED))
pass_rate=$((TESTS_PASSED * 100 / total_tests))

echo ""
echo -e "Total Tests: $total_tests"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo -e "Pass Rate: ${pass_rate}%"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Tournament mode is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
fi
