# Game Service - Complete Beginner's Guide

## 📚 Table of Contents
1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Core Concepts](#core-concepts)
4. [Code Structure](#code-structure)
5. [Game Physics Engine](#game-physics-engine)
6. [AI System](#ai-system)
7. [WebSocket Communication](#websocket-communication)
8. [Game State Management](#game-state-management)
9. [Key Algorithms](#key-algorithms)
10. [Code Examples](#code-examples)

---

## Introduction

The Game Service is the heart of the Pong game implementation. It handles:
- Real-time multiplayer gameplay via WebSockets
- Game physics simulation (ball movement, collision detection)
- AI opponents with multiple difficulty levels
- Game state synchronization across all connected players
- Matchmaking and tournament integration

**Technology Stack:**
- **TypeScript**: Type-safe JavaScript for better code quality
- **Fastify**: Fast web framework for Node.js
- **WebSocket**: Real-time bidirectional communication
- **SQLite**: Lightweight database for game history

---

## Architecture Overview

```
game-service/
├── src/
│   ├── server.ts              # Main entry point
│   └── routes/
│       ├── index.ts           # Route registration
│       └── modules/
│           ├── types.ts       # TypeScript interfaces
│           ├── game-physics.ts    # Ball & collision physics
│           ├── game-ai.ts         # Bot intelligence
│           ├── game-logic.ts      # Core game loop
│           ├── game-state.ts      # State management
│           ├── websocket.ts       # WebSocket handlers
│           ├── matchmaking-service.ts  # Player matching
│           └── game-history-service.ts # Database operations
```

### Service Flow
```
Client → WebSocket Connection → Game State → Physics Engine → AI → Broadcast → Clients
```

---

## Core Concepts

### 1. **Game Loop**
The game loop runs at **60 FPS (frames per second)**, meaning the game state updates 60 times every second.

```typescript
// Simplified game loop
setInterval(() => {
    // 1. Update ball position
    physics.updateBall(ball, paddles);
    
    // 2. Move AI paddles
    ai.moveBotPaddle(paddles);
    
    // 3. Check for scoring
    if (ball.x < 0 || ball.x > 800) {
        handleScore();
    }
    
    // 4. Broadcast to all players
    broadcast(gameState);
}, 1000 / 60); // 60 FPS = ~16.67ms per frame
```

### 2. **Coordinate System**
- **Canvas**: 800px wide × 600px tall
- **Origin (0,0)**: Top-left corner
- **X-axis**: Horizontal (0 = left, 800 = right)
- **Y-axis**: Vertical (0 = top, 600 = bottom)

```
(0,0) ───────────────────→ (800,0)
  │                           │
  │      Game Canvas          │
  │      800 × 600            │
  │                           │
  ↓                           ↓
(0,600) ─────────────────→ (800,600)
```

### 3. **Key Data Structures**

```typescript
// Ball represents the game ball
interface Ball {
    x: number;      // Position X (0-800)
    y: number;      // Position Y (0-600)
    dx: number;     // Velocity X (speed in x direction)
    dy: number;     // Velocity Y (speed in y direction)
    frozen?: boolean; // Is ball movement paused?
}

// Paddle represents a player's paddle
interface Paddle {
    x: number;       // Position X (fixed at 50 or 750)
    y: number;       // Position Y (top of paddle)
    vy?: number;     // Velocity Y (for flick physics)
    height?: number; // Paddle height (default 100px)
}

// Game state contains everything
interface GameState {
    gameId: number;
    ball: Ball;
    paddles: Paddles;
    scores: { player1: number; player2: number };
    status: 'waiting' | 'countdown' | 'active' | 'paused' | 'ended';
}
```

---

## Code Structure

### Server Entry Point (`server.ts`)

```typescript
import websocket from '@fastify/websocket';
import gameRoutes from './routes';

async function start(): Promise<void> {
    const server = await createServer(serverConfig, async (fastify) => {
        // Register WebSocket plugin for real-time communication
        await fastify.register(websocket);
        
        // Register game routes
        await fastify.register(gameRoutes);
    });
    
    await server.start();
}
```

**Key Points:**
- Uses Fastify (fast web framework)
- Registers WebSocket plugin for real-time communication
- Listens on port 3000
- Includes HTTPS with self-signed certificates

---

## Game Physics Engine

The physics engine handles ball movement, collisions, and powerups.

### Ball Movement Algorithm

```typescript
// Every frame (~16ms), update ball position
updateBall(ball: Ball, paddles: Paddles) {
    // Move ball based on velocity
    ball.x += ball.dx;  // dx = horizontal speed
    ball.y += ball.dy;  // dy = vertical speed
    
    // Collision with top/bottom walls
    if (ball.y <= 0 || ball.y >= 600) {
        ball.dy = -ball.dy;  // Reverse vertical direction
    }
    
    // Check paddle collision
    if (ballHitsPaddle(ball, paddles.player1)) {
        ball.dx = Math.abs(ball.dx); // Bounce right
        if (accelerateOnHit) {
            ball.dx *= 1.05; // Speed up by 5%
            ball.dy *= 1.05;
        }
    }
    
    // Check scoring
    if (ball.x < 0) return { scored: true, scorer: 'player2' };
    if (ball.x > 800) return { scored: true, scorer: 'player1' };
}
```

### Collision Detection: Swept Circle Algorithm

**Problem**: At high speeds, the ball can "tunnel" through paddles between frames.

**Solution**: Swept collision detection checks the entire path between frames.

```typescript
checkSweptPaddleCollision(ball: Ball, prevX: number, prevY: number, paddles: Paddles) {
    // 1. Define the ball's path as a line segment
    const ballPath = { start: { x: prevX, y: prevY }, end: { x: ball.x, y: ball.y } };
    
    // 2. Check if path intersects paddle rectangle
    const paddle = paddles.player1;
    const paddleRect = {
        left: paddle.x - 10,
        right: paddle.x + 10,
        top: paddle.y,
        bottom: paddle.y + paddle.height
    };
    
    // 3. Find intersection point
    if (lineIntersectsRect(ballPath, paddleRect)) {
        // 4. Bounce the ball
        ball.dx = -ball.dx;
        ball.dy += (ball.y - paddle.y - paddle.height/2) * 0.1; // Add spin
        
        return { collided: true };
    }
    
    return { collided: false };
}
```

**Why it works:**
- Even if ball moves 50px in one frame, we check the entire 50px path
- Prevents "tunneling" through thin objects
- More accurate than simple position checking

### Powerup System

```typescript
// Spawn powerup at random location
spawnPowerup() {
    this.powerup.x = 400;                    // Center X
    this.powerup.y = Math.random() * 300 + 150;  // Random Y (150-450)
    this.powerup.active = true;
}

// Check if ball collected powerup
checkPowerupCollision(ball: Ball, paddles: Paddles) {
    const distance = Math.sqrt(
        Math.pow(ball.x - this.powerup.x, 2) + 
        Math.pow(ball.y - this.powerup.y, 2)
    );
    
    if (distance < 15) { // Collision radius
        this.powerup.active = false;
        
        // Apply powerup to paddle that last hit the ball
        const targetPaddle = ball.lastHitter === 'player1' 
            ? paddles.player1 
            : paddles.player2;
        
        targetPaddle.height = 150; // Increase height
        targetPaddle.powerupExpires = Date.now() + 5000; // 5 seconds
    }
}
```

---

## AI System

The AI simulates human-like play with three difficulty levels.

### Difficulty Levels

| Difficulty | Reaction Time | Accuracy | Powerup Strategy |
|-----------|---------------|----------|------------------|
| Easy | Slow (200ms) | 70% | 5% awareness |
| Medium | Normal (100ms) | 85% | 25% awareness |
| Hard | Fast (50ms) | 95% | 100% awareness |

### Ball Trajectory Prediction

The AI predicts where the ball will be when it reaches the paddle.

```typescript
predictBallYAtPaddle(xTarget: number): number {
    // 1. Get ball velocity
    const dx = this.ballX - this.prevBallX;  // Horizontal speed
    const dy = this.ballY - this.prevBallY;  // Vertical speed
    
    // 2. If ball moving away, don't predict
    if (xTarget === 50 && dx >= 0) return this.ballY;
    if (xTarget === 750 && dx <= 0) return this.ballY;
    
    // 3. Simulate ball movement until it reaches paddle
    let x = this.ballX;
    let y = this.ballY;
    let currentDy = dy;
    
    for (let i = 0; i < 2000; i++) { // Max 2000 iterations
        const nextX = x + dx;
        const nextY = y + currentDy;
        
        // Check if ball crossed paddle line
        const crossed = (dx < 0) 
            ? (x >= xTarget && nextX <= xTarget)  // Moving left
            : (x <= xTarget && nextX >= xTarget); // Moving right
        
        if (crossed) {
            // Linear interpolation to find exact Y at xTarget
            const t = (xTarget - x) / (nextX - x);
            return y + t * (nextY - y);
        }
        
        // Update position
        x = nextX;
        y = nextY;
        
        // Handle wall bounces
        if (y <= 0 || y >= 600) {
            currentDy = -currentDy;
        }
    }
    
    return this.ballY; // Fallback
}
```

**Algorithm Explanation:**
1. Calculate ball's velocity from previous frame
2. Simulate ball movement frame-by-frame
3. Check for wall bounces and reverse direction
4. Stop when ball crosses paddle's X position
5. Return predicted Y coordinate

### AI Movement with Error Simulation

```typescript
moveBotPaddle(paddles: Paddles) {
    // 1. Predict where ball will be
    const predicted = this.predictBallYAtPaddle(50); // Paddle at x=50
    
    // 2. Add difficulty-based error
    const errorAmount = {
        easy: 80,    // ±80px error
        medium: 30,  // ±30px error
        hard: 5      // ±5px error
    }[this.aiDifficulty];
    
    const error = (Math.random() - 0.5) * errorAmount;
    const desiredY = predicted - 50 + error; // Center paddle on target
    
    // 3. Move paddle smoothly towards target
    const currentY = paddle.y;
    const diff = desiredY - currentY;
    
    if (Math.abs(diff) > 2) {
        const moveSpeed = this.paddleSpeed;
        paddle.y += Math.sign(diff) * Math.min(moveSpeed, Math.abs(diff));
    }
    
    // 4. Keep paddle on screen
    paddle.y = Math.max(0, Math.min(600 - paddle.height, paddle.y));
}
```

---

## WebSocket Communication

WebSockets enable real-time bidirectional communication between server and clients.

### Connection Flow

```
Client                          Server
  │                              │
  ├─────── Connect ─────────────>│
  │<────── Connected ────────────┤
  │                              │
  ├─────── paddle-move ─────────>│
  │         {y: 250}             │
  │                              │ (Update game state)
  │                              │
  │<────── game-update ──────────┤
  │    {ball: {x,y}, paddles...} │
  │                              │
```

### WebSocket Event Handlers

```typescript
// Server-side WebSocket handler
websocket.on('connection', (socket, request) => {
    const userId = getUserFromSession(request);
    
    // Store socket connection
    onlineUsers.set(userId, { socket, lastSeen: new Date() });
    
    // Handle paddle movement
    socket.on('message', (data) => {
        const message = JSON.parse(data);
        
        if (message.type === 'paddle-move') {
            const gameId = findGameByUser(userId);
            const game = games.get(gameId);
            
            // Update paddle position
            game.paddles.player1.y = message.y;
            
            // No immediate broadcast - let game loop handle it
        }
        
        if (message.type === 'ready') {
            handlePlayerReady(userId, gameId);
        }
    });
    
    socket.on('close', () => {
        onlineUsers.delete(userId);
        handlePlayerDisconnect(userId);
    });
});
```

### Broadcasting Game State

```typescript
// Send game state to all players in a game (60 times per second)
function broadcastGameState(gameId: number, gameState: GameState) {
    const game = games.get(gameId);
    
    // Prepare message
    const message = JSON.stringify({
        type: 'game-update',
        gameId: gameId,
        ball: gameState.ball,
        paddles: gameState.paddles,
        scores: gameState.scores,
        timestamp: Date.now()
    });
    
    // Send to all players
    game.players.forEach(player => {
        if (player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(message);
        }
    });
}
```

---

## Game State Management

### State Machine

```
        start()
          │
          v
      [WAITING] ←──────────────────┐
          │                        │
      join() x2                    │
          │                        │
          v                     forfeit()
    [COUNTDOWN]                    │
          │                        │
      3...2...1                    │
          │                        │
          v                        │
      [ACTIVE] ────────────────────┘
          │
    score >= limit
          │
          v
       [ENDED]
```

### Game State Object

```typescript
interface ActiveGame {
    gameId: number;
    status: 'waiting' | 'countdown' | 'active' | 'paused' | 'ended';
    
    // Players
    players: GamePlayer[];
    team1Players?: GamePlayer[];
    team2Players?: GamePlayer[];
    
    // Game objects
    ball: Ball;
    paddles: Paddles;
    scores: Scores;
    
    // Configuration
    settings: {
        scoreToWin: number;
        ballSpeed: number;
        paddleSpeed: number;
        powerupsEnabled: boolean;
        aiDifficulty: 'easy' | 'medium' | 'hard';
    };
    
    // Engine instances
    physics: GamePhysics;
    ai?: GameAI;
    intervalId?: NodeJS.Timeout; // Game loop interval
    
    // Metadata
    startTime: Date;
    endTime?: Date;
    winner?: string;
}
```

---

## Key Algorithms

### 1. **Circle-Rectangle Collision (Ball vs Paddle)**

```typescript
function circleRectCollision(
    circleX: number, 
    circleY: number, 
    radius: number,
    rectX: number, 
    rectY: number, 
    rectWidth: number, 
    rectHeight: number
): boolean {
    // Find closest point on rectangle to circle center
    const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
    const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));
    
    // Calculate distance from circle center to closest point
    const distanceX = circleX - closestX;
    const distanceY = circleY - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;
    
    // Collision if distance less than radius
    return distanceSquared < (radius * radius);
}
```

### 2. **Paddle Flick Physics**

Adds realistic "momentum" to paddle hits.

```typescript
function applyFlickPhysics(ball: Ball, paddle: Paddle) {
    // Paddle velocity affects ball
    if (paddle.vy) {
        // Transfer 30% of paddle velocity to ball
        ball.dy += paddle.vy * 0.3;
        
        // Cap maximum vertical speed
        const maxDy = 8;
        ball.dy = Math.max(-maxDy, Math.min(maxDy, ball.dy));
    }
    
    // Add spin based on hit location
    const hitOffset = ball.y - (paddle.y + paddle.height / 2);
    ball.dy += hitOffset * 0.1;
}
```

### 3. **Matchmaking Algorithm**

```typescript
function findMatch(player: Player): Player | null {
    // Get all waiting players
    const queue = matchmakingQueue.getAll();
    
    // Filter: similar skill level (±100 rating)
    const candidates = queue.filter(p => 
        p.id !== player.id &&
        Math.abs(p.rating - player.rating) <= 100
    );
    
    if (candidates.length === 0) {
        // No match found, add to queue
        matchmakingQueue.add(player);
        return null;
    }
    
    // Find closest rating match
    const opponent = candidates.reduce((best, current) => {
        const bestDiff = Math.abs(best.rating - player.rating);
        const currentDiff = Math.abs(current.rating - player.rating);
        return currentDiff < bestDiff ? current : best;
    });
    
    // Remove opponent from queue
    matchmakingQueue.remove(opponent.id);
    
    return opponent;
}
```

---

## Code Examples

### Example 1: Creating a New Game

```typescript
async function createGame(player1: Player, player2: Player, settings: GameSettings) {
    const gameId = generateGameId();
    
    // Initialize ball at center
    const ball: Ball = {
        x: 400,
        y: 300,
        dx: settings.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
        dy: (Math.random() - 0.5) * 4,
        frozen: true // Frozen during countdown
    };
    
    // Initialize paddles
    const paddles: Paddles = {
        player1: { x: 50, y: 250, height: 100 },
        player2: { x: 750, y: 250, height: 100 }
    };
    
    // Create game instance
    const game: ActiveGame = {
        gameId,
        status: 'countdown',
        players: [player1, player2],
        ball,
        paddles,
        scores: { player1: 0, player2: 0 },
        settings,
        physics: new GamePhysics(settings.ballSpeed, settings.accelerateOnHit),
        ai: player2.isBot ? new GameAI(settings.aiDifficulty) : undefined,
        startTime: new Date()
    };
    
    // Store game
    activeGames.set(gameId, game);
    
    // Start countdown
    await startCountdown(game);
    
    // Start game loop
    startGameLoop(game);
    
    return gameId;
}
```

### Example 2: Game Loop Implementation

```typescript
function startGameLoop(game: ActiveGame) {
    const FPS = 60;
    const FRAME_TIME = 1000 / FPS; // ~16.67ms
    
    game.intervalId = setInterval(() => {
        if (game.status !== 'active') return;
        
        // 1. Update AI (if present)
        if (game.ai) {
            game.ai.updateBallPosition(game.ball.x, game.ball.y);
            game.ai.moveBotPaddle(game.paddles, game.gameId);
        }
        
        // 2. Update physics
        const result = game.physics.updateBall(
            game.ball, 
            game.paddles, 
            game.gameId
        );
        
        // 3. Handle scoring
        if (result.scored) {
            if (result.scorer === 'player1') game.scores.player1++;
            if (result.scorer === 'player2') game.scores.player2++;
            
            // Check for winner
            if (game.scores.player1 >= game.settings.scoreToWin ||
                game.scores.player2 >= game.settings.scoreToWin) {
                endGame(game);
                return;
            }
            
            // Reset ball
            resetBall(game.ball);
        }
        
        // 4. Broadcast state to all players
        broadcastGameState(game.gameId, {
            ball: game.ball,
            paddles: game.paddles,
            scores: game.scores,
            powerup: game.physics.powerup
        });
        
    }, FRAME_TIME);
}
```

### Example 3: Handling Player Input

```typescript
// Client sends paddle position
// {"type": "paddle-move", "y": 250}

function handlePaddleMove(socket: WebSocket, message: any) {
    const userId = getUserBySocket(socket);
    const game = findGameByUser(userId);
    
    if (!game || game.status !== 'active') return;
    
    // Find player's paddle
    const isPlayer1 = game.players[0].userId === userId;
    const paddle = isPlayer1 ? game.paddles.player1 : game.paddles.player2;
    
    // Update position with bounds checking
    const newY = Math.max(0, Math.min(600 - paddle.height, message.y));
    
    // Calculate velocity for flick physics
    const deltaY = newY - paddle.y;
    paddle.vy = deltaY; // Store velocity
    paddle.y = newY;
    
    // Game loop will broadcast updated state
}
```

---

## Performance Optimization

### 1. **Throttling Updates**
```typescript
// Only send updates every 16ms (60 FPS)
const lastBroadcast = new Map<number, number>();

function throttledBroadcast(gameId: number, data: any) {
    const now = Date.now();
    const last = lastBroadcast.get(gameId) || 0;
    
    if (now - last >= 16) { // ~60 FPS
        broadcast(gameId, data);
        lastBroadcast.set(gameId, now);
    }
}
```

### 2. **Object Pooling**
```typescript
// Reuse ball objects instead of creating new ones
const ballPool: Ball[] = [];

function getBall(): Ball {
    return ballPool.pop() || { x: 400, y: 300, dx: 0, dy: 0 };
}

function returnBall(ball: Ball) {
    ballPool.push(ball);
}
```

### 3. **Spatial Partitioning**
```typescript
// For games with many objects, divide space into grid
class SpatialGrid {
    private grid: Map<string, GameObject[]> = new Map();
    private cellSize = 100;
    
    insert(obj: GameObject) {
        const key = this.getKey(obj.x, obj.y);
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key)!.push(obj);
    }
    
    getNearby(x: number, y: number): GameObject[] {
        const key = this.getKey(x, y);
        return this.grid.get(key) || [];
    }
    
    private getKey(x: number, y: number): string {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }
}
```

---

## Testing

### Unit Test Example

```typescript
describe('GamePhysics', () => {
    it('should detect paddle collision', () => {
        const physics = new GamePhysics(5, false, 'local', false);
        
        const ball: Ball = { x: 55, y: 300, dx: -5, dy: 0 };
        const paddles: Paddles = {
            player1: { x: 50, y: 250, height: 100 },
            player2: { x: 750, y: 250, height: 100 }
        };
        
        const result = physics.updateBall(ball, paddles, 1);
        
        expect(ball.dx).toBeGreaterThan(0); // Ball should bounce right
        expect(result.scored).toBe(false);
    });
});
```

---

## Common Issues & Solutions

### Issue 1: Ball Goes Through Paddle
**Problem**: At high speeds, ball can skip over paddle between frames.
**Solution**: Use swept collision detection (see Physics section).

### Issue 2: Game Becomes Laggy
**Problem**: Too many calculations per frame.
**Solution**: 
- Limit AI prediction iterations
- Use spatial partitioning for collision detection
- Throttle broadcasts to 60 FPS

### Issue 3: AI Too Easy/Hard
**Problem**: Difficulty not calibrated.
**Solution**:
- Adjust reaction time delays
- Add randomized prediction errors
- Implement "intentional miss" probability

---

## Best Practices

1. **Always validate user input**
   ```typescript
   if (typeof message.y !== 'number' || message.y < 0 || message.y > 600) {
       return; // Invalid input
   }
   ```

2. **Use TypeScript interfaces**
   ```typescript
   interface GameConfig {
       ballSpeed: number;
       paddleSpeed: number;
       scoreToWin: number;
   }
   ```

3. **Log important events**
   ```typescript
   logger.info(`Game ${gameId} started: ${player1} vs ${player2}`);
   ```

4. **Clean up resources**
   ```typescript
   function endGame(game: ActiveGame) {
       clearInterval(game.intervalId);
       activeGames.delete(game.gameId);
       saveGameHistory(game);
   }
   ```

---

## Further Reading

- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Game Loop Patterns](https://gameprogrammingpatterns.com/game-loop.html)
- [Collision Detection Algorithms](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

## Glossary

- **FPS**: Frames Per Second - how often the game updates
- **WebSocket**: Protocol for real-time bidirectional communication
- **Collision Detection**: Algorithm to detect when objects touch
- **Game Loop**: Continuous cycle that updates and renders the game
- **State Machine**: System for managing different game states
- **Swept Collision**: Checking entire movement path, not just endpoints
- **Interpolation**: Calculating intermediate values between two points
- **Throttling**: Limiting how often an action can occur

---

## Quick Reference

### Important Constants
```typescript
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 20;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 10;
const FPS = 60;
```

### Key Functions
```typescript
// Start a new game
createGame(player1, player2, settings);

// Update ball position
physics.updateBall(ball, paddles);

// Move AI paddle
ai.moveBotPaddle(paddles);

// Broadcast to players
broadcast(gameId, gameState);

// End game
endGame(game);
```

---

**Last Updated**: January 2026  
**Maintainers**: FT_Transcendence Team  
**Version**: 1.0.0
