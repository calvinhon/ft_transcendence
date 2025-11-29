# Frontend Debug Documentation

## Arcade Mode AI Selection Fix

### Issue
In arcade mode, the AI bot was not selected by default in team2, requiring users to manually select it each time they entered arcade mode. This created a poor user experience as users expected the AI to be ready to play immediately.

### Root Cause
The `setupArcadeMode()` method in `app.ts` was explicitly removing the AI player from the selected players set and removing the 'active' class from the AI player card.

### Solution
Modified the `setupArcadeMode()` method to:
1. Add the 'active' class to the AI player card
2. Add 'ai-player' to the selectedPlayerIds set

This ensures the AI bot is highlighted/selected in team2 by default when entering arcade mode.

### Code Changes
**File:** `frontend/src/app.ts`
**Method:** `setupArcadeMode()`

```typescript
// Before (removing AI selection):
if (aiPlayerCard) {
  aiPlayerCard.classList.remove('active');
  this.selectedPlayerIds.delete('ai-player');
}

// After (adding AI selection):
if (aiPlayerCard) {
  aiPlayerCard.classList.add('active');
  this.selectedPlayerIds.add('ai-player');
}
```

### Testing
- Frontend builds successfully without errors
- Frontend service tests pass
- AI player card is now active/highlighted in team2 by default in arcade mode
- Users can still manually move the AI between teams using drag-and-drop
- Host player remains selected in team1 by default

### Impact
- Improved user experience in arcade mode
- Eliminates the need for manual AI selection
- Maintains all existing functionality (drag-and-drop, team management, etc.)

---

## Arcade Mode Logging Spam Fix

### Issue
In arcade mode, excessive console logging was causing performance issues and visual artifacts. The "🎮 [ARCADE-INPUT] 🔍 Player Detection:" message and related logs were being printed every frame (60 times per second), creating massive console spam and potentially impacting game performance.

### Root Cause
The `handleArcadeInputs()` method in `game.ts` was logging player detection information every time the input handler ran (at 60fps), rather than only when the player detection actually changed.

### Solution
Added throttling to the arcade input logging:
1. Added `lastPlayerDetectionLogTime` property to track when logging last occurred
2. Wrapped all player detection logging in a time-based check (1000ms throttle)
3. Only log player detection information once per second instead of 60 times per second

### Code Changes
**File:** `frontend/src/game.ts`
**Properties Added:**
```typescript
private lastPlayerDetectionLogTime: number = 0; // Track when we last logged player detection
```

**Method:** `handleArcadeInputs()`

```typescript
// Before (logging every frame):
console.log('🎮 [ARCADE-INPUT] 🔍 Player Detection:');
console.log('  - selectedPlayerIds:', Array.from(app.selectedPlayerIds));
console.log('  - hostUser:', hostUser);
// ... more logs every 16ms

// After (throttled logging):
const now = Date.now();
if (!this.lastPlayerDetectionLogTime || now - this.lastPlayerDetectionLogTime > 1000) {
  console.log('🎮 [ARCADE-INPUT] 🔍 Player Detection:');
  console.log('  - selectedPlayerIds:', Array.from(app.selectedPlayerIds));
  console.log('  - hostUser:', hostUser);
  // ... logs only once per second
  this.lastPlayerDetectionLogTime = now;
}
```

### Testing
- Frontend builds successfully without errors
- Console logging is now throttled to once per second instead of 60 times per second
- Player detection information is still available for debugging when needed
- Game performance improved by reducing excessive logging overhead
- All arcade mode functionality remains intact

### Impact
- Eliminated console spam in arcade mode
- Improved game performance by reducing logging overhead
- Maintained debugging capabilities with throttled logging
- Fixed visual artifacts potentially caused by excessive logging

---

## Previous Issues (Multiple Game Instances)

### Issue
Repeating "🎨 [RENDER] Paddle setup:" logs were causing multiple balls and paddles to appear on screen, creating overlapping game instances.

### Root Cause
Duplicate `connectionAck` messages from the WebSocket were triggering multiple `joinBotGame` sends, causing the backend to create multiple game instances simultaneously.

### Solution Implemented
Added a guard flag `hasSentJoinBotGame` to prevent duplicate game creation messages:

1. **Flag Initialization:** Set to `false` when game starts or resets
2. **Guard Check:** Only send `joinBotGame` if flag is `false`
3. **Flag Set:** Set flag to `true` after sending the message
4. **Reset Points:** Reset flag on game end, disconnect, or new game start

### Code Changes
**File:** `frontend/src/game.ts`
**Class:** `GameManager`

- Added `hasSentJoinBotGame: boolean = false;` property
- Modified `handleGameMessage()` to check flag before sending `joinBotGame`
- Added flag resets in `stopGame()`, `disconnect()`, and game initialization

### Prevention Measures
- Guard flag prevents duplicate WebSocket messages
- Proper flag reset ensures legitimate game restarts work
- Comprehensive logging for debugging future issues

### Testing Results
- Single game instances confirmed (no overlapping elements)
- Smooth rendering at 60fps maintained
- Pause/resume functionality works without visual artifacts
- Console logging throttled to prevent spam
- Frontend builds and runs successfully

---

## Tournament Mode Player 2 Controls Fix

### Issue
In tournament matches, player 2 (right side) was not responding to control keys (U/J). The paddle on the right side would not move, making it impossible for player 2 to play.

### Root Cause
The `handleTournamentInputs()` method in `game.ts` was sending `playerId: 2` for player 2 controls, but the backend expected the actual user ID of player 2, not the hardcoded value `2`. Additionally, the backend's `movePaddle` logic assumed player IDs were `1` or `2`, but tournament players have arbitrary user IDs.

### Solution
1. **Frontend Fix:** Modified `handleTournamentInputs()` to send the actual `player2Id` from `currentTournamentMatch` instead of hardcoded `2`.
2. **Backend Fix:** Updated `movePaddle()` in `game-logic.ts` to determine the correct paddle index for tournament mode when none is provided, based on matching the player ID with `player1.userId` or `player2.userId`.

### Code Changes
**File:** `frontend/src/game.ts`
**Method:** `handleTournamentInputs()`

```typescript
// Before (hardcoded playerId: 2):
this.websocket?.send(JSON.stringify({
  type: 'movePaddle',
  playerId: 2,
  direction: 'up'
}));

// After (using actual player2Id):
const player2Id = this.currentTournamentMatch?.player2Id;
this.websocket?.send(JSON.stringify({
  type: 'movePaddle',
  playerId: player2Id,
  direction: 'up'
}));
```

**File:** `game-service/src/routes/modules/game-logic.ts`
**Method:** `movePaddle()`

```typescript
// Added logic to determine paddleIndex for tournament mode:
let actualPaddleIndex = paddleIndex;
if (this.gameSettings.gameMode === 'tournament' && actualPaddleIndex === undefined) {
  if (playerId === this.player1.userId) {
    actualPaddleIndex = 0; // Player 1 controls team1 paddle 0
  } else if (playerId === this.player2.userId) {
    actualPaddleIndex = 0; // Player 2 controls team2 paddle 0
  } else {
    logger.gameDebug(this.gameId, 'Unknown playerId for tournament movePaddle:', playerId);
    return;
  }
}
```

### Testing
- Frontend builds successfully without errors
- Tournament matches now allow both players to control their paddles
- Player 1 uses W/S keys (left paddle moves)
- Player 2 uses U/J keys (right paddle moves)
- Game physics and scoring work correctly for both players
- Tournament bracket progression functions properly

### Impact
- Fixed tournament mode gameplay for player 2
- Both players can now fully participate in tournament matches
- Maintains all existing tournament functionality
- No impact on other game modes (coop, arcade)</content>
<parameter name="filePath">/home/honguyen/ft_transcendence/documentation/debug_frontend.md