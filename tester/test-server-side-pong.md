# Test Suite: Server-Side Pong

## Module: Replace Basic Pong with Server-Side Pong
**Points:** 10 (Major)  
**Components:** Physics Engine, WebSocket, Game State  
**Date:** December 5, 2025

---

## Test 1: Pong Engine Initialization

### Objective
Verify Pong game engine initializes correctly.

### Test Steps
1. Create game engine instance
2. Verify initial game state
3. Check paddle positions
4. Check ball position

### Test Commands
```bash
# Unit test
npm test -- --testNamePattern="PongEngine.*init" game-service/

# Manual check in code:
// const engine = new PongEngine();
// console.log(engine.gameWidth);    // Should be 800
// console.log(engine.gameHeight);   // Should be 400
// console.log(engine.ballPosition); // {x: 400, y: 200}
// console.log(engine.paddle1);      // {x: 10, y: 175, height: 50, width: 10}
// console.log(engine.paddle2);      // {x: 780, y: 175, height: 50, width: 10}
```

### Expected Game Dimensions
```
Game Width:  800px
Game Height: 400px
Paddle Width: 10px
Paddle Height: 50px
Ball Radius: 5px

Initial Positions:
Ball: (400, 200) - Center
Paddle 1: (10, 175) - Left
Paddle 2: (780, 175) - Right
```

### Pass Criteria
- Engine initializes without errors
- All properties set correctly
- Paddles positioned at sides
- Ball at center
- Game area correct size

---

## Test 2: Ball Movement and Physics

### Objective
Verify ball moves with correct physics.

### Test Steps
1. Set ball position and velocity
2. Update game state
3. Verify new ball position
4. Check velocity unchanged

### Test Commands
```bash
npm test -- --testNamePattern="ball.*movement|physics"

// Manual physics test:
// Engine setup:
// Ball at (400, 200), velocity (5, 3)
// After 16ms update (typical frame):
// Expected position: (400 + 5, 200 + 3) = (405, 203)

// const engine = new PongEngine();
// engine.setBallVelocity(5, 3);
// engine.update(16); // 16ms delta
// console.log(engine.ballPosition);
// Expected: {x: ~405, y: ~203}
```

### Movement Scenarios
```
Scenario 1: Stationary ball
Velocity: (0, 0)
After 100ms: Position unchanged

Scenario 2: Right moving
Velocity: (10, 0)
After 16ms: x increases by 10, y unchanged

Scenario 3: Diagonal
Velocity: (5, 3)
After 16ms: x += 5, y += 3

Scenario 4: High speed
Velocity: (50, 0)
After 16ms: x += 50 (far right)
```

### Pass Criteria
- Ball position updates correctly
- Physics calculations accurate
- No position jumps
- Velocity consistent
- Delta time handled properly

---

## Test 3: Wall Collision Detection

### Objective
Verify ball bounces off top and bottom walls.

### Test Steps
1. Move ball toward top wall
2. Verify bounce when y < 0
3. Move ball toward bottom wall
4. Verify bounce when y > 400

### Test Commands
```bash
npm test -- --testNamePattern="wall.*collision|bounce"

// Top wall collision:
// engine.ballPosition = {x: 400, y: 3};
// engine.ballVelocity = {x: 5, y: -5}; // Moving up
// engine.update(16);
// Expected: y velocity reverses to (5, 5)

// Bottom wall collision:
// engine.ballPosition = {x: 400, y: 397};
// engine.ballVelocity = {x: 5, y: 5}; // Moving down
// engine.update(16);
// Expected: y velocity reverses to (5, -5)
```

### Pass Criteria
- Ball bounces at y = 0 (top)
- Ball bounces at y = 400 (bottom)
- X velocity unchanged
- Y velocity reverses
- Bounce angle correct

---

## Test 4: Paddle Collision Detection

### Objective
Verify ball bounces off paddles correctly.

### Test Steps
1. Move ball toward paddle
2. Position paddle in collision path
3. Verify collision detection
4. Verify ball direction reverses

### Test Commands
```bash
npm test -- --testNamePattern="paddle.*collision"

// Left paddle collision:
// engine.ballPosition = {x: 20, y: 190};
// engine.ballVelocity = {x: -5, y: 0}; // Moving left
// engine.paddle1 = {x: 10, y: 175, height: 50, width: 10};
// engine.update(16);
// Expected: x velocity reverses to (5, 0)

// Missed paddle (ball goes out):
// engine.ballPosition = {x: 5, y: 190};
// engine.ballVelocity = {x: -5, y: 0};
// engine.paddle1 = {x: 10, y: 175, height: 50, width: 10};
// engine.update(16);
// Expected: game ends, player2 scores
```

### Pass Criteria
- Collision detected when ball hits paddle
- Ball direction reverses (x velocity)
- Ball doesn't pass through paddle
- Collision at correct hitbox
- Miss detected when ball passes

---

## Test 5: Paddle Acceleration

### Objective
Verify paddle motion affects ball trajectory.

### Test Steps
1. Move paddle upward while hitting ball
2. Verify ball gains upward velocity
3. Move paddle downward while hitting ball
4. Verify ball gains downward velocity

### Test Commands
```bash
npm test -- --testNamePattern="paddle.*acceleration|spin"

// Paddle moving up during collision:
// engine.paddle1Velocity = -5; // Moving up
// engine.ballVelocity = {x: -5, y: 0};
// On collision:
// Expected: y velocity becomes negative (upward tilt)
// Example: (5, -1) instead of (5, 0)

// Paddle moving down during collision:
// engine.paddle1Velocity = 5; // Moving down
// engine.ballVelocity = {x: -5, y: 0};
// On collision:
// Expected: y velocity becomes positive (downward tilt)
// Example: (5, 1) instead of (5, 0)
```

### Pass Criteria
- Moving paddle affects ball trajectory
- Upward paddle creates upward trajectory
- Downward paddle creates downward trajectory
- Spin amount proportional to paddle speed
- Effect adds realism to gameplay

---

## Test 6: Scoring System

### Objective
Verify scoring works correctly.

### Test Steps
1. Ball goes off left side (player 2 scores)
2. Verify score incremented
3. Ball goes off right side (player 1 scores)
4. Verify score incremented
5. Check score limits

### Test Commands
```bash
npm test -- --testNamePattern="scoring|score"

// Player 1 scores (ball leaves right):
// engine.ballPosition = {x: 810, y: 200};
// engine.update(16);
// Expected: player1Score++, game state returned

// Player 2 scores (ball leaves left):
// engine.ballPosition = {x: -10, y: 200};
// engine.update(16);
// Expected: player2Score++, game state returned

// Get score:
// const state = engine.getGameState();
// Expected: {score1: 3, score2: 1, ...}
```

### Scoring Rules
```
Ball past x = 800: Player 1 scores (player 2 loses)
Ball past x = 0:   Player 2 scores (player 1 loses)
Win condition: First to 11 points (or configurable)
```

### Pass Criteria
- Score increments on valid out
- Each player's score tracked separately
- Ball resets after scoring
- Game state updated
- Winner determined at score limit

---

## Test 7: Game State Synchronization

### Objective
Verify game state is accurately reported.

### Test Steps
1. Play for several frames
2. Get game state
3. Verify all values correct
4. Send state to client
5. Verify client can render

### Test Commands
```bash
npm test -- --testNamePattern="game.*state"

// Get game state:
// const state = engine.getGameState();
// Expected structure:
// {
//   ball: {x: 400, y: 200},
//   paddle1: {x: 10, y: 175},
//   paddle2: {x: 780, y: 180},
//   score1: 2,
//   score2: 1,
//   winner: null,
//   timestamp: 1234567890
// }

// Verify state is JSON serializable
// JSON.stringify(state);
```

### Pass Criteria
- State contains all game elements
- Positions accurate
- Scores correct
- JSON serializable
- Timestamp accurate

---

## Test 8: WebSocket Communication

### Objective
Verify real-time game state sent via WebSocket.

### Test Steps
1. Connect WebSocket to game endpoint
2. Start game
3. Receive game state updates
4. Verify frequency and timing
5. Measure latency

### Test Commands
```bash
# Browser console test:
const ws = new WebSocket('ws://localhost:3002/ws/game/1');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const gameState = JSON.parse(event.data);
  console.log('Received state:', gameState);
  console.log('Latency:', Date.now() - gameState.timestamp);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// Or test via curl/websocket tools:
wscat -c ws://localhost:3002/ws/game/1
```

### Expected WebSocket Updates
```
Update frequency: 60 FPS (16-17ms intervals)
Message format: JSON game state
Latency: < 50ms typical
Message size: < 200 bytes
```

### Pass Criteria
- WebSocket connects successfully
- Messages received at ~60Hz
- Latency < 50ms
- Messages valid JSON
- Game state complete

---

## Test 9: Paddle Movement Input

### Objective
Verify paddle movement from client input.

### Test Steps
1. Send paddle up command
2. Verify paddle moves up
3. Send paddle down command
4. Verify paddle moves down
5. Test boundary conditions

### Test Commands
```bash
npm test -- --testNamePattern="paddle.*input|movement"

// Simulate client input:
// Client sends: {action: 'paddle1_up'}
// Server receives, updates paddle velocity

// Test paddle boundaries:
// Paddle min Y: 0
// Paddle max Y: 400 - 50 = 350 (height 50)

// Paddle at top:
// engine.paddle1 = {x: 10, y: 0};
// engine.movePaddle1(-5); // Try to move up further
// Expected: y stays at 0 (clamped)

// Paddle at bottom:
// engine.paddle1 = {x: 10, y: 350};
// engine.movePaddle1(5); // Try to move down further
// Expected: y stays at 350 (clamped)
```

### Pass Criteria
- Paddle moves up on input
- Paddle moves down on input
- Paddle doesn't go above y = 0
- Paddle doesn't go below y = 350
- Movement speed reasonable

---

## Test 10: Server-Side Anti-Cheat

### Objective
Verify server validates and rejects invalid moves.

### Test Steps
1. Send normal paddle input
2. Verify accepted
3. Send suspicious input (paddle jump)
4. Verify rejected
5. Test for rapid inputs

### Test Commands
```bash
npm test -- --testNamePattern="anti.*cheat|validation"

// Normal input (accepted):
// {paddleY: 200, timestamp: 1000}
// Calculated velocity = normal

// Suspicious input (rejected):
// {paddleY: 0, timestamp: 1001} // Previous was 200
// Velocity would be 200 pixels/ms - physically impossible
// Expected: rejected or clamped

// Rapid input spam:
// 1000 inputs in 1 second
// Expected: rate-limited or ignored
```

### Anti-Cheat Checks
- Validate paddle position within bounds
- Validate movement speed reasonable
- Check for time-travel (old timestamps)
- Detect paddle position jumps
- Rate limiting on inputs

### Pass Criteria
- Valid inputs accepted
- Invalid inputs rejected
- No exploitable race conditions
- Server-side physics authoritative
- No desync possible

---

## Test 11: Performance and Frame Rate

### Objective
Verify game runs at target frame rate.

### Test Steps
1. Run game for 100 frames
2. Measure time per frame
3. Verify consistent 60 FPS
4. Check for stuttering
5. Monitor CPU usage

### Test Commands
```bash
npm test -- --testNamePattern="performance|fps"

// Browser DevTools test:
npm run dev
// 1. Open DevTools Performance tab
// 2. Start recording
// 3. Play game for 10 seconds
// 4. Stop recording
// 5. Check FPS in results
// Expected: 60 FPS consistently

// Or measure in code:
let frameCount = 0;
let lastTime = Date.now();

while (frameCount < 3600) { // 60 seconds at 60 FPS
  engine.update(16.67);
  frameCount++;
  
  if (frameCount % 60 === 0) {
    const now = Date.now();
    const elapsed = now - lastTime;
    const fps = 1000 / (elapsed / 60);
    console.log(`FPS: ${fps}`);
    lastTime = now;
  }
}
```

### Pass Criteria
- Maintains 60 FPS (±2)
- Frame time ~16.67ms
- No frame drops
- Smooth gameplay
- CPU usage reasonable

---

## Test 12: Full Game Lifecycle

### Objective
Verify complete game from start to finish.

### Test Steps
1. Start new game
2. Connect two players
3. Play until someone wins
4. Verify winner determined
5. Game state cleanup

### Test Commands
```bash
# Manual gameplay test:
npm run dev

// 1. Start multiplayer game
// 2. Connect two clients/browsers
// 3. Play game
// 4. Win condition (first to 11 points or match end)
// 5. Verify winner announcement
// 6. Verify stats recorded

// Or API test:
// POST /api/games/start
// WS /ws/game/:id
// POST /api/games/:id/move
// GET /api/games/:id/winner
```

### Complete Game Flow
```
1. Game starts (score 0-0)
2. Players exchange hits
3. Someone scores (1-0)
4. Continue playing
5. First to 11 wins
6. Winner announced
7. Game ended
8. Stats recorded
9. Players can start new game
```

### Pass Criteria
- Game starts successfully
- Players move paddles
- Ball travels correctly
- Scoring works
- Winner determined at threshold
- Game ends cleanly
- Stats saved

---

## Summary

**Server-Side Pong:** ✅  
**Key Components:** Physics Engine, WebSocket, Anti-Cheat  
**Total Tests:** 12  
**Pass Criteria:** All 12 must pass

### Quick Test Commands
```bash
# Unit tests
npm test -- --testNamePattern="Pong"

# Integration test (manual gameplay)
npm run dev
# Browser: Start multiplayer game, play to completion

# Performance test
npm run dev
# DevTools: Performance tab, record gameplay
```

### Expected Test Results
```
Pong Engine Test Suite
  ✓ Engine initialization
  ✓ Ball movement physics
  ✓ Wall collision detection
  ✓ Paddle collision detection
  ✓ Paddle acceleration
  ✓ Scoring system
  ✓ Game state synchronization
  ✓ WebSocket communication
  ✓ Paddle movement input
  ✓ Server-side anti-cheat
  ✓ Performance and frame rate
  ✓ Full game lifecycle

12 passing
```

---

*Test Suite Created: December 5, 2025*
