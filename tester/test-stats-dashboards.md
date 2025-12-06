# Test Suite: User/Game Stats Dashboards

## Module: User/Game Stats Dashboards
**Points:** 5 (Minor)  
**Frontend:** TypeScript  
**Backend:** Fastify microservices  
**Date:** December 5, 2025

---

## Test 1: Profile Dashboard Loading

### Objective
Verify profile dashboard loads and displays user stats.

### Test Steps
1. Login with user account
2. Navigate to profile
3. Wait for stats to load
4. Verify all stats displayed

### Test Commands
```bash
# Manual browser test:
npm run dev
// 1. Login with existing credentials
// 2. Click profile icon/menu
// 3. Check profile page loads
// 4. Verify stats section displayed
// 5. Check no loading errors
```

### Expected UI Elements
```
✅ User avatar displayed
✅ Username shown
✅ Total games counter
✅ Wins/Losses breakdown
✅ Win percentage
✅ Average score
✅ Personal best (high score)
✅ Total ranking points
✅ Join date
```

### Pass Criteria
- Dashboard loads within 2 seconds
- All stats elements visible
- No "undefined" values
- Proper formatting (percentages, numbers)

---

## Test 2: Stats Calculation - Win Rate

### Objective
Verify win rate percentage is calculated correctly.

### Test Steps
1. Get user's wins and total games
2. Calculate expected win rate
3. Compare with displayed value
4. Test various scenarios

### Test Scenarios
```
Scenario 1: 3 wins, 7 losses (10 total)
Expected: 30%

Scenario 2: 5 wins, 5 losses (10 total)
Expected: 50%

Scenario 3: 9 wins, 1 loss (10 total)
Expected: 90%

Scenario 4: 0 wins, 10 losses
Expected: 0%

Scenario 5: 1 game total (1 win)
Expected: 100%
```

### Test Command
```bash
# Backend API test:
curl -X GET "http://localhost:3004/stats/user/1" \
  -H "Authorization: Bearer $TOKEN" | jq '.stats | {wins, losses, winRate}'

# Expected output:
# {
#   "wins": 3,
#   "losses": 7,
#   "winRate": 30
# }
```

### Pass Criteria
- Win rate = (wins / total games) * 100
- Rounded to nearest integer
- Handles edge cases (0 games)
- Accurate to 1% precision

---

## Test 3: Stats Update After Game

### Objective
Verify stats update correctly after game completion.

### Test Steps
1. Record initial stats
2. Play and complete a game
3. Wait for stats update
4. Verify changes reflected

### Test Commands
```bash
# Get initial stats
INITIAL=$(curl -s "http://localhost:3004/stats/user/1" \
  -H "Authorization: Bearer $TOKEN" | jq '.stats')
echo "Initial: $INITIAL"

# Play a game (simulated or actual)
# [Game completes]

sleep 2 # Wait for update propagation

# Get updated stats
UPDATED=$(curl -s "http://localhost:3004/stats/user/1" \
  -H "Authorization: Bearer $TOKEN" | jq '.stats')
echo "Updated: $UPDATED"

# Verify change
echo "Games changed: $(($UPDATED_GAMES - $INITIAL_GAMES))"
```

### Expected Results
```
Before: totalGames=10, wins=3, losses=7
After (Win): totalGames=11, wins=4, losses=7
After (Loss): totalGames=11, wins=3, losses=8
```

### Pass Criteria
- Stats update within 5 seconds
- Total games incremented by 1
- Wins or losses incremented accordingly
- Win rate recalculated
- Timestamp updated

---

## Test 4: Average Score Calculation

### Objective
Verify average score is calculated correctly.

### Test Steps
1. Get all game scores for user
2. Calculate manual average
3. Compare with displayed value
4. Test edge cases

### Test Scenarios
```
Scenario 1:
Games: [5, 10, 15]
Expected Average: 10

Scenario 2:
Games: [7, 8, 9, 10]
Expected Average: 8.5

Scenario 3:
Games: [11]
Expected Average: 11

Scenario 4:
Games: [0, 0, 0, 0, 0]
Expected Average: 0
```

### Test Command
```bash
# Get detailed stats
curl -X GET "http://localhost:3004/stats/user/1/games" \
  -H "Authorization: Bearer $TOKEN" | jq '.games'

# Manual calculation in bash
SCORES="[5, 10, 15]"
AVERAGE=$(echo "$SCORES" | jq 'add / length')
echo "Calculated average: $AVERAGE"
```

### Pass Criteria
- Average calculated as sum / count
- Rounded to 1 decimal place
- Handles all scores correctly
- Shows 0 if no games

---

## Test 5: High Score Tracking

### Objective
Verify personal best (high score) is tracked.

### Test Steps
1. Check current high score
2. Play game with higher score
3. Verify high score updates
4. Play game with lower score
5. Verify high score unchanged

### Test Commands
```bash
# Get profile before games
curl -X GET "http://localhost:3004/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '.highScore'

# After playing games and checking again
# [Play game 1: Score 100]
# [Play game 2: Score 150] → Should become new high score
# [Play game 3: Score 75] → High score stays at 150
```

### Pass Criteria
- High score updates on new maximum
- High score unchanged on lower scores
- First game becomes high score
- Negative scores handled

---

## Test 6: Leaderboard Display

### Objective
Verify global leaderboard shows top players correctly.

### Test Steps
1. Navigate to leaderboard
2. Verify rankings displayed
3. Check sorting (highest first)
4. Verify current user position

### Test Commands
```bash
# Manual browser test:
npm run dev
// 1. Navigate to Leaderboard page
// 2. Verify top 10 players shown
// 3. Check ordering (1st place at top)
// 4. Verify current user highlighted/shown
// 5. Check pagination works

# API test:
curl -X GET "http://localhost:3004/leaderboard?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.leaderboard'
```

### Expected Response
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "username": "player1",
      "points": 2500,
      "wins": 45,
      "losses": 5
    },
    {
      "rank": 2,
      "username": "player2",
      "points": 2300,
      "wins": 42,
      "losses": 8
    }
    ...
  ]
}
```

### Pass Criteria
- Leaderboard loads correctly
- Sorted by points (descending)
- Ranks numbered sequentially
- User position shown
- Top 10 displayed by default

---

## Test 7: Player Comparison

### Objective
Verify stats comparison between players works.

### Test Steps
1. View own profile
2. View another player's profile
3. Compare statistics side-by-side
4. Verify all stats compare correctly

### Test Commands
```bash
# Get player 1 stats
PLAYER1=$(curl -s "http://localhost:3004/stats/user/1" \
  -H "Authorization: Bearer $TOKEN" | jq '.stats')

# Get player 2 stats
PLAYER2=$(curl -s "http://localhost:3004/stats/user/2" \
  -H "Authorization: Bearer $TOKEN" | jq '.stats')

echo "Player 1: $PLAYER1"
echo "Player 2: $PLAYER2"
```

### Comparison Elements
- Win rate comparison
- Total games comparison
- Average score comparison
- High score comparison
- Head-to-head record

### Pass Criteria
- Both profiles load
- Stats displayed side-by-side
- Comparison is accurate
- Formatting consistent

---

## Test 8: Stats Pagination

### Objective
Verify large datasets paginate correctly.

### Test Steps
1. Get leaderboard with pagination
2. Request different page numbers
3. Verify correct records returned
4. Check page info

### Test Commands
```bash
# Get page 1
curl -X GET "http://localhost:3004/leaderboard?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.pagination'

# Get page 2
curl -X GET "http://localhost:3004/leaderboard?page=2&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.pagination'

# Expected pagination info:
# {
#   "page": 1,
#   "limit": 10,
#   "total": 150,
#   "pages": 15
# }
```

### Pass Criteria
- Correct page returned
- Correct number of records
- No duplicate records across pages
- Total count accurate
- Page numbers sequential

---

## Test 9: Stats Data Consistency

### Objective
Verify stats are consistent across all views.

### Test Steps
1. Get stats from profile endpoint
2. Get stats from leaderboard endpoint
3. Get stats from game history endpoint
4. Verify all match

### Test Commands
```bash
# Profile endpoint
PROFILE=$(curl -s "http://localhost:3004/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '.stats')

# Leaderboard endpoint
LEADERBOARD=$(curl -s "http://localhost:3004/leaderboard" \
  -H "Authorization: Bearer $TOKEN" | jq '.leaderboard[0].stats')

# Game history endpoint
HISTORY=$(curl -s "http://localhost:3004/games" \
  -H "Authorization: Bearer $TOKEN" | jq '.calculatedStats')

# Compare
diff <(echo "$PROFILE") <(echo "$LEADERBOARD")
diff <(echo "$PROFILE") <(echo "$HISTORY")
```

### Pass Criteria
- All stats match
- No data inconsistencies
- Single source of truth
- Updates synchronized

---

## Test 10: Real-time Stats Updates

### Objective
Verify stats update in real-time (if WebSocket implemented).

### Test Steps
1. Open profile page in one window
2. Play game in another window
3. Observe stats update without refresh
4. Verify timing

### Test Commands
```bash
# Manual browser test:
// Window 1: Profile page (stay open)
// Window 2: Play a game to completion
// Check if Window 1 updates automatically

// Or check WebSocket in DevTools:
// Network tab > WS filter
// Should see real-time updates
```

### Pass Criteria
- Stats update without page refresh
- Update appears within 2 seconds of game end
- WebSocket connection maintained
- No excessive updates

---

## Test 11: Performance with Large Datasets

### Objective
Verify dashboards perform well with many games/players.

### Test Steps
1. Create test data (100+ games, 50+ players)
2. Load leaderboard
3. Load profile with many games
4. Measure response time
5. Verify rendering speed

### Test Commands
```bash
# Load leaderboard with many players
time curl -s "http://localhost:3004/leaderboard?limit=100" \
  -H "Authorization: Bearer $TOKEN" | wc -c

# Expected:
# real 0m0.250s (< 250ms)

# Manual browser test:
npm run dev
// DevTools Network tab
// Filter to profile endpoint
// Check response time < 500ms
// Check render time < 1 second
```

### Pass Criteria
- API response < 500ms
- Page render < 1 second
- No memory leaks
- Smooth scrolling with pagination

---

## Test 12: Mobile/Responsive Dashboard

### Objective
Verify dashboards work on mobile devices.

### Test Steps
1. Open profile on mobile viewport
2. Check layout (stack vs side-by-side)
3. Test leaderboard on mobile
4. Verify touch interactions

### Test Commands
```bash
# Browser DevTools mobile test:
npm run dev
// 1. DevTools > Device Toggle
// 2. Select iPhone/Android
// 3. Load profile page
// 4. Check layout is responsive
// 5. Verify readable without horizontal scroll
// 6. Test touch interactions
```

### Expected Mobile Behavior
- Stats stack vertically
- Numbers readable at mobile size
- Buttons tappable (44px+ minimum)
- No horizontal scrolling
- Leaderboard scrollable vertically

### Pass Criteria
- Layout responsive on all sizes
- Content readable
- Touch targets appropriate size
- No overflow
- Fast performance on mobile

---

## Summary

**Dashboard Module:** ✅  
**Components:** Profile, Leaderboard, Stats  
**Total Tests:** 12  
**Pass Criteria:** All 12 must pass

### Quick Test Commands
```bash
# API tests
curl -X GET http://localhost:3004/profile -H "Authorization: Bearer $TOKEN" | jq
curl -X GET http://localhost:3004/leaderboard -H "Authorization: Bearer $TOKEN" | jq
curl -X GET http://localhost:3004/stats/user/1 -H "Authorization: Bearer $TOKEN" | jq

# Browser tests
npm run dev
// Login > Profile page > Check display
// Navigate to Leaderboard > Verify rankings
```

### Expected Test Results
```
Stats Dashboard Test Suite
  ✓ Profile dashboard loading
  ✓ Win rate calculation
  ✓ Stats update after game
  ✓ Average score calculation
  ✓ High score tracking
  ✓ Leaderboard display
  ✓ Player comparison
  ✓ Stats pagination
  ✓ Data consistency
  ✓ Real-time updates
  ✓ Large dataset performance
  ✓ Mobile responsiveness

12 passing
```

---

*Test Suite Created: December 5, 2025*
