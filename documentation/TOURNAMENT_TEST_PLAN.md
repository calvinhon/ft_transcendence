# Tournament Mode Test Plan

## Test Overview
This document outlines the comprehensive testing strategy for the tournament mode implementation.

## 1. Backend Tests (tournament-service)

### 1.1 Bracket Generation Algorithm
**Test Case: 2 Players**
- Input: 2 participants
- Expected: 1 match (Final)
- Rounds: 1

**Test Case: 4 Players**
- Input: 4 participants
- Expected: 3 matches total (2 semi-finals, 1 final)
- Rounds: 2

**Test Case: 8 Players**
- Input: 8 participants
- Expected: 7 matches total (4 quarter-finals, 2 semi-finals, 1 final)
- Rounds: 3

**Test Case: 3 Players (Non-Power-of-2)**
- Input: 3 participants
- Expected: 2 matches with 1 BYE
- Bracket size: 4
- Player with BYE advances automatically

**Test Case: 5 Players (Non-Power-of-2)**
- Input: 5 participants
- Expected: 4 matches with 3 BYEs
- Bracket size: 8

### 1.2 Tournament Creation
```bash
# Test: Create tournament
curl -X POST http://localhost:3003/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tournament",
    "description": "Testing bracket generation",
    "maxParticipants": 8,
    "createdBy": 1
  }'

# Expected Response:
{
  "message": "Tournament created successfully",
  "tournamentId": 1
}
```

### 1.3 Join Tournament
```bash
# Test: Join tournament
curl -X POST http://localhost:3003/join \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": 1,
    "userId": 1
  }'

# Expected Response:
{
  "message": "Successfully joined tournament"
}
```

### 1.4 Start Tournament
```bash
# Test: Start tournament with 4 players
curl -X POST http://localhost:3003/start/1 \
  -H "Content-Type: application/json"

# Expected Response:
{
  "message": "Tournament started successfully",
  "totalRounds": 2,
  "firstRoundMatches": 2
}
```

### 1.5 Match Progression
```bash
# Test: Record match result
curl -X POST http://localhost:3003/match/result \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": 1,
    "winnerId": 1,
    "player1Score": 8,
    "player2Score": 5
  }'

# Expected:
# - Match marked as completed
# - If all round matches complete, next round created automatically
# - If final match, tournament marked as finished
```

### 1.6 Blockchain Recording
```bash
# Test: Record tournament on blockchain
curl -X POST http://localhost:3003/blockchain/record \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": 1,
    "winnerId": 1
  }'

# Expected Response:
{
  "message": "Tournament recorded on blockchain successfully",
  "transactionHash": "0x...",
  "participants": 4,
  "winner": 1
}
```

## 2. Frontend Tests

### 2.1 Tournament Creation Modal
**Test Steps:**
1. Login to application
2. Navigate to Play Config screen
3. Click Tournament mode tab
4. Verify tournament party frame appears
5. Click "Add Player" button
6. Add 2-3 local players
7. Verify players appear in tournament local players list

**Expected Results:**
- Host appears automatically (cannot be unchecked)
- Local players from party list show with checkboxes
- Participant count updates dynamically
- Max participants can be selected (2, 4, 8, 16)

### 2.2 Tournament Creation with Party List
**Test Steps:**
1. With 3 local players added to party
2. Click "Create Tournament" (if button exists) or start tournament
3. Open tournament creation modal
4. Check 2 local players
5. Set tournament name: "Test Tournament"
6. Set max participants: 4
7. Click "Create & Start"

**Expected Results:**
- Tournament created with 3 participants (host + 2 selected)
- All 3 players automatically joined
- Tournament started immediately
- Bracket modal opens showing matches
- Round 1 has 1 match with 1 BYE (since 3 is not power-of-2)

### 2.3 Bracket Visualization
**Test Steps:**
1. After creating tournament
2. Verify bracket modal displays

**Expected Results:**
- Tournament name shown in header
- Status badge shows "ACTIVE"
- Participant count correct
- Rounds displayed horizontally (Round 1, Semi-Finals, Final, etc.)
- Each match shows:
  - Match number
  - Player names (or "BYE")
  - Scores (0-0 for pending)
  - "Play Match" button for pending matches
  - Green highlight for completed matches with winner

### 2.4 Match Execution
**Test Steps:**
1. Click "Play Match" on a pending match
2. Verify game launches with tournament mode
3. Play the match until completion

**Expected Results:**
- Bracket modal closes
- Game screen opens
- Game plays normally with tournament settings
- Game end shows gold trophy message
- Match result recorded automatically
- Winner advances to next round
- Bracket modal reopens showing updated status

### 2.5 Tournament Completion
**Test Steps:**
1. Complete all matches until final
2. Win the final match

**Expected Results:**
- Tournament status changes to "FINISHED"
- Winner badge displays with trophy emoji
- "Record on Blockchain" button appears
- All matches show completed status
- Champion highlighted in bracket

### 2.6 Blockchain Recording
**Test Steps:**
1. After tournament completes
2. Click "Record on Blockchain" button

**Expected Results:**
- Loading indicator (optional)
- Success message with transaction hash
- Transaction hash shown (shortened, e.g., "0x1234...5678")
- Data permanently stored on blockchain

## 3. Integration Tests

### 3.1 Full Tournament Flow (4 Players)
**Scenario:** Host + 3 local players
1. Add 3 local players to party
2. Create tournament, select all 3 local players
3. Start tournament
4. Verify 2 matches in Round 1
5. Play and complete both Round 1 matches
6. Verify Final match created automatically
7. Play and complete Final
8. Verify winner determined
9. Record on blockchain
10. Verify transaction hash returned

**Expected Duration:** ~15-20 minutes
**Pass Criteria:** All steps complete without errors

### 3.2 Edge Case: 3 Players with BYE
**Scenario:** Non-power-of-2 participants
1. Add 2 local players only (3 total with host)
2. Create tournament
3. Verify bracket shows 2 matches:
   - Match 1: Player 1 vs Player 2
   - Match 2: Player 3 vs BYE (auto-win)
4. Play Match 1
5. Verify winner of Match 1 faces Player 3 in Final
6. Complete Final
7. Record winner

**Expected Duration:** ~10 minutes
**Pass Criteria:** BYE handled correctly, progression works

### 3.3 Edge Case: Minimum Tournament (2 Players)
**Scenario:** Smallest possible tournament
1. No local players (just host)
2. Cannot create tournament - need at least 2 players
3. Add 1 local player
4. Create tournament
5. Verify only 1 match (Final)
6. Play match
7. Winner determined immediately

**Expected Duration:** ~5 minutes
**Pass Criteria:** Minimum tournament works correctly

## 4. Performance Tests

### 4.1 Large Tournament (16 Players)
**Test:**
- Create tournament with 16 players
- Verify 15 matches generated (8+4+2+1)
- Check bracket rendering performance
- Complete all matches sequentially

**Pass Criteria:**
- Bracket renders in < 1 second
- No UI lag
- All matches complete correctly

### 4.2 Concurrent Tournaments
**Test:**
- Create 3 tournaments simultaneously
- Start matches in different tournaments
- Verify no data mixing

**Pass Criteria:**
- Each tournament maintains separate state
- No cross-tournament contamination

## 5. Error Handling Tests

### 5.1 Insufficient Players
**Test:** Try to start tournament with 0-1 participants
**Expected:** Error message "Need at least 2 participants"

### 5.2 Blockchain Service Down
**Test:** Stop hardhat-node, try to record tournament
**Expected:** Error message "Blockchain service unavailable"

### 5.3 Network Interruption During Match
**Test:** Disconnect websocket during tournament match
**Expected:** 
- Graceful error handling
- User notified
- Match result not recorded (can replay)

### 5.4 Invalid Match Result
**Test:** Try to record result for non-existent match
**Expected:** 404 error with appropriate message

## 6. Database Tests

### 6.1 Tournament Data Persistence
**Test:**
1. Create tournament
2. Restart tournament-service
3. Fetch tournament details

**Expected:** Tournament data persists correctly

### 6.2 Match History
**Test:**
1. Complete tournament
2. Query tournament_matches table
3. Verify all matches recorded with correct:
   - Round numbers
   - Player IDs
   - Scores
   - Winner IDs
   - Timestamps

## 7. Regression Tests

### 7.1 Co-op Mode Unaffected
**Test:** Play co-op mode after tournament implementation
**Expected:** Works exactly as before, no changes

### 7.2 Arcade Mode Unaffected
**Test:** Play arcade mode after tournament implementation
**Expected:** Works exactly as before, no changes

## Test Execution Checklist

- [ ] Backend unit tests pass
- [ ] Bracket generation algorithm verified for all cases
- [ ] Tournament creation API works
- [ ] Match progression automated correctly
- [ ] Blockchain integration functional
- [ ] Frontend modal displays correctly
- [ ] Party list integration works
- [ ] Match execution flow complete
- [ ] Bracket visualization accurate
- [ ] Tournament completion detected
- [ ] Blockchain recording successful
- [ ] Co-op mode regression test passes
- [ ] Arcade mode regression test passes
- [ ] Error handling comprehensive
- [ ] Performance acceptable

## Known Issues / Limitations

1. **Online Players:** Currently only local players supported (matchmaking TODO)
2. **TypeScript Errors:** Backend has configuration-related TS errors (don't affect runtime)
3. **Blockchain:** Using mock/dev keys - needs real wallet integration for production
4. **Transaction Confirmation:** Currently waits for 1 confirmation - may want configurable

## Success Criteria

✅ All backend APIs return correct responses
✅ Bracket generation algorithm handles all participant counts
✅ Match progression automatic and correct
✅ Frontend displays brackets accurately
✅ Match execution integrates with game service
✅ Tournament completion detected
✅ Blockchain recording successful with tx hash
✅ Co-op and arcade modes unchanged
✅ No critical bugs or errors
✅ User experience smooth and intuitive
