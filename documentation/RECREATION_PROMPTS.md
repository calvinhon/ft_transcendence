# FT_TRANSCENDENCE - Complete Recreation Prompts

This document contains comprehensive prompts and specifications to recreate the entire FT_TRANSCENDENCE multiplayer Pong platform. Each section provides detailed instructions for an AI agent to rebuild the system exactly as designed.

**Last Updated**: December 4, 2025

## 📖 HOW TO USE THIS DOCUMENT

This document is structured as a series of **extremely detailed prompts** that an AI agent can follow to recreate the entire system from scratch. Each section includes:
- **Exact code implementations** with complete algorithms
- **Step-by-step procedures** with no ambiguity
- **Complete file contents** with proper formatting
- **Detailed explanations** of design decisions
- **Specific configurations** with actual values

**For AI Agents**: Read each section sequentially and implement exactly as specified. All code snippets are production-ready and tested.

**For Humans**: Use this as a comprehensive reference guide for understanding the system architecture and implementation details.

---

## 🚀 COMPLETE STEP-BY-STEP RECREATION GUIDE

**Follow these steps IN ORDER to recreate the entire FT_TRANSCENDENCE system:**

### Step 1: Project Initialization
```bash
# Create project root
mkdir ft_transcendence
cd ft_transcendence

# Create service directories
mkdir -p auth-service/src/{routes/handlers,services,types,utils,database}
mkdir -p game-service/src/{routes/modules,database}
mkdir -p tournament-service/src/{routes,services,types,utils,database,tests}
mkdir -p user-service/src/{routes,services,database}
mkdir -p frontend/src/{core,managers,tests,utils}
mkdir -p frontend/css
mkdir -p frontend/nginx
mkdir -p blockchain/{contracts,scripts,test,artifacts}
mkdir -p documentation
```

### Step 2: Initialize Each Service
```bash
# Auth Service
cd auth-service
npm init -y
npm install fastify @fastify/cookie @fastify/cors bcryptjs jsonwebtoken sqlite3
npm install --save-dev @types/node @types/bcryptjs @types/jsonwebtoken typescript tsx

# Game Service
cd ../game-service
npm init -y
npm install fastify @fastify/websocket sqlite3
npm install --save-dev @types/node typescript tsx

# Tournament Service
cd ../tournament-service
npm init -y
npm install fastify @fastify/cors sqlite3 ethers
npm install --save-dev @types/node typescript tsx jest

# User Service
cd ../user-service
npm init -y
npm install fastify @fastify/cors sqlite3
npm install --save-dev @types/node typescript tsx

# Frontend
cd ../frontend
npm init -y
npm install vite
npm install --save-dev typescript

# Blockchain
cd ../blockchain
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox ethers
npx hardhat init  # Select "Create a JavaScript project"
```

### Step 3: Configure TypeScript (All Services)
Create `tsconfig.json` in each service directory:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 4: Create Docker Infrastructure
Create `docker-compose.yml` in project root - **EXACT CONFIGURATION**:
```yaml
services:
  nginx:
    build: ./frontend
    ports:
      - "80:80"
    volumes:
      - ./frontend/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - auth-service
      - game-service
      - tournament-service
      - user-service
      - hardhat-node
    mem_limit: 128m
    networks:
      - transcendence-network

  auth-service:
    build: ./auth-service
    ports:
      - "3001:3000"
    volumes:
      - ./auth-service/database:/app/database
    environment:
      - PORT=3000
      - SERVICE_NAME=auth-service
      - NODE_ENV=development
      - JWT_SECRET=your-jwt-secret-change-in-production-min-32-chars
      - COOKIE_SECRET=your-cookie-secret-change-in-production-min-32
    mem_limit: 256m
    networks:
      - transcendence-network

  game-service:
    build: ./game-service
    ports:
      - "3002:3000"
    volumes:
      - ./game-service/database:/app/database
    environment:
      - PORT=3000
      - SERVICE_NAME=game-service
    mem_limit: 256m
    networks:
      - transcendence-network

  tournament-service:
    build: ./tournament-service
    ports:
      - "3003:3000"
    volumes:
      - ./tournament-service/database:/app/database
    environment:
      - PORT=3000
      - SERVICE_NAME=tournament-service
    mem_limit: 256m
    networks:
      - transcendence-network

  user-service:
    build: ./user-service
    ports:
      - "3004:3000"
    volumes:
      - ./user-service/database:/app/database
    environment:
      - PORT=3000
      - SERVICE_NAME=user-service
    mem_limit: 256m
    networks:
      - transcendence-network

  hardhat-node:
    build: ./blockchain
    container_name: hardhat-node
    ports:
      - "8545:8545"
    volumes:
      - hardhat-data:/app/data
      - ./blockchain/contracts:/app/contracts
      - ./blockchain/scripts:/app/scripts
      - ./blockchain/artifacts:/app/artifacts
    mem_limit: 1g
    networks:
      - transcendence-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8545"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  transcendence-network:
    driver: bridge

volumes:
  hardhat-data:
```

### Step 5: Create Dockerfiles for Each Service

**Auth/Game/Tournament/User Services** (same Dockerfile):
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Create database directory
RUN mkdir -p database

# Expose port
EXPOSE 3000

# Start service with tsx (TypeScript execution)
CMD ["npx", "tsx", "src/server.ts"]
```

**Frontend Dockerfile**:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json vite.config.js ./
COPY src/ ./src/
COPY css/ ./css/
COPY index.html ./

RUN npm run build

FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/css /usr/share/nginx/html/css

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Blockchain Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy contract files
COPY contracts/ ./contracts/
COPY scripts/ ./scripts/
COPY hardhat.config.cjs ./

# Compile contracts
RUN npx hardhat compile

EXPOSE 8545

# Start node and deploy
CMD npx hardhat node & \
    sleep 5 && \
    npx hardhat run scripts/deploy.js --network localhost && \
    wait
```

### Step 6: Create Makefile for Easy Management
```makefile
.PHONY: start stop restart rebuild clean

start:
	@echo "🚀 Starting ft_transcendence..."
	docker compose build --no-cache
	docker compose up -d
	@echo "✅ Services started!"
	@echo "🌐 Opening http://localhost..."
	@sleep 3
	@xdg-open http://localhost 2>/dev/null || open http://localhost 2>/dev/null || echo "Visit http://localhost"

stop:
	@echo "🛑 Stopping services..."
	docker compose down

restart:
	@echo "🔄 Restarting services..."
	docker compose restart

rebuild:
	@echo "🔨 Rebuilding all services..."
	docker compose down
	docker compose build --no-cache
	docker compose up -d
	@echo "✅ Rebuild complete!"

clean:
	@echo "🧹 Cleaning up..."
	docker compose down -v --rmi all
	@echo "✅ Cleanup complete!"
```

### Step 7: Implement Each Service
Now follow the detailed prompts below for each service:
1. **Auth Service** → See "Auth Service (Port 3001) - DETAILED IMPLEMENTATION"
2. **Game Service** → See "Game Service (Port 3002) - DETAILED IMPLEMENTATION"
3. **Tournament Service** → See "Tournament Service (Port 3003) - DETAILED IMPLEMENTATION"
4. **User Service** → See "User Service (Port 3004)"
5. **Frontend** → See "FRONTEND ARCHITECTURE PROMPT"
6. **Blockchain** → See "BLOCKCHAIN INTEGRATION PROMPT"

### Step 8: Test the System
```bash
# Start all services
make start

# Check service health
curl http://localhost/api/auth/verify  # Should return 401
curl http://localhost/api/game/ws      # Should upgrade to WebSocket
curl http://localhost:8545             # Should return Hardhat node info

# Access frontend
open http://localhost

# Test user flow:
# 1. Register new user
# 2. Login (receive HTTP-only cookie)
# 3. Start campaign mode (level 1)
# 4. Play arcade mode (add local players)
# 5. Create tournament
# 6. Complete tournament (see blockchain recording)
```

---

## 🔄 Recent Updates

### Security Enhancements
- **HTTP-only Cookies**: Migrated from localStorage/sessionStorage JWT storage to HTTP-only cookies with SameSite=Strict
- **CORS Configuration**: Updated nginx to support credentials and cookie proxying
- **Password Reset**: Implemented password reset token system

### Game Modes Implementation
- **Co-op/Campaign Mode**: 21 progressive levels with AI opponents (no standalone "Bot Training" mode)
- **Arcade Mode**: Local multiplayer team-based gameplay with drag-and-drop player management
- **Tournament Mode**: Single-elimination brackets with local 1v1 matches (W/S vs U/J controls)
- **No PVP Quick Match**: The system currently focuses on local multiplayer, not online matchmaking

### Technical Improvements
- **Server-Side Physics**: Game physics calculated on backend for consistency
- **Multi-Paddle Support**: Team-based arcade mode with multiple paddles per side
- **Position-Based Controls**: Tournament controls follow paddle position, not player identity
- **Memory Limits**: Docker services configured with appropriate memory constraints
- **Database Migrations**: Automatic column addition for schema evolution

## 🏗️ ARCHITECTURE OVERVIEW PROMPT

**Create a full-stack multiplayer Pong game platform with the following architecture:**

### System Requirements:
- **Frontend**: Modern web application using TypeScript, Vite, HTML5 Canvas, WebSockets
- **Backend**: Microservices architecture with 4 Node.js/Fastify services
- **Database**: SQLite databases for each service (separate data isolation)
- **API Gateway**: nginx reverse proxy with WebSocket and CORS support
- **Authentication**: HTTP-only cookies with JWT tokens (SameSite=Strict)
- **Blockchain**: Hardhat-based Ethereum integration for tournament recording
- **Containerization**: Docker Compose orchestration with memory limits
- **Real-time**: WebSocket communication for live gameplay (60 FPS game state)

### Service Architecture:
1. **auth-service** (Port 3001): User authentication, JWT tokens, profiles
2. **game-service** (Port 3002): Real-time Pong matches, WebSocket game state
3. **tournament-service** (Port 3003): Tournament management, bracket generation
4. **user-service** (Port 3004): Extended profiles, achievements, leaderboards
5. **nginx** (Port 80): API gateway and static file serving
6. **hardhat-node** (Port 8545): Local Ethereum blockchain for tournament records

### Technology Stack:
- **Frontend**: TypeScript, Vite, HTML5 Canvas, WebSockets
- **Backend**: Node.js, Fastify framework, SQLite3
- **Blockchain**: Solidity, Hardhat, ethers.js
- **Infrastructure**: Docker, Docker Compose, nginx
- **Development**: Makefile automation, hot reloading

---

## 🎮 GAME FEATURES & MODES PROMPT

**Implement a comprehensive Pong game with the following features and modes:**

### Core Game Mechanics:
- **Physics Engine**: Server-side game physics with collision detection
- **Paddle Controls**: Position-based keyboard controls for local multiplayer
- **Multi-paddle Support**: Team-based gameplay with multiple paddles per side
- **Scoring System**: Configurable score-to-win conditions (default 3 points)
- **Real-time Sync**: WebSocket-based state broadcasting at 60 FPS
- **Canvas Rendering**: Client-side rendering of server game state
- **Game Settings**: Customizable ball speed, paddle speed, and acceleration on hit

### Game Modes:

#### 1. Co-op / Campaign Mode (21 Levels)
```
Features:
- Progressive difficulty levels (1-21)
- Single-player vs AI bot opponents
- AI difficulty increases with each level
- Level progression tracking in user profile database
- Automatic level advancement after wins
- Database persistence of campaign progress
- Real-time WebSocket-based gameplay
- Custom game settings (ball speed, paddle speed, score to win, acceleration)
```

#### 2. Arcade Mode (Local Multiplayer)
```
Features:
- Local multiplayer with team-based gameplay
- Multiple players per team (configurable team sizes)
- Drag-and-drop player assignment to teams
- Add local players (anonymous guest players)
- Position-based keyboard controls for multiple players
- Real-time WebSocket-based game state sync
- Support for 1v1, 2v2, 3v3 configurations
- Host player + local guest players
```

#### 3. Tournament Mode (Single-Elimination Brackets)
```
Features:
- Tournament creation with custom settings
- Single-elimination bracket system
- Automatic BYE handling for non-power-of-2 participants
- Local multiplayer 1v1 matches on same keyboard
- Interactive bracket visualization
- Match result submission and validation
- Final ranking calculation (1st, 2nd, 3rd, 4th places)
- Blockchain recording of tournament results
- Real-time tournament progress updates
- Player side selection for each match
```

### Additional Features:
- **Statistics Dashboard**: Comprehensive performance metrics (wins, losses, win rate, streaks)
- **Achievement System**: Unlockable milestones and rewards
- **Leaderboards**: Global rankings and tournament standings
- **User Profiles**: Display campaign progress, statistics, and achievements
- **WebSocket Real-time Sync**: Live game state synchronization

---

## 🎨 FRONTEND ARCHITECTURE PROMPT

**Create a modular frontend application with the following structure and components:**

### Project Structure:
```
frontend/
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.ts              # Main application controller (~1953 lines)
│   ├── router.ts           # Client-side routing system
│   ├── state.ts            # Global state management
│   ├── auth.ts             # Authentication handling (HTTP-only cookies)
│   ├── game.ts             # Core game logic (~3510 lines - LARGEST FILE)
│   ├── tournament.ts       # Tournament UI logic (~1409 lines)
│   ├── leaderboard.ts      # Leaderboard functionality
│   ├── profile.ts          # User profile management
│   ├── match.ts            # Match history and details
│   ├── blockchain.ts       # Blockchain integration
│   ├── ui-view.ts          # UI components and view helpers
│   ├── types.ts            # TypeScript type definitions
│   ├── ai-player.ts        # AI/bot opponent logic
│   ├── host-auth.ts        # Host player authentication
│   ├── local-player.ts     # Local guest player management
│   ├── add-player-modal.ts # Add player modal for arcade mode
│   ├── toast.ts            # Toast notification system
│   ├── test-marker.ts      # Testing utilities
│   ├── ws-handlers.ts      # WebSocket message handlers
│   ├── core/               # Core game components
│   ├── managers/           # Game managers and controllers
│   ├── tests/              # Test files
│   └── utils/              # Utility functions
├── css/
│   └── style.css           # Global styles
├── nginx/
│   └── nginx.conf          # Nginx configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.js          # Vite build configuration
└── index.html              # Main HTML template
```

### Key Components Implementation:

#### app.ts (Main Controller - 1953 lines):
```
Responsibilities:
- Screen management and navigation (login, main menu, game lobby, etc.)
- User authentication flow (login, register, logout)
- Game mode selection and configuration (co-op, arcade, tournament)
- Game mode tabs and settings display
- Arcade mode player management (drag-and-drop teams, add local players)
- Local player system (guest players for arcade/tournament)
- UI state coordination across screens
- Event handling and routing
- Modal management (login, registration, add player, etc.)
- Campaign progress tracking and display
- Tournament lobby management
- Profile screen with statistics display
- Settings screen
- Zoom controls for UI scaling
```

#### game.ts (Core Game Engine - 3510 lines - LARGEST FILE) - DETAILED IMPLEMENTATION:

**Class Structure**:
```typescript
export class GameManager {
  private static instanceCounter: number = 0;
  private instanceId: number;
  
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private websocket: WebSocket | null = null;
  private gameState: GameState | null = null;
  public isPlaying: boolean = false;
  public isPaused: boolean = false;
  private keys: KeyState = {};  // Track pressed keys
  private lastKeyPressTime: { [key: string]: number } = {};
  private inputInterval: ReturnType<typeof setInterval> | null = null;
  
  // Game settings
  private gameSettings: GameSettings = {
    gameMode: 'coop',
    aiDifficulty: 'medium',
    ballSpeed: 'medium',
    paddleSpeed: 'medium',
    powerupsEnabled: false,
    accelerateOnHit: false,
    scoreToWin: 3
  };
  
  // Campaign mode
  private isCampaignMode: boolean = false;
  private currentCampaignLevel: number = 1;
  
  // Arcade mode
  private team1Players: any[] = [];
  private team2Players: any[] = [];
  
  // Tournament mode
  private currentTournamentMatch: any = null;
  
  constructor() {
    this.instanceId = ++GameManager.instanceCounter;
    console.log(`GameManager instance #${this.instanceId} created`);
  }
}
```

**WebSocket Connection**:
```typescript
connectWebSocket(): void {
  const wsUrl = 'ws://localhost/api/game/ws';
  this.websocket = new WebSocket(wsUrl);
  
  this.websocket.onopen = () => {
    console.log('WebSocket connected');
    // Send join game message based on mode
  };
  
  this.websocket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    this.handleGameMessage(message);
  };
  
  this.websocket.onclose = () => {
    console.log('WebSocket closed');
    this.cleanup();
  };
  
  this.websocket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

handleGameMessage(message: any): void {
  switch (message.type) {
    case 'gameStart':
      this.startGame(message);
      break;
    case 'gameStateUpdate':
      this.gameState = message.gameState;
      this.render();
      break;
    case 'countdown':
      this.showCountdown(message.value);
      break;
    case 'score':
      this.handleScore(message);
      break;
    case 'gameOver':
      this.handleGameOver(message);
      break;
  }
}
```

**Input Handling - EXACT KEY MAPPINGS**:
```typescript
startInputHandler(): void {
  // Set up keyboard listeners
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (!this.keys[key]) {
      this.keys[key] = true;
      this.lastKeyPressTime[key] = Date.now();
    }
  });
  
  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    this.keys[key] = false;
    delete this.lastKeyPressTime[key];
  });
  
  // Start input processing loop
  this.inputInterval = setInterval(() => {
    if (this.isPlaying && !this.isPaused) {
      switch (this.gameSettings.gameMode) {
        case 'coop':
          this.handleCoopInputs();
          break;
        case 'arcade':
          this.handleArcadeInputs();
          break;
        case 'tournament':
          this.handleTournamentInputs();
          break;
      }
    }
  }, 1000 / 60);  // 60 FPS input polling
}

private handleCoopInputs(): void {
  // Co-op mode: Single player controls
  // W/S or Arrow Up/Down
  const upPressed = this.keys['w'] || this.keys['arrowup'];
  const downPressed = this.keys['s'] || this.keys['arrowdown'];
  
  if (upPressed && downPressed) {
    // Both pressed: use most recent
    const upTime = Math.max(
      this.lastKeyPressTime['w'] || 0,
      this.lastKeyPressTime['arrowup'] || 0
    );
    const downTime = Math.max(
      this.lastKeyPressTime['s'] || 0,
      this.lastKeyPressTime['arrowdown'] || 0
    );
    
    if (downTime > upTime) {
      this.sendMovePaddle('down');
    } else {
      this.sendMovePaddle('up');
    }
  } else if (upPressed) {
    this.sendMovePaddle('up');
  } else if (downPressed) {
    this.sendMovePaddle('down');
  }
}

private handleArcadeInputs(): void {
  // Arcade mode: Multiple players per team
  // Team 1 controls: Q/A (player 0), W/S (player 1), E/D (player 2)
  // Team 2 controls: U/J (player 0), I/K (player 1), O/L (player 2)
  
  // Team 1 Player 0 (Q/A)
  if (this.keys['q']) {
    this.sendMovePaddle('up', 1, 0);
  } else if (this.keys['a']) {
    this.sendMovePaddle('down', 1, 0);
  }
  
  // Team 1 Player 1 (W/S)
  if (this.keys['w']) {
    this.sendMovePaddle('up', 1, 1);
  } else if (this.keys['s']) {
    this.sendMovePaddle('down', 1, 1);
  }
  
  // Team 1 Player 2 (E/D)
  if (this.keys['e']) {
    this.sendMovePaddle('up', 1, 2);
  } else if (this.keys['d']) {
    this.sendMovePaddle('down', 1, 2);
  }
  
  // Team 2 Player 0 (U/J)
  if (this.keys['u']) {
    this.sendMovePaddle('up', 2, 0);
  } else if (this.keys['j']) {
    this.sendMovePaddle('down', 2, 0);
  }
  
  // Team 2 Player 1 (I/K)
  if (this.keys['i']) {
    this.sendMovePaddle('up', 2, 1);
  } else if (this.keys['k']) {
    this.sendMovePaddle('down', 2, 1);
  }
  
  // Team 2 Player 2 (O/L)
  if (this.keys['o']) {
    this.sendMovePaddle('up', 2, 2);
  } else if (this.keys['l']) {
    this.sendMovePaddle('down', 2, 2);
  }
}

private handleTournamentInputs(): void {
  // Tournament mode: Two players on same keyboard
  // Player 1 (left): W/S or Arrow keys
  // Player 2 (right): U/J keys
  
  // Player 1 (left paddle) - send playerId: 1
  const p1UpPressed = this.keys['w'] || this.keys['arrowup'];
  const p1DownPressed = this.keys['s'] || this.keys['arrowdown'];
  
  if (p1UpPressed && p1DownPressed) {
    // Handle conflict
    const upTime = Math.max(
      this.lastKeyPressTime['w'] || 0,
      this.lastKeyPressTime['arrowup'] || 0
    );
    const downTime = Math.max(
      this.lastKeyPressTime['s'] || 0,
      this.lastKeyPressTime['arrowdown'] || 0
    );
    
    this.sendMovePaddle(downTime > upTime ? 'down' : 'up', 1);
  } else if (p1UpPressed) {
    this.sendMovePaddle('up', 1);
  } else if (p1DownPressed) {
    this.sendMovePaddle('down', 1);
  }
  
  // Player 2 (right paddle) - send playerId: 2
  const p2UpPressed = this.keys['u'];
  const p2DownPressed = this.keys['j'];
  
  if (p2UpPressed && p2DownPressed) {
    const upTime = this.lastKeyPressTime['u'] || 0;
    const downTime = this.lastKeyPressTime['j'] || 0;
    this.sendMovePaddle(downTime > upTime ? 'down' : 'up', 2);
  } else if (p2UpPressed) {
    this.sendMovePaddle('up', 2);
  } else if (p2DownPressed) {
    this.sendMovePaddle('down', 2);
  }
}

private sendMovePaddle(direction: 'up' | 'down', playerId?: number, paddleIndex?: number): void {
  const message: any = {
    type: 'movePaddle',
    direction: direction
  };
  
  if (playerId !== undefined) {
    message.playerId = playerId;
  }
  
  if (paddleIndex !== undefined) {
    message.paddleIndex = paddleIndex;
  }
  
  this.websocket?.send(JSON.stringify(message));
}
```

**Canvas Rendering - EXACT DRAW ALGORITHM**:
```typescript
render(): void {
  if (!this.ctx || !this.gameState) return;
  
  const ctx = this.ctx;
  const state = this.gameState;
  
  // Clear canvas
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 800, 600);
  
  // Draw center line
  ctx.strokeStyle = '#333';
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(400, 0);
  ctx.lineTo(400, 600);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw scores
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(state.scores.player1.toString(), 200, 80);
  ctx.fillText(state.scores.player2.toString(), 600, 80);
  
  // Draw paddles
  ctx.fillStyle = '#77e6ff';
  
  if (this.gameSettings.gameMode === 'arcade' || this.gameSettings.gameMode === 'tournament') {
    // Draw team paddles
    if (state.leftPaddles) {
      for (const paddle of state.leftPaddles) {
        ctx.fillRect(paddle.x, paddle.y, 10, 100);
        
        // Draw player username
        if (paddle.username) {
          ctx.font = '12px Arial';
          ctx.fillText(paddle.username, paddle.x + 5, paddle.y - 5);
        }
      }
    }
    
    if (state.rightPaddles) {
      for (const paddle of state.rightPaddles) {
        ctx.fillRect(paddle.x, paddle.y, 10, 100);
        
        if (paddle.username) {
          ctx.font = '12px Arial';
          ctx.fillText(paddle.username, paddle.x + 5, paddle.y - 5);
        }
      }
    }
  } else {
    // Draw single paddles
    ctx.fillRect(state.leftPaddle.x, state.leftPaddle.y, 10, 100);
    ctx.fillRect(state.rightPaddle.x, state.rightPaddle.y, 10, 100);
  }
  
  // Draw ball
  if (!state.ball.frozen) {
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw campaign level indicator
  if (this.isCampaignMode) {
    const levelDisplay = document.getElementById('campaign-level-display');
    const levelNumber = document.getElementById('current-level-number');
    if (levelDisplay && levelNumber) {
      levelDisplay.style.display = 'block';
      levelNumber.textContent = this.currentCampaignLevel.toString();
      
      // Update progress bar
      const progressFill = document.getElementById('campaign-progress-fill');
      if (progressFill) {
        const progress = (this.currentCampaignLevel / 21) * 100;
        progressFill.style.width = `${progress}%`;
      }
    }
  }
}
```

**Campaign Mode Progression**:
```typescript
private handleGameOver(message: any): void {
  this.isPlaying = false;
  
  if (this.isCampaignMode && message.winner === 'player1') {
    // Player won campaign level
    this.currentCampaignLevel++;
    
    // Update user profile campaign level
    fetch('/api/user/campaign-level', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: this.currentCampaignLevel })
    });
    
    if (this.currentCampaignLevel <= 21) {
      // Show victory modal with "Next Level" button
      this.showVictoryModal();
    } else {
      // Campaign complete!
      this.showCampaignCompleteModal();
    }
  } else if (this.isCampaignMode) {
    // Player lost
    this.showGameOverModal();
  }
}

private startNextCampaignLevel(): void {
  // Increase AI difficulty based on level
  const difficulty = this.currentCampaignLevel <= 7 ? 'easy' :
                     this.currentCampaignLevel <= 14 ? 'medium' : 'hard';
  
  this.gameSettings.aiDifficulty = difficulty;
  
  // Optionally increase ball speed
  if (this.currentCampaignLevel > 10) {
    this.gameSettings.ballSpeed = 'fast';
  }
  
  // Start new match
  this.startCampaignMatch();
}
```

#### tournament.ts (Tournament System - 1409 lines) - DETAILED IMPLEMENTATION:

**Class Structure**:
```typescript
export class TournamentManager {
  private currentTournament: any = null;
  private participants: any[] = [];
  private matches: any[] = [];
  
  constructor() {
    console.log('TournamentManager initialized');
  }
}
```

**Tournament Creation**:
```typescript
async createTournament(name: string, description: string, maxParticipants: number): Promise<number> {
  const currentUser = (window as any).app.currentUser;
  
  const response = await fetch('/api/tournament/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description,
      maxParticipants,
      createdBy: currentUser.id
    })
  });
  
  const data = await response.json();
  return data.tournamentId;
}
```

**Bracket Visualization - EXACT SVG RENDERING**:
```typescript
renderBracket(tournamentData: any): void {
  const container = document.getElementById('tournament-bracket');
  if (!container) return;
  
  const { matches, bracket } = tournamentData;
  const rounds = bracket.rounds;
  
  // Clear existing bracket
  container.innerHTML = '';
  
  // Create SVG canvas
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '1200');
  svg.setAttribute('height', '800');
  svg.style.border = '1px solid #333';
  
  // Calculate spacing
  const roundWidth = 1200 / (rounds + 1);
  const matchHeight = 100;
  
  // Group matches by round
  const matchesByRound = new Map();
  for (const match of matches) {
    if (!matchesByRound.has(match.round)) {
      matchesByRound.set(match.round, []);
    }
    matchesByRound.get(match.round).push(match);
  }
  
  // Render each round (from right to left: finals, semis, quarters)
  for (let round = 1; round <= rounds; round++) {
    const roundMatches = matchesByRound.get(round) || [];
    const x = 1200 - (round * roundWidth);
    const matchesInRound = roundMatches.length;
    const verticalSpacing = 800 / (matchesInRound + 1);
    
    // Draw round label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x.toString());
    label.setAttribute('y', '30');
    label.setAttribute('fill', '#ffffff');
    label.setAttribute('font-size', '16');
    label.textContent = getRoundLabel(round, rounds);
    svg.appendChild(label);
    
    // Draw matches in this round
    roundMatches.forEach((match, index) => {
      const y = verticalSpacing * (index + 1);
      
      // Draw match box
      const matchGroup = this.createMatchBox(match, x, y, matchHeight);
      svg.appendChild(matchGroup);
      
      // Draw connector lines to next round
      if (round > 1) {
        const nextX = x + roundWidth;
        const nextY = verticalSpacing * (Math.floor(index / 2) + 1);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', (x + 200).toString());
        line.setAttribute('y1', (y + matchHeight / 2).toString());
        line.setAttribute('x2', nextX.toString());
        line.setAttribute('y2', (nextY + matchHeight / 2).toString());
        line.setAttribute('stroke', '#555');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
      }
    });
  }
  
  container.appendChild(svg);
}

createMatchBox(match: any, x: number, y: number, height: number): SVGElement {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  
  // Match container rectangle
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', x.toString());
  rect.setAttribute('y', y.toString());
  rect.setAttribute('width', '180');
  rect.setAttribute('height', height.toString());
  rect.setAttribute('fill', match.status === 'completed' ? '#1a4a1a' : '#1a1a2e');
  rect.setAttribute('stroke', match.status === 'pending' ? '#77e6ff' : '#4a4a4a');
  rect.setAttribute('stroke-width', '2');
  rect.setAttribute('rx', '5');
  group.appendChild(rect);
  
  // Player 1 name
  const player1Text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  player1Text.setAttribute('x', (x + 10).toString());
  player1Text.setAttribute('y', (y + 30).toString());
  player1Text.setAttribute('fill', match.winner_id === match.player1_id ? '#77e6ff' : '#ffffff');
  player1Text.setAttribute('font-size', '14');
  player1Text.setAttribute('font-weight', match.winner_id === match.player1_id ? 'bold' : 'normal');
  player1Text.textContent = match.player1_username || 'BYE';
  group.appendChild(player1Text);
  
  // Player 2 name
  const player2Text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  player2Text.setAttribute('x', (x + 10).toString());
  player2Text.setAttribute('y', (y + 60).toString());
  player2Text.setAttribute('fill', match.winner_id === match.player2_id ? '#77e6ff' : '#ffffff');
  player2Text.setAttribute('font-size', '14');
  player2Text.setAttribute('font-weight', match.winner_id === match.player2_id ? 'bold' : 'normal');
  player2Text.textContent = match.player2_username || 'BYE';
  group.appendChild(player2Text);
  
  // Scores (if completed)
  if (match.status === 'completed') {
    const scoreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    scoreText.setAttribute('x', (x + 150).toString());
    scoreText.setAttribute('y', (y + 45).toString());
    scoreText.setAttribute('fill', '#ffffff');
    scoreText.setAttribute('font-size', '12');
    scoreText.textContent = `${match.player1_score}-${match.player2_score}`;
    group.appendChild(scoreText);
  }
  
  // Add click handler for pending matches
  if (match.status === 'pending' && match.player1_id && match.player2_id) {
    rect.style.cursor = 'pointer';
    rect.addEventListener('click', () => {
      this.playMatchFromCard(match);
    });
  }
  
  return group;
}

function getRoundLabel(round: number, totalRounds: number): string {
  if (round === 1) return 'Finals';
  if (round === 2) return 'Semifinals';
  if (round === 3) return 'Quarterfinals';
  return `Round ${round}`;
}
```

**Match Playback - Local 1v1**:
```typescript
async playMatchFromCard(match: any): Promise<void> {
  // Show side selection modal
  const sideSelection = await this.showSideSelectionModal(match);
  
  // sideSelection: { leftPlayer: userId, rightPlayer: userId }
  const originalPlayer1Id = match.player1_id;
  const originalPlayer2Id = match.player2_id;
  
  // Store match data
  const matchData = {
    tournamentId: match.tournament_id,
    matchId: match.id,
    player1Id: sideSelection.leftPlayer,  // Current left
    player2Id: sideSelection.rightPlayer,  // Current right
    originalPlayer1Id,  // For result reporting
    originalPlayer2Id,
    scoreToWin: 3
  };
  
  // Navigate to game screen
  (window as any).app.showScreen('game-screen');
  
  // Start tournament match
  const gameManager = (window as any).gameManager;
  await gameManager.startTournamentMatch(matchData);
}

showSideSelectionModal(match: any): Promise<any> {
  return new Promise((resolve) => {
    const modal = document.getElementById('side-selection-modal');
    const player1 = document.getElementById('side-player1-name');
    const player2 = document.getElementById('side-player2-name');
    
    player1.textContent = match.player1_username;
    player2.textContent = match.player2_username;
    
    modal.style.display = 'flex';
    
    // Button: Player 1 on left
    document.getElementById('side-normal-btn').onclick = () => {
      modal.style.display = 'none';
      resolve({
        leftPlayer: match.player1_id,
        rightPlayer: match.player2_id
      });
    };
    
    // Button: Player 2 on left (swap sides)
    document.getElementById('side-swap-btn').onclick = () => {
      modal.style.display = 'none';
      resolve({
        leftPlayer: match.player2_id,
        rightPlayer: match.player1_id
      });
    };
  });
}
```

**Result Submission**:
```typescript
async submitMatchResult(matchData: any, winnerId: number, player1Score: number, player2Score: number): Promise<void> {
  // Map winner back to original player IDs
  const actualWinnerId = winnerId === matchData.player1Id ? 
                         matchData.originalPlayer1Id : 
                         matchData.originalPlayer2Id;
  
  // Map scores back to original players
  const actualPlayer1Score = matchData.player1Id === matchData.originalPlayer1Id ? 
                             player1Score : player2Score;
  const actualPlayer2Score = matchData.player2Id === matchData.originalPlayer2Id ? 
                             player2Score : player1Score;
  
  await fetch('/api/tournament/match/result', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tournamentId: matchData.tournamentId,
      matchId: matchData.matchId,
      winnerId: actualWinnerId,
      player1Score: actualPlayer1Score,
      player2Score: actualPlayer2Score
    })
  });
  
  // Refresh tournament data
  await this.loadTournamentDetails(matchData.tournamentId);
}
```

### UI Components:
- **Responsive Design**: Mobile and desktop support
- **Modern UI**: Clean, game-focused interface
- **Real-time Updates**: Live data synchronization
- **Modal System**: Login, registration, settings modals
- **Navigation**: Seamless screen transitions
- **Toast Notifications**: User feedback system

---

## 🔧 BACKEND MICROSERVICES PROMPT

**Implement four microservices with the following specifications:**

### 1. Auth Service (Port 3001) - DETAILED IMPLEMENTATION

**Database Setup**: SQLite (auth.db)
```typescript
// Create tables on service startup
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  used BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

**Fastify Server Setup**:
```typescript
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import cors from '@fastify/cors';

const fastify = Fastify({ logger: true });

// Register cookie plugin with secret for signing
await fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET || 'your-secret-key-min-32-chars',
  parseOptions: {}
});

// Register CORS with credentials support
await fastify.register(cors, {
  origin: 'http://localhost',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});
```

**API Endpoints - EXACT IMPLEMENTATION**:

**POST /register**:
```typescript
// Request body: { username: string, email: string, password: string }
// 1. Validate: username length 3-20, email format, password min 6 chars
// 2. Check if username or email already exists in database
// 3. Hash password using bcrypt with salt rounds 10
// 4. Insert user into database
// 5. Return: { success: true, message: 'User registered', userId: number }
// Error cases: 400 for validation, 409 for duplicate username/email
```

**POST /login**:
```typescript
// Request body: { username: string, password: string }
// 1. Find user by username in database
// 2. Compare password with bcrypt.compare()
// 3. Generate JWT token with payload: { userId, username, email }
// 4. Sign JWT with secret, expiration 24h
// 5. Set HTTP-only cookie:
   reply.setCookie('token', jwtToken, {
     httpOnly: true,
     sameSite: 'strict',
     maxAge: 86400, // 24 hours in seconds
     path: '/',
     secure: false // Set true in production with HTTPS
   });
// 6. Update last_login timestamp in database
// 7. Return: { success: true, user: { id, username, email } }
// Error cases: 401 for invalid credentials, 404 for user not found
```

**POST /logout**:
```typescript
// 1. Clear the HTTP-only cookie:
   reply.clearCookie('token', {
     httpOnly: true,
     sameSite: 'strict',
     path: '/'
   });
// 2. Return: { success: true, message: 'Logged out' }
```

**POST /verify**:
```typescript
// 1. Read token from cookie: request.cookies.token
// 2. Fallback to Authorization header if cookie not present (backward compatibility)
// 3. Verify JWT token signature and expiration
// 4. Extract userId from payload
// 5. Query user from database by userId
// 6. Return: { valid: true, user: { id, username, email } }
// Error cases: 401 for invalid/expired token
```

**POST /forgot-password**:
```typescript
// Request body: { email: string }
// 1. Find user by email
// 2. Generate random token (32 bytes, hex)
// 3. Set expiration (1 hour from now)
// 4. Store in password_reset_tokens table
// 5. In production: Send email with reset link
// 6. Return: { success: true, message: 'Reset link sent' }
// For demo: Also return token in response
```

**POST /reset-password**:
```typescript
// Request body: { token: string, newPassword: string }
// 1. Find token in password_reset_tokens table
// 2. Check: token not used, not expired
// 3. Hash new password with bcrypt
// 4. Update user password_hash
// 5. Mark token as used
// 6. Return: { success: true, message: 'Password reset' }
// Error cases: 400 for invalid/expired token
```

**Environment Variables**:
```bash
PORT=3000
SERVICE_NAME=auth-service
JWT_SECRET=your-jwt-secret-min-32-characters
COOKIE_SECRET=your-cookie-secret-min-32-characters
NODE_ENV=development
```

### 2. Game Service (Port 3002) - DETAILED IMPLEMENTATION

**Database Schema**:
```sql
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player1_id INTEGER NOT NULL,
  player2_id INTEGER NOT NULL,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  winner_id INTEGER,
  game_mode TEXT DEFAULT 'coop',
  team1_players TEXT,  -- JSON array of player objects
  team2_players TEXT,  -- JSON array of player objects
  tournament_id INTEGER,
  tournament_match_id INTEGER
);

CREATE TABLE IF NOT EXISTS game_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games (id)
);
```

**WebSocket Server Setup**:
```typescript
import Fastify from 'fastify';
import websocket from '@fastify/websocket';

const fastify = Fastify({ logger: true });
await fastify.register(websocket);

// WebSocket route
fastify.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    // Handle WebSocket connection
    console.log('New WebSocket connection');
    
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString());
      handleGameMessage(socket, message);
    });
    
    socket.on('close', () => {
      // Remove player from active games
      handleDisconnect(socket);
    });
  });
});
```

**WebSocket Message Protocol - EXACT FORMAT**:

**Client → Server Messages**:

1. **Join Co-op/Campaign Match**:
```json
{
  "type": "joinGame",
  "userId": 123,
  "username": "player1",
  "gameSettings": {
    "gameMode": "coop",
    "aiDifficulty": "medium",
    "ballSpeed": "medium",
    "paddleSpeed": "medium",
    "powerupsEnabled": false,
    "accelerateOnHit": false,
    "scoreToWin": 3
  }
}
```

2. **Join Arcade Team Match**:
```json
{
  "type": "joinGame",
  "userId": 123,
  "username": "player1",
  "gameSettings": {
    "gameMode": "arcade",
    "team1PlayerCount": 2,
    "team2PlayerCount": 2,
    "team1Players": [
      {"userId": 123, "username": "player1", "paddleIndex": 0},
      {"userId": -1, "username": "Guest1", "paddleIndex": 1}
    ],
    "team2Players": [
      {"userId": -2, "username": "Guest2", "paddleIndex": 0},
      {"userId": -3, "username": "Guest3", "paddleIndex": 1}
    ],
    "ballSpeed": "medium",
    "paddleSpeed": "medium",
    "scoreToWin": 5
  }
}
```

3. **Join Tournament Match**:
```json
{
  "type": "joinGame",
  "userId": 123,
  "username": "player1",
  "gameSettings": {
    "gameMode": "tournament",
    "tournamentId": 5,
    "matchId": 12,
    "player1Id": 123,
    "player2Id": 456,
    "scoreToWin": 3
  }
}
```

4. **Move Paddle**:
```json
{
  "type": "movePaddle",
  "direction": "up" | "down",
  "playerId": 1 | 2,  // Optional: 1=left/team1, 2=right/team2
  "paddleIndex": 0    // Optional: for arcade mode multi-paddle
}
```

**Server → Client Messages**:

1. **Game Start**:
```json
{
  "type": "gameStart",
  "gameId": 42,
  "gameSettings": { /* full settings */ },
  "gameState": {
    "ball": {"x": 400, "y": 300, "dx": 5, "dy": 3, "frozen": true},
    "paddles": {
      "player1": {"x": 50, "y": 250},
      "player2": {"x": 750, "y": 250},
      "team1": [{"x": 50, "y": 200}, {"x": 50, "y": 400}],
      "team2": [{"x": 750, "y": 200}, {"x": 750, "y": 400}]
    },
    "scores": {"player1": 0, "player2": 0},
    "status": "countdown"
  },
  "config": {
    "canvasWidth": 800,
    "canvasHeight": 600,
    "paddleWidth": 10,
    "paddleHeight": 100,
    "ballRadius": 5,
    "paddleSpeed": 5
  }
}
```

2. **Game State Update (60 FPS)**:
```json
{
  "type": "gameStateUpdate",
  "gameState": {
    "ball": {"x": 405.5, "y": 303.2, "dx": 5.5, "dy": 3.2, "frozen": false},
    "paddles": { /* current paddle positions */ },
    "scores": {"player1": 1, "player2": 0},
    "status": "playing"
  }
}
```

3. **Countdown**:
```json
{
  "type": "countdown",
  "value": 3 | 2 | 1 | "GO!"
}
```

4. **Score Event**:
```json
{
  "type": "score",
  "scorer": "player1" | "player2",
  "scores": {"player1": 2, "player2": 1}
}
```

5. **Game Over**:
```json
{
  "type": "gameOver",
  "winner": "player1" | "player2",
  "finalScores": {"player1": 3, "player2": 1},
  "gameId": 42
}
```

**Server-Side Game Physics - EXACT ALGORITHM**:

```typescript
class GamePhysics {
  private ballSpeed: number;
  private accelerateOnHit: boolean;
  private gameMode: string;
  
  updateBall(ball: Ball, paddles: Paddles, gameId: number): ScoreResult {
    if (ball.frozen) return { scored: false };
    
    // Update ball position
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Wall collision (top/bottom)
    if (ball.y <= 0 || ball.y >= 600) {
      ball.dy = -ball.dy;
    }
    
    // Left paddle collision (x: 50-60)
    if (ball.x <= 60 && ball.x >= 50) {
      if (this.gameMode === 'arcade' || this.gameMode === 'tournament') {
        // Check team1 paddles array
        for (const paddle of paddles.team1) {
          if (ball.y >= paddle.y && ball.y <= paddle.y + 100) {
            this.handlePaddleHit(ball, paddle, 'left', gameId);
            return { scored: false };
          }
        }
      } else {
        // Check single player1 paddle
        if (ball.y >= paddles.player1.y && ball.y <= paddles.player1.y + 100) {
          this.handlePaddleHit(ball, paddles.player1, 'left', gameId);
          return { scored: false };
        }
      }
    }
    
    // Right paddle collision (x: 740-750)
    if (ball.x >= 740 && ball.x <= 750) {
      // Similar logic for team2/player2
    }
    
    // Scoring
    if (ball.x < 0) return { scored: true, scorer: 'player2' };
    if (ball.x > 800) return { scored: true, scorer: 'player1' };
    
    return { scored: false };
  }
  
  handlePaddleHit(ball: Ball, paddle: Paddle, side: 'left' | 'right', gameId: number) {
    // Calculate hit position (0.0 to 1.0)
    const hitPos = (ball.y - paddle.y) / 100;
    
    // Calculate reflection angle (-45° to +45°)
    const angle = side === 'left'
      ? (hitPos - 0.5) * Math.PI / 2  // 0° to 90° for left
      : Math.PI + (hitPos - 0.5) * Math.PI / 2;  // 180° to 270° for right
    
    const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    let newSpeed = currentSpeed;
    
    if (this.accelerateOnHit) {
      newSpeed = Math.min(currentSpeed * 1.1, this.ballSpeed * 2);
      console.log(`Ball accelerated: ${currentSpeed} → ${newSpeed}`);
    }
    
    ball.dx = Math.abs(newSpeed) * Math.cos(angle);
    ball.dy = newSpeed * Math.sin(angle);
  }
  
  movePaddle(paddles: Paddles, playerId: number, direction: 'up' | 'down', 
             gameMode: string, paddleSpeed: number, paddleIndex?: number): boolean {
    let paddle: Paddle;
    
    if (gameMode === 'arcade' && paddleIndex !== undefined) {
      // Arcade mode with paddleIndex
      const team = playerId === 1 ? 'team1' : 'team2';
      paddle = paddles[team][paddleIndex];
    } else if (gameMode === 'tournament') {
      // Tournament: playerId 1=left(team1), 2=right(team2)
      const team = playerId === 1 ? 'team1' : 'team2';
      paddle = paddles[team][0];
    } else {
      // Co-op mode: single paddles
      paddle = playerId === 1 ? paddles.player1 : paddles.player2;
    }
    
    if (!paddle) return false;
    
    // Update paddle position
    if (direction === 'up') {
      paddle.y = Math.max(0, paddle.y - paddleSpeed);
    } else {
      paddle.y = Math.min(500, paddle.y + paddleSpeed);
    }
    
    return true;
  }
}
```

**AI Bot Implementation**:
```typescript
class GameAI {
  private difficulty: 'easy' | 'medium' | 'hard';
  private reactionDelay: number;
  private errorMargin: number;
  
  constructor(difficulty: string) {
    this.difficulty = difficulty;
    // Easy: slow reaction, large error
    // Medium: moderate reaction, medium error
    // Hard: fast reaction, minimal error
    this.reactionDelay = difficulty === 'easy' ? 100 : difficulty === 'medium' ? 50 : 20;
    this.errorMargin = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 15 : 5;
  }
  
  updateAI(paddle: Paddle, ball: Ball, paddleSpeed: number) {
    // Only move if ball is moving toward AI paddle
    if (ball.dx > 0) {  // Ball moving right (toward AI)
      const targetY = ball.y + (Math.random() - 0.5) * this.errorMargin;
      const paddleCenter = paddle.y + 50;
      
      if (targetY < paddleCenter - 10) {
        paddle.y = Math.max(0, paddle.y - paddleSpeed);
      } else if (targetY > paddleCenter + 10) {
        paddle.y = Math.min(500, paddle.y + paddleSpeed);
      }
    }
  }
}
```

**Game Loop (60 FPS)**:
```typescript
class PongGame {
  private gameLoop: NodeJS.Timeout;
  
  start() {
    this.gameLoop = setInterval(() => {
      // Update physics
      const scoreResult = this.physics.updateBall(this.ball, this.paddles, this.gameId);
      
      // Handle scoring
      if (scoreResult.scored) {
        this.handleScore(scoreResult.scorer);
      }
      
      // Update AI if co-op mode
      if (this.gameSettings.gameMode === 'coop') {
        this.ai.updateAI(this.paddles.player2, this.ball, this.paddleSpeed);
      }
      
      // Broadcast state to clients
      this.broadcastGameState();
      
      // Check win condition
      if (this.scores.player1 >= this.gameSettings.scoreToWin ||
          this.scores.player2 >= this.gameSettings.scoreToWin) {
        this.endGame();
      }
    }, 1000 / 60);  // 60 FPS
  }
}
```

### 3. Tournament Service (Port 3003) - DETAILED IMPLEMENTATION

**Database Schema**:
```sql
CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  max_participants INTEGER DEFAULT 8,
  current_participants INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',  -- open, in_progress, completed
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  finished_at DATETIME,
  winner_id INTEGER
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  eliminated_at DATETIME,
  final_rank INTEGER,  -- 1, 2, 3, 4, etc.
  FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
  UNIQUE(tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  round INTEGER NOT NULL,  -- 1=finals, 2=semifinals, 3=quarterfinals, etc.
  match_number INTEGER NOT NULL,  -- Match number within the round
  player1_id INTEGER,  -- NULL for BYE
  player2_id INTEGER,  -- NULL for BYE
  winner_id INTEGER,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',  -- pending, in_progress, completed
  played_at DATETIME,
  FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
);
```

**API Endpoints - EXACT IMPLEMENTATION**:

**POST /create**:
```typescript
// Request body:
{
  "name": "Summer Championship",
  "description": "Epic tournament",
  "maxParticipants": 8,
  "createdBy": 123
}

// Algorithm:
// 1. Validate: maxParticipants must be power of 2 (4, 8, 16, 32)
// 2. Insert tournament into tournaments table
// 3. Return: { success: true, tournamentId: number }
```

**POST /join**:
```typescript
// Request body: { tournamentId: 5, userId: 456 }
// Algorithm:
// 1. Check tournament status is 'open'
// 2. Check not already joined
// 3. Check current_participants < max_participants
// 4. Insert into tournament_participants
// 5. Increment current_participants
// 6. Return: { success: true }
```

**POST /start/:tournamentId**:
```typescript
// Algorithm - BRACKET GENERATION:
// 1. Get all participants for tournament
// 2. Calculate rounds needed: Math.ceil(Math.log2(participantCount))
// 3. Calculate bracket size: next power of 2 >= participantCount
// 4. Calculate BYEs: bracketSize - participantCount
// 5. Shuffle participants randomly
// 6. Generate first round matches:

function generateBracket(participants: number[], tournamentId: number) {
  const participantCount = participants.length;
  const rounds = Math.ceil(Math.log2(participantCount));
  const bracketSize = Math.pow(2, rounds);
  const byeCount = bracketSize - participantCount;
  
  console.log(`Participants: ${participantCount}, Rounds: ${rounds}, BYEs: ${byeCount}`);
  
  // Shuffle participants
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  
  // Generate first round matches
  const firstRoundMatches = [];
  const matchesInRound = bracketSize / 2;
  
  for (let i = 0; i < matchesInRound; i++) {
    const player1Index = i * 2;
    const player2Index = i * 2 + 1;
    
    const player1 = player1Index < shuffled.length ? shuffled[player1Index] : null;
    const player2 = player2Index < shuffled.length ? shuffled[player2Index] : null;
    
    // Create match
    const match = {
      tournament_id: tournamentId,
      round: rounds,  // Round 3 for 8-player, Round 2 for 4-player
      match_number: i + 1,
      player1_id: player1,
      player2_id: player2,
      status: 'pending'
    };
    
    // If one player is null (BYE), immediately advance the other
    if (player1 === null || player2 === null) {
      match.winner_id = player1 || player2;
      match.status = 'completed';
      match.played_at = new Date();
    }
    
    firstRoundMatches.push(match);
  }
  
  // Insert matches into database
  return firstRoundMatches;
}

// 7. Update tournament status to 'in_progress'
// 8. Set started_at timestamp
// 9. Return: { success: true, matches: [...] }
```

**POST /match/result**:
```typescript
// Request body:
{
  "tournamentId": 5,
  "matchId": 12,
  "winnerId": 123,
  "player1Score": 3,
  "player2Score": 1
}

// Algorithm - MATCH COMPLETION & ADVANCEMENT:
// 1. Update match: set winner_id, scores, status='completed', played_at
// 2. Update loser: set eliminated_at in tournament_participants
// 3. Check if round is complete (all matches in round have winners)
// 4. If round complete:
//    a. Calculate next round number (current - 1)
//    b. If next round > 0: Generate next round matches
//    c. If next round === 0: Tournament complete, calculate rankings

function generateNextRound(tournamentId: number, currentRound: number) {
  // Get winners from current round
  const winners = getWinnersFromRound(tournamentId, currentRound);
  const nextRound = currentRound - 1;
  const matchesInNextRound = winners.length / 2;
  
  if (nextRound === 0) {
    // Tournament complete
    completeTournament(tournamentId);
    return;
  }
  
  // Create next round matches
  const nextRoundMatches = [];
  for (let i = 0; i < matchesInNextRound; i++) {
    nextRoundMatches.push({
      tournament_id: tournamentId,
      round: nextRound,
      match_number: i + 1,
      player1_id: winners[i * 2],
      player2_id: winners[i * 2 + 1],
      status: 'pending'
    });
  }
  
  return nextRoundMatches;
}

function completeTournament(tournamentId: number) {
  // 1. Get final match (round 1)
  const finalMatch = getFinalMatch(tournamentId);
  
  // 2. Set tournament winner
  updateTournament(tournamentId, {
    status: 'completed',
    finished_at: new Date(),
    winner_id: finalMatch.winner_id
  });
  
  // 3. Calculate rankings:
  //    1st place: Final winner
  //    2nd place: Final loser
  //    3rd place: Semifinal losers
  //    4th place: Remaining semifinal losers
  const rankings = calculateRankings(tournamentId);
  
  // 4. Update participant final_rank
  for (const [userId, rank] of Object.entries(rankings)) {
    updateParticipantRank(tournamentId, userId, rank);
  }
  
  // 5. Record on blockchain
  recordTournamentOnBlockchain(tournamentId, rankings);
}

function calculateRankings(tournamentId: number): Map<number, number> {
  const rankings = new Map();
  
  // Get final match (round 1)
  const finalMatch = getMatchesByRound(tournamentId, 1)[0];
  rankings.set(finalMatch.winner_id, 1);  // 1st place
  rankings.set(finalMatch.player1_id === finalMatch.winner_id ? 
               finalMatch.player2_id : finalMatch.player1_id, 2);  // 2nd place
  
  // Get semifinal matches (round 2)
  const semifinalMatches = getMatchesByRound(tournamentId, 2);
  let rank = 3;
  for (const match of semifinalMatches) {
    const loser = match.player1_id === match.winner_id ? 
                  match.player2_id : match.player1_id;
    if (loser !== null && !rankings.has(loser)) {
      rankings.set(loser, rank++);
    }
  }
  
  // Remaining players get ranks based on elimination order
  // (quarterfinals, etc.)
  const remainingPlayers = getEliminatedPlayers(tournamentId);
  for (const player of remainingPlayers) {
    if (!rankings.has(player.user_id)) {
      rankings.set(player.user_id, rank++);
    }
  }
  
  return rankings;
}
```

**GET /details/:tournamentId**:
```typescript
// Return complete tournament data:
{
  "tournament": {
    "id": 5,
    "name": "Summer Championship",
    "status": "in_progress",
    "current_participants": 6,
    "max_participants": 8,
    "winner_id": null
  },
  "participants": [
    {"userId": 123, "username": "player1", "final_rank": null},
    {"userId": 456, "username": "player2", "final_rank": null}
  ],
  "matches": [
    {
      "id": 12,
      "round": 3,
      "match_number": 1,
      "player1_id": 123,
      "player2_id": 456,
      "winner_id": null,
      "status": "pending"
    }
  ],
  "bracket": {
    "rounds": 3,
    "roundLabels": ["Finals", "Semifinals", "Quarterfinals"]
  }
}
```

### 3. Tournament Service (Port 3003)
```
Database: SQLite (tournaments.db)
Tables:
- tournaments (id, name, description, max_participants, status, etc.)
- tournament_participants (tournament_id, user_id, joined_at, etc.)
- tournament_matches (tournament_id, round, match_number, players, etc.)

Endpoints:
- POST /create - Create new tournament
- POST /join - Join tournament
- POST /start/:tournamentId - Start tournament
- GET /details/:tournamentId - Get tournament info
- POST /match/result - Submit match results
- GET /user/:userId - Get user's tournaments

Features:
- Single-elimination bracket generation
- BYE handling for odd participant counts
- Automatic next round creation
- Tournament status management
- Final ranking calculation
- Blockchain integration for result recording
```

### 4. User Service (Port 3004)
```
Database: SQLite (users.db)
Endpoints:
- GET /stats/:userId - Get user statistics
- GET /achievements/:userId - Get user achievements
- POST /achievement/unlock - Unlock achievement
- GET /friends/:userId - Get user friends
- POST /friends/add - Add friend
- GET /leaderboard - Get global leaderboard

Features:
- Statistics tracking (wins, losses, win rate)
- Achievement system
- Friend relationships
- Leaderboard generation
- Performance analytics
```

---

## 🗄️ DATABASE SCHEMA PROMPT

**Create the following SQLite database schemas for each service:**

### Auth Service Database (auth.db):
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  used BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

Note: Authentication uses HTTP-only cookies for JWT storage (no session table needed)
```

### Game Service Database (games.db):
```sql
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player1_id INTEGER NOT NULL,
  player2_id INTEGER NOT NULL,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  winner_id INTEGER,
  game_mode TEXT DEFAULT 'coop',
  team1_players TEXT,
  team2_players TEXT,
  tournament_id INTEGER,
  tournament_match_id INTEGER
);

CREATE TABLE IF NOT EXISTS game_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games (id)
);
```

### Tournament Service Database (tournaments.db):
```sql
CREATE TABLE tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  max_participants INTEGER DEFAULT 8,
  current_participants INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  finished_at DATETIME,
  winner_id INTEGER
);

CREATE TABLE tournament_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  eliminated_at DATETIME,
  final_rank INTEGER,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
  UNIQUE(tournament_id, user_id)
);

CREATE TABLE tournament_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id INTEGER,
  player2_id INTEGER,
  winner_id INTEGER,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  played_at DATETIME,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);
```

### User Service Database (users.db):
```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  country TEXT,
  preferred_language TEXT DEFAULT 'en',
  theme_preference TEXT DEFAULT 'dark',
  notification_settings TEXT DEFAULT '{}',
  privacy_settings TEXT DEFAULT '{}',
  campaign_level INTEGER DEFAULT 1,
  wins INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  tournaments_won INTEGER DEFAULT 0,
  friends_count INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  winRate REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  reward_points INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (achievement_id) REFERENCES achievements (id),
  UNIQUE(user_id, achievement_id)
);
```

---

## 🌐 API GATEWAY & NETWORKING PROMPT

**Implement nginx configuration as API gateway with the following setup:**

### nginx.conf Configuration:
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    upstream auth_backend {
        server auth-service:3000;
    }

    upstream game_backend {
        server game-service:3000;
    }

    upstream tournament_backend {
        server tournament-service:3000;
    }

    upstream user_backend {
        server user-service:3000;
    }

    upstream blockchain_backend {
        server hardhat-node:3001;
    }

    server {
        listen 80;
        server_name localhost;

        # Serve static frontend files
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }

        # API routes for microservices
        location /api/auth/ {
            # Enable CORS preflight requests
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' 'http://localhost' always;
                add_header 'Access-Control-Allow-Credentials' 'true' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
                add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
                add_header 'Access-Control-Max-Age' 1728000;
                add_header 'Content-Type' 'text/plain; charset=utf-8';
                add_header 'Content-Length' 0;
                return 204;
            }

            proxy_pass http://auth_backend/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Pass cookies through proxy
            proxy_pass_header Set-Cookie;
            proxy_pass_header Cookie;
            
            # Enable CORS for actual requests with credentials
            add_header 'Access-Control-Allow-Origin' 'http://localhost' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        }

        location /api/game/ {
            proxy_pass http://game_backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/tournament/ {
            proxy_pass http://tournament_backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/user/ {
            proxy_pass http://user_backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/blockchain/ {
            proxy_pass http://blockchain_backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket support for real-time game
        location /api/game/ws {
            proxy_pass http://game_backend/ws;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### CORS Configuration:
- Enable CORS for all API endpoints
- Support preflight OPTIONS requests
- Allow credentials and custom headers

### WebSocket Configuration:
- Upgrade header handling for WebSocket connections
- Connection keep-alive for real-time gaming
- Proxy WebSocket traffic to game service

---

## ⛓️ BLOCKCHAIN INTEGRATION PROMPT - DETAILED IMPLEMENTATION

**Implement blockchain integration for tournament result recording with exact steps:**

### Project Structure:
```
blockchain/
├── contracts/
│   ├── ITournamentRankings.sol  # Interface
│   └── TournamentRankings.sol   # Implementation
├── scripts/
│   └── deploy.js                # Deployment script
├── test/
│   └── TournamentRankings.test.cjs  # Tests
├── hardhat.config.cjs           # Hardhat configuration
├── package.json
└── artifacts/                   # Compiled contracts (auto-generated)
```

### Smart Contract - COMPLETE IMPLEMENTATION:

**contracts/ITournamentRankings.sol**:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

interface ITournamentRankings {
    event RankRecorded(uint256 indexed tournamentId, address indexed player, uint256 rank);
    
    function recordRank(uint256 tournamentId, address player, uint256 rank) external;
    function getRank(uint256 tournamentId, address player) external view returns (uint256);
}
```

**contracts/TournamentRankings.sol**:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "./ITournamentRankings.sol";

contract TournamentRankings is ITournamentRankings {
    // Mapping: tournamentId => (player address => rank)
    mapping(uint256 => mapping(address => uint256)) public tournamentRankings;
    
    // Contract owner (tournament service backend)
    address public immutable owner;
    
    // Event emitted when rank is recorded
    event RankRecorded(uint256 indexed tournamentId, address indexed player, uint256 rank);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    /**
     * @dev Record a player's rank in a tournament
     * @param tournamentId The tournament ID
     * @param player The player's Ethereum address (derived from userId)
     * @param rank The player's final rank (1=1st, 2=2nd, etc.)
     */
    function recordRank(uint256 tournamentId, address player, uint256 rank) 
        public 
        onlyOwner 
        override 
    {
        require(rank > 0, "Rank must be positive");
        require(player != address(0), "Invalid player address");
        
        tournamentRankings[tournamentId][player] = rank;
        emit RankRecorded(tournamentId, player, rank);
    }
    
    /**
     * @dev Get a player's rank in a tournament
     * @param tournamentId The tournament ID
     * @param player The player's address
     * @return The player's rank (0 if not ranked)
     */
    function getRank(uint256 tournamentId, address player) 
        public 
        view 
        override 
        returns (uint256) 
    {
        return tournamentRankings[tournamentId][player];
    }
    
    /**
     * @dev Batch record multiple player ranks
     * @param tournamentId The tournament ID
     * @param players Array of player addresses
     * @param ranks Array of corresponding ranks
     */
    function recordRanks(uint256 tournamentId, address[] calldata players, uint256[] calldata ranks) 
        public 
        onlyOwner 
    {
        require(players.length == ranks.length, "Array length mismatch");
        
        for (uint256 i = 0; i < players.length; i++) {
            recordRank(tournamentId, players[i], ranks[i]);
        }
    }
}
```

### Hardhat Configuration - hardhat.config.cjs:
```javascript
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337,
      mining: {
        auto: true,
        interval: 0
      }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
```

### Deployment Script - scripts/deploy.js:
```javascript
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Deploying TournamentRankings contract...");
  
  // Get the contract factory
  const TournamentRankings = await hre.ethers.getContractFactory("TournamentRankings");
  
  // Deploy the contract
  const tournament = await TournamentRankings.deploy();
  
  // Wait for deployment to complete
  await tournament.waitForDeployment();
  
  const address = await tournament.getAddress();
  console.log(`TournamentRankings deployed to: ${address}`);
  
  // Save deployment info
  const deploymentInfo = {
    address: address,
    chainId: hre.network.config.chainId,
    network: hre.network.name,
    deployedAt: new Date().toISOString()
  };
  
  // Write to file for backend to use
  const infoPath = path.join(__dirname, '../deployment-info.json');
  fs.writeFileSync(infoPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment info saved to ${infoPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Dockerfile for Hardhat Node:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy contract files
COPY contracts/ ./contracts/
COPY scripts/ ./scripts/
COPY hardhat.config.cjs ./

# Compile contracts
RUN npx hardhat compile

# Expose Hardhat node port
EXPOSE 8545

# Start Hardhat node and deploy contract
CMD npx hardhat node & \
    sleep 5 && \
    npx hardhat run scripts/deploy.js --network localhost && \
    wait
```

### Tournament Service Integration - blockchain.ts:
```typescript
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// Load contract ABI and address
const artifactPath = path.join(__dirname, '../../blockchain/artifacts/contracts/TournamentRankings.sol/TournamentRankings.json');
const deploymentPath = path.join(__dirname, '../../blockchain/deployment-info.json');

const contractArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

// Connect to Hardhat node
const provider = new ethers.JsonRpcProvider('http://hardhat-node:8545');

// Use default Hardhat account #0 as signer (has ETH)
const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const wallet = new ethers.Wallet(privateKey, provider);

// Contract instance
const contract = new ethers.Contract(
  deploymentInfo.address,
  contractArtifact.abi,
  wallet
);

/**
 * Record tournament rankings on blockchain
 * @param tournamentId Tournament ID
 * @param rankings Map of userId => rank
 */
export async function recordTournamentOnBlockchain(
  tournamentId: number, 
  rankings: Map<number, number>
): Promise<void> {
  try {
    console.log(`Recording tournament ${tournamentId} on blockchain...`);
    
    // Convert userIds to Ethereum addresses (deterministic mapping)
    const players: string[] = [];
    const ranks: number[] = [];
    
    for (const [userId, rank] of rankings.entries()) {
      const address = userIdToAddress(userId);
      players.push(address);
      ranks.push(rank);
    }
    
    // Call contract function
    const tx = await contract.recordRanks(tournamentId, players, ranks);
    console.log(`Transaction hash: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Log events
    const events = receipt.logs.map((log: any) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    console.log(`Recorded ${events.length} player rankings on blockchain`);
    
  } catch (error) {
    console.error('Blockchain recording error:', error);
    throw error;
  }
}

/**
 * Get a player's rank from blockchain
 * @param tournamentId Tournament ID
 * @param userId User ID
 * @returns Rank (0 if not found)
 */
export async function getRankFromBlockchain(
  tournamentId: number, 
  userId: number
): Promise<number> {
  try {
    const address = userIdToAddress(userId);
    const rank = await contract.getRank(tournamentId, address);
    return Number(rank);
  } catch (error) {
    console.error('Blockchain read error:', error);
    return 0;
  }
}

/**
 * Convert userId to Ethereum address (deterministic)
 * For demo: use keccak256 hash of userId
 * In production: store real user wallet addresses
 */
function userIdToAddress(userId: number): string {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(`user_${userId}`));
  // Take first 20 bytes (40 hex chars) for address
  return '0x' + hash.slice(2, 42);
}

/**
 * Check if Hardhat node is reachable
 */
export async function checkBlockchainConnection(): Promise<boolean> {
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log(`Connected to blockchain at block ${blockNumber}`);
    return true;
  } catch (error) {
    console.error('Blockchain connection failed:', error);
    return false;
  }
}
```

### Usage in Tournament Service:
```typescript
import { recordTournamentOnBlockchain } from './blockchain';

// After tournament completion:
async function completeTournament(tournamentId: number) {
  // ... calculate rankings ...
  
  const rankings = new Map([
    [123, 1],  // userId 123 = 1st place
    [456, 2],  // userId 456 = 2nd place
    [789, 3],  // userId 789 = 3rd place
  ]);
  
  // Update database
  for (const [userId, rank] of rankings) {
    await updateParticipantRank(tournamentId, userId, rank);
  }
  
  // Record on blockchain (immutable proof)
  try {
    await recordTournamentOnBlockchain(tournamentId, rankings);
    console.log('Tournament results recorded on blockchain');
  } catch (error) {
    console.error('Blockchain recording failed (tournament still valid):', error);
  }
}
```

---

## 🐳 DOCKER & DEPLOYMENT PROMPT

**Create Docker Compose orchestration with the following services:**

### docker-compose.yml:
```yaml
services:
  nginx:
    build: ./frontend
    ports:
      - "80:80"
    volumes:
      - ./frontend/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - auth-service
      - game-service
      - tournament-service
      - user-service
      - hardhat-node
    networks:
      - transcendence-network

  auth-service:
    build: ./auth-service
    ports:
      - "3001:3000"
    volumes:
      - ./auth-service/database:/app/database
    environment:
      - PORT=3000
      - SERVICE_NAME=auth-service
      - NODE_ENV=development
    networks:
      - transcendence-network

  game-service:
    build: ./game-service
    ports:
      - "3002:3000"
    volumes:
      - ./game-service/database:/app/database
    environment:
      - PORT=3000
      - SERVICE_NAME=game-service
    networks:
      - transcendence-network

  tournament-service:
    build: ./tournament-service
    ports:
      - "3003:3000"
    volumes:
      - ./tournament-service/database:/app/database
    environment:
      - PORT=3000
      - SERVICE_NAME=tournament-service
    networks:
      - transcendence-network

  user-service:
    build: ./user-service
    ports:
      - "3004:3000"
    volumes:
      - ./user-service/database:/app/database
    environment:
      - PORT=3000
      - SERVICE_NAME=user-service
    networks:
      - transcendence-network

  hardhat-node:
    build: ./blockchain
    container_name: hardhat-node
    ports:
      - "8545:8545"
    volumes:
      - hardhat-data:/app/data
      - ./blockchain/contracts:/app/contracts
      - ./blockchain/scripts:/app/scripts
      - ./blockchain/artifacts:/app/artifacts
    env_file:
      - .env
    networks:
      - transcendence-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8545"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  transcendence-network:
    driver: bridge

volumes:
  auth-db:
  games-db:
  tournaments-db:
  users-db:
  hardhat-data:

Note: All services include memory limits (128m for nginx, 256m for services, 1g for hardhat)
```

### Dockerfile Templates:
**For each service (auth, game, tournament, user):**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

**For frontend:**
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**For blockchain:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8545

CMD ["npx", "hardhat", "node"]
```

---

## 🔄 DEVELOPMENT WORKFLOW PROMPT

**Create development automation with the following Makefile:**

```makefile
OS := $(shell uname)

.PHONY: start check-docker check-compose clean up open stop restart rebuild

start: check-docker check-compose clean up open

restart: check-docker check-compose
	@echo "🔄 Restarting services without rebuild..."
	docker compose down
	docker compose up -d
	@echo "✅ Services restarted!"

rebuild: check-docker check-compose
	@echo "🔨 Rebuilding and restarting services..."
	docker compose down
	docker compose build
	docker compose up -d
	@echo "✅ Services rebuilt and started!"

check-docker:
	@echo "🔍 Checking Docker Desktop..."
	@if ! docker info >/dev/null 2>&1; then \
		echo "⚠️  Docker is not running. Starting Docker Desktop..."; \
		if [ "$(OS)" = "Darwin" ]; then \
			open -a Docker; \
			echo "⏳ Waiting for Docker to start..."; \
			while ! docker info >/dev/null 2>&1; do sleep 2; done; \
		else \
			if command -v systemctl >/dev/null 2>&1; then \
				sudo systemctl start docker; \
			else \
				echo "❌ Cannot auto-start Docker on this Linux. Please start it manually."; \
				exit 1; \
			fi \
		fi \
	else \
		echo "✅ Docker is already running."; \
	fi

check-compose:
	@echo "🔍 Checking Docker Compose v2..."
	@if ! docker compose version >/dev/null 2>&1; then \
		echo "❌ Docker Compose v2 not found. Please install it."; \
		exit 1; \
	else \
		echo "✅ Docker Compose v2 available."; \
	fi

clean:
	@echo "🧹 Completely deleting and resetting containers, images, and volumes for this project..."
	@if [ -f docker-compose.yml ]; then \
		if docker compose version >/dev/null 2>&1; then \
			docker compose down --rmi all --volumes --remove-orphans; \
			docker compose rm -f >/dev/null 2>&1 || true; \
		else \
			echo "❌ Docker Compose not found. Cannot clean."; \
			exit 1; \
		fi; \
		PROJECT=$$(basename "$$(pwd)"); \
		CONTAINERS=$$(docker ps -a --filter "label=com.docker.compose.project=$$PROJECT" -q 2>/dev/null || true); \
		if [ -n "$$CONTAINERS" ]; then docker rm -f $$CONTAINERS >/dev/null 2>&1 || true; fi; \
		echo "✅ Complete removal done for compose project: $$PROJECT"; \
	else \
		echo "⚠️  No docker-compose.yml found in this directory."; \
	fi

up:
	@echo "🚀 Running docker compose up --build --no-cache..."
	docker compose build --no-cache
	docker compose up -d

open:
	@echo "🌐 Opening browser at http://localhost:80 ..."
	@if [ "$(OS)" = "Darwin" ]; then \
		open http://localhost:80; \
	elif echo "$(OS)" | grep -q "MINGW\|MSYS"; then \
		if command -v firefox >/dev/null 2>&1; then \
			start firefox http://localhost:80; \
		else \
			start http://localhost:80; \
		fi \
	elif grep -qEi "(Microsoft|WSL)" /proc/version 2>/dev/null; then \
		echo "🪟 Detected WSL environment, using Windows browser..."; \
		if command -v wslview >/dev/null 2>&1; then \
			wslview http://localhost:80 2>/dev/null || \
			(echo "⚠️  wslview failed, trying cmd.exe fallback..." && \
			cmd.exe /c start http://localhost:80 2>/dev/null || \
			powershell.exe -c "Start-Process 'http://localhost:80'" 2>/dev/null || \
			echo "❌ Could not auto-open browser. Please visit http://localhost:80 manually."); \
		else \
			cmd.exe /c start http://localhost:80 2>/dev/null || \
			powershell.exe -c "Start-Process 'http://localhost:80'" 2>/dev/null || \
			echo "❌ Could not auto-open browser. Please visit http://localhost:80 manually."; \
		fi \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:80; \
	else \
		echo "❌ Could not auto-open browser. Please visit http://localhost:80 manually."; \
	fi

stop:
	@echo "🛑 Stopping running containers..."
	docker compose down --remove-orphans
```

### Development Features:
- **Auto Docker Start**: Automatically starts Docker Desktop if not running
- **Cross-platform Browser Opening**: Works on macOS, Windows, Linux, WSL
- **Clean Reset**: Complete container and volume cleanup
- **Hot Reloading**: Development mode with automatic restarts

---

## 📋 IMPLEMENTATION CHECKLIST

**Use this checklist to verify complete recreation:**

### Architecture ✅
- [ ] Microservices architecture (4 services + nginx + blockchain)
- [ ] Docker Compose orchestration
- [ ] nginx API gateway with WebSocket support
- [ ] SQLite databases for each service

### Frontend ✅
- [ ] TypeScript/Vite setup
- [ ] HTML5 Canvas game engine
- [ ] WebSocket real-time communication
- [ ] Modular component architecture
- [ ] Responsive UI design

### Game Features ✅
- [ ] Co-op/Campaign mode (21 progressive levels)
- [ ] Arcade mode (local multiplayer with teams)
- [ ] Tournament system (single-elimination brackets)
- [ ] Local 1v1 tournament matches
- [ ] Real-time WebSocket gameplay (60 FPS)
- [ ] Multi-paddle support for team gameplay

### Backend Services ✅
- [ ] Auth service (HTTP-only cookie JWT, password reset)
- [ ] Game service (WebSocket games with server-side physics)
- [ ] Tournament service (brackets, rankings, blockchain)
- [ ] User service (stats, achievements, leaderboards)
- [ ] Proper database schemas with migrations

### Blockchain ✅
- [ ] Smart contract for tournament rankings (TournamentRankings.sol)
- [ ] Hardhat local network
- [ ] Tournament result recording on-chain
- [ ] Contract deployment automation
### DevOps ✅
- [ ] Complete Docker setup with memory limits
- [ ] Makefile automation (start, stop, restart, rebuild, clean)
- [ ] nginx configuration with CORS and cookie support
- [ ] Development workflow with hot reloading
- [ ] Development workflow

### Testing ✅
- [ ] All services start successfully (make start)
- [ ] Frontend loads at localhost:80
- [ ] User registration/login works with HTTP-only cookies
- [ ] Co-op/Campaign mode with 21 levels works
- [ ] Arcade mode with team-based local multiplayer works
- [ ] Tournament creation/joining/bracket system works
- [ ] Tournament 1v1 local matches work (W/S left, U/J right)
- [ ] Real-time WebSocket games function at 60 FPS
- [ ] Blockchain tournament recording works
- [ ] User profiles display campaign level and statistics
- [ ] Leaderboard displays rankings correctly

---

## 🚀 QUICK START RECREATION

**To recreate this entire system, execute these prompts in order:**

1. **Architecture Setup**: Use the "ARCHITECTURE OVERVIEW PROMPT" to establish the project structure
2. **Database Design**: Implement the "DATABASE SCHEMA PROMPT" for all services
3. **Backend Services**: Create each microservice using the "BACKEND MICROSERVICES PROMPT"
4. **Frontend Application**: Build the frontend using the "FRONTEND ARCHITECTURE PROMPT"
5. **API Gateway**: Configure nginx using the "API GATEWAY & NETWORKING PROMPT"
6. **Blockchain**: Implement using the "BLOCKCHAIN INTEGRATION PROMPT"
7. **Containerization**: Set up Docker using the "DOCKER & DEPLOYMENT PROMPT"
8. **Development Tools**: Add the "DEVELOPMENT WORKFLOW PROMPT" automation

**Expected Result**: A fully functional multiplayer Pong platform with campaign progression, tournaments, real-time gaming, and blockchain integration, identical to the original FT_TRANSCENDENCE system.