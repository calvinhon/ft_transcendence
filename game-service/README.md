# Game Service - Real-time Pong Game Microservice

A high-performance, real-time multiplayer Pong game microservice built with Node.js, TypeScript, and WebSocket technology. Handles game logic, matchmaking, real-time communication, and game statistics.

## 🏗️ Architecture Overview

The game-service follows a modular architecture with clear separation of game components:

```
game-service/
├── server.ts                    # Server setup & WebSocket handling
├── routes/
│   ├── index.ts                # Route registration & WebSocket endpoint
│   └── modules/                # Game logic modules
│       ├── game-logic.ts       # Core PongGame class & game loop
│       ├── game-physics.ts     # Ball physics & collision detection
│       ├── game-ai.ts          # AI opponent logic
│       ├── game-state.ts       # Game state management & countdown
│       ├── game-scoring.ts     # Score tracking & win conditions
│       ├── game-broadcast.ts   # Real-time state broadcasting
│       ├── game-creator.ts     # Game creation & database persistence
│       ├── matchmaking.ts      # Player matchmaking system
│       ├── websocket.ts        # WebSocket message handling
│       ├── game-history-service.ts # Game history & statistics
│       ├── game-stats-service.ts   # Player statistics
│       ├── online-users.ts     # Online user tracking
│       ├── logger.ts           # Centralized logging
│       ├── database.ts         # Database utilities
│       ├── types.ts            # TypeScript interfaces
│       └── utils.ts            # Utility functions
```

## 🎮 Core Components

### **Game Engine (`game-logic.ts`)**
- **PongGame Class**: Main game controller with component composition
- **Game Loop**: Physics updates, AI decisions, state broadcasting
- **Component Architecture**: Physics, AI, State, Scoring, Broadcasting modules

### **Physics Engine (`game-physics.ts`)**
- **Ball Movement**: Velocity, acceleration, collision detection
- **Paddle Physics**: Movement constraints, ball reflection
- **Game Modes**: Arcade, Classic, Tournament variations

### **AI System (`game-ai.ts`)**
- **Difficulty Levels**: Easy, Medium, Hard AI behaviors
- **Predictive Movement**: Ball trajectory prediction
- **Adaptive Difficulty**: Dynamic AI adjustment

### **Real-time Communication**
- **WebSocket Server**: Bidirectional real-time communication
- **State Broadcasting**: Game state synchronization
- **Player Input**: Real-time paddle movement handling

## 🎯 Game Features

### **Game Modes**
- **Arcade Mode**: Fast-paced with power-ups
- **Classic Mode**: Traditional Pong experience
- **Tournament Mode**: Competitive bracket play
- **AI Practice**: Single-player vs computer

### **Real-time Features**
- **Live Multiplayer**: Real-time paddle synchronization
- **Spectator Mode**: Watch ongoing games
- **Chat Integration**: In-game communication (disabled)
- **Online Status**: Track active players

### **Statistics & History**
- **Game History**: Complete match records
- **Player Statistics**: Win/loss ratios, scores
- **Tournament Rankings**: Competitive leaderboards

## 🔌 API Endpoints

### **WebSocket Endpoint**
```
GET /ws
```
Real-time game communication endpoint supporting:
- Player input (paddle movement)
- Game state updates
- Matchmaking requests
- Tournament participation

### **REST Endpoints**

#### `GET /history/:userId`
Get player's game history
```typescript
Response: GameHistory[]
```

#### `GET /stats/:userId`
Get player's game statistics
```typescript
Response: {
  totalGames: number,
  wins: number,
  losses: number,
  winRate: number,
  averageScore: number
}
```

#### `GET /online`
Get currently online users
```typescript
Response: OnlineUserData[]
```

#### `GET /health`
Service health status
```typescript
Response: {
  status: "healthy",
  service: "game-service",
  timestamp: string,
  modules: string[]
}
```

## 🎮 WebSocket Message Protocol

### **Client → Server Messages**

#### **Join Game**
```json
{
  "type": "joinGame",
  "userId": 123,
  "username": "player1",
  "gameSettings": {
    "gameMode": "arcade",
    "aiDifficulty": "medium"
  }
}
```

#### **Player Input**
```json
{
  "type": "playerInput",
  "direction": "up|down",
  "player": 1
}
```

#### **Tournament Actions**
```json
{
  "type": "joinTournament",
  "tournamentId": 456
}
```

### **Server → Client Messages**

#### **Game State Update**
```json
{
  "type": "gameState",
  "ball": { "x": 400, "y": 300, "dx": 5, "dy": -3 },
  "paddles": {
    "player1": { "x": 20, "y": 250 },
    "player2": { "x": 780, "y": 250 }
  },
  "scores": { "player1": 2, "player2": 1 },
  "gameState": "playing"
}
```

#### **Game Events**
```json
{
  "type": "gameStart",
  "gameId": 789,
  "players": {
    "player1": { "userId": 123, "username": "player1" },
    "player2": { "userId": 456, "username": "player2" }
  }
}
```

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify (high-performance HTTP/WebSocket server)
- **Language**: TypeScript (type safety)
- **Database**: SQLite3 (game persistence)
- **Real-time**: WebSocket (@fastify/websocket)
- **Architecture**: Modular component system

## 📦 Dependencies

### **Production Dependencies**
- `fastify`: Web framework
- `@fastify/cors`: CORS handling
- `@fastify/websocket`: WebSocket support
- `sqlite3`: Database driver

### **Development Dependencies**
- `typescript`: TypeScript compiler
- `@types/node`: Node.js types

## ⚙️ Game Configuration

### **Physics Settings**
```typescript
interface GameSettings {
  gameMode: 'arcade' | 'classic' | 'tournament';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  ballSpeed: 'slow' | 'medium' | 'fast';
  paddleSpeed: 'slow' | 'medium' | 'fast';
  powerupsEnabled: boolean;
  accelerateOnHit: boolean;
  scoreToWin: number;
}
```

### **Default Settings**
- **Game Mode**: Arcade
- **AI Difficulty**: Medium
- **Ball Speed**: Medium (5-8 pixels/frame)
- **Paddle Speed**: Medium (6 pixels/frame)
- **Score to Win**: 5 points

## 🏃‍♂️ Development Setup

### **Prerequisites**
- Node.js 18+
- npm

### **Installation**
```bash
cd game-service
npm install
```

### **Development**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### **Testing**
```bash
# Run the test script
./test.sh
```

## 🐳 Docker Deployment

### **Build & Run**
```bash
# Build container
docker build -t game-service .

# Run container
docker run -p 3002:3000 game-service
```

## 🎮 Game Mechanics

### **Ball Physics**
- **Velocity**: Configurable speed with acceleration
- **Collision**: Perfect reflection with paddle angle influence
- **Boundaries**: Top/bottom wall bounces, left/right scoring

### **Paddle Movement**
- **Constraints**: Vertical movement within game bounds
- **Speed**: Configurable movement velocity
- **Input**: Real-time WebSocket updates

### **Scoring System**
- **Win Condition**: First to reach target score
- **Point Tracking**: Individual player scores
- **Game End**: Automatic winner detection and broadcasting

### **AI Behavior**
- **Easy**: Random movement with basic ball tracking
- **Medium**: Predictive movement with timing
- **Hard**: Perfect ball interception with reaction time

## 📊 Database Schema

### **Games Table**
```sql
CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player1_id INTEGER,
  player2_id INTEGER,
  game_mode TEXT,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  winner_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME
);
```

### **Game Events Table**
```sql
CREATE TABLE game_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER,
  event_type TEXT,
  event_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 📈 Performance Characteristics

- **Real-time Updates**: 60 FPS game state broadcasting
- **Concurrent Games**: Multiple simultaneous matches
- **WebSocket Efficiency**: Binary message optimization
- **Memory Management**: Automatic cleanup of finished games
- **Database Optimization**: Indexed queries for statistics

## 🔧 Monitoring & Debugging

### **Logging**
- **Request Logging**: All HTTP/WebSocket requests
- **Game Events**: Match start/end, scoring events
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Response times and throughput

### **Health Checks**
- **Service Status**: Overall service health
- **Active Games**: Current game count
- **Connected Players**: Online user tracking
- **Database Connectivity**: Storage layer health

## 🤝 Integration Points

### **Frontend Integration**
```javascript
// WebSocket connection
const ws = new WebSocket('ws://localhost:3002/ws');

// Send player input
ws.send(JSON.stringify({
  type: 'playerInput',
  direction: 'up',
  player: 1
}));

// Receive game state
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'gameState') {
    updateGame(data);
  }
};
```

### **Service Communication**
- **Auth Service**: Player authentication
- **Tournament Service**: Tournament bracket management
- **User Service**: Player profiles and statistics

## 🚀 Scaling Considerations

### **Horizontal Scaling**
- **Stateless Design**: Games can be distributed across instances
- **Load Balancing**: WebSocket-aware load balancers
- **Database Sharding**: Game history partitioning

### **Performance Optimization**
- **Connection Pooling**: Database connection reuse
- **Message Batching**: Reduce WebSocket overhead
- **Memory Limits**: Automatic game cleanup

## 🧪 Testing Strategy

- **Unit Tests**: Individual game components (physics, AI, scoring)
- **Integration Tests**: WebSocket communication
- **Load Tests**: Concurrent game handling
- **End-to-End Tests**: Complete game flows

## 📚 Architecture Principles

This service follows **Component Architecture** principles:

1. **Single Responsibility**: Each module handles one aspect of game logic
2. **Composition over Inheritance**: Game components are composed together
3. **Dependency Injection**: Clean interfaces between components
4. **Testability**: Isolated components for unit testing
5. **Performance**: Optimized for real-time game requirements

---

**Service Port**: `3002` (internal), `3000` (external)  
**WebSocket Endpoint**: `ws://localhost:3002/ws`  
**Health Check**: `GET /health`  
**Documentation**: This README  
**Maintainer**: Development Team</content>
<parameter name="filePath">/home/honguyen/ft_transcendence/game-service/README.md