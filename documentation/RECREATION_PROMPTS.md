# FT_TRANSCENDENCE - Complete Recreation Prompts

This document contains comprehensive prompts and specifications to recreate the entire FT_TRANSCENDENCE multiplayer Pong platform. Each section provides detailed instructions for an AI agent to rebuild the system exactly as designed.

## 🏗️ ARCHITECTURE OVERVIEW PROMPT

**Create a full-stack multiplayer Pong game platform with the following architecture:**

### System Requirements:
- **Frontend**: Modern web application using TypeScript, HTML5 Canvas, WebSockets
- **Backend**: Microservices architecture with 4 Node.js/Fastify services
- **Database**: SQLite databases for each service (separate data isolation)
- **API Gateway**: nginx reverse proxy with WebSocket support
- **Blockchain**: Hardhat-based Ethereum integration for tournament recording
- **Containerization**: Docker Compose orchestration
- **Real-time**: WebSocket communication for live gameplay

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
- **Physics Engine**: Realistic ball physics with collision detection
- **Paddle Controls**: Smooth paddle movement with keyboard input
- **Scoring System**: Point-based scoring with win conditions
- **Real-time Sync**: WebSocket-based state synchronization
- **Canvas Rendering**: 60fps HTML5 Canvas rendering

### Game Modes:

#### 1. Campaign Mode (21 Levels)
```
Features:
- Progressive difficulty levels (1-21)
- Bot opponents with increasing AI skill
- Level progression tracking in database
- Achievement unlocks per level
- Story-like progression system
- Automatic level advancement after wins
- Database persistence of campaign progress
```

#### 2. Quick Match (PVP)
```
Features:
- Real-time matchmaking system
- Live multiplayer Pong matches
- WebSocket-based game state sync
- Spectator mode capability
- Match result recording
- Statistics tracking
```

#### 3. Tournament Mode
```
Features:
- Tournament creation with custom settings
- Single-elimination bracket system
- Automatic BYE handling for non-power-of-2 participants
- Real-time tournament progress updates
- Match result submission and validation
- Final ranking calculation
- Blockchain recording of results
```

#### 4. Bot Training Mode
```
Features:
- AI opponents with adjustable difficulty
- Practice scenarios and drills
- Performance analytics
- Custom training modes
```

### Additional Features:
- **Chat System**: Real-time messaging during games
- **Spectator Mode**: Watch live matches
- **Statistics Dashboard**: Comprehensive performance metrics
- **Achievement System**: Unlockable milestones and rewards
- **Friend System**: Add friends and track their activity
- **Leaderboards**: Global rankings and tournament standings

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
│   ├── auth.ts             # Authentication handling
│   ├── game.ts             # Core game logic (~3495 lines - LARGEST FILE)
│   ├── tournament.ts       # Tournament UI logic (~1409 lines)
│   ├── leaderboard.ts      # Leaderboard functionality
│   ├── profile.ts          # User profile management
│   ├── match.ts            # Match history and details
│   ├── chat.ts             # Real-time chat system
│   ├── blockchain.ts       # Blockchain integration
│   ├── ui.ts               # UI components and utilities
│   ├── types.ts            # TypeScript type definitions
│   └── ai-player.ts        # AI/bot opponent logic
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
- Screen management and navigation
- User authentication flow
- Game mode selection
- UI state coordination
- Event handling and routing
- Modal management (login, registration, etc.)
- Campaign progress tracking
- Tournament lobby management
```

#### game.ts (Core Game Engine - 3495 lines - LARGEST FILE):
```
Features:
- HTML5 Canvas rendering engine
- Pong physics and collision detection
- Real-time multiplayer sync via WebSockets
- AI opponent implementation
- Game state management
- Input handling (keyboard controls)
- Score tracking and win conditions
- Campaign level progression
- Bot difficulty scaling
- Spectator mode support
```

#### tournament.ts (Tournament System - 1409 lines):
```
Features:
- Tournament creation interface
- Bracket visualization
- Participant management
- Match scheduling and results
- Real-time tournament updates
- Ranking display
- Tournament history
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

### 1. Auth Service (Port 3001)
```
Database: SQLite (auth.db)
Endpoints:
- POST /register - User registration
- POST /login - User authentication
- GET /profile/:userId - Get user profile
- PUT /profile/:userId - Update user profile
- POST /verify-token - JWT token verification

Features:
- bcrypt password hashing
- JWT token generation and validation
- User profile management
- Session handling
```

### 2. Game Service (Port 3002)
```
Database: SQLite (games.db)
WebSocket Endpoints:
- /ws - Real-time game connections
- /ws/chat - Chat messaging

REST Endpoints:
- POST /join-bot - Start bot match
- POST /join-pvp - Start PVP matchmaking
- GET /matches/:userId - Get user match history
- POST /match/result - Record match results

Features:
- WebSocket game state broadcasting
- Real-time player synchronization
- Bot opponent management
- Match result persistence
- Chat message handling
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
CREATE TABLE users (
  userId INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  campaign_level INTEGER DEFAULT 1,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0
);

CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(userId)
);
```

### Game Service Database (games.db):
```sql
CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player1_id INTEGER NOT NULL,
  player2_id INTEGER NOT NULL,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  winner_id INTEGER,
  game_mode TEXT DEFAULT 'pvp',
  is_campaign BOOLEAN DEFAULT FALSE,
  campaign_level INTEGER
);

CREATE TABLE game_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  state_data TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id)
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
CREATE TABLE user_stats (
  user_id INTEGER PRIMARY KEY,
  total_games INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  win_rate REAL DEFAULT 0.0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_tournaments INTEGER DEFAULT 0,
  tournament_wins INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_type TEXT NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT,
  UNIQUE(user_id, achievement_type)
);

CREATE TABLE friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id)
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
            proxy_pass http://auth_backend/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
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

## ⛓️ BLOCKCHAIN INTEGRATION PROMPT

**Implement blockchain integration for tournament result recording:**

### Smart Contract (TournamentRankings.sol):
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

contract TournamentRankings {
    struct Rank {
        string name;
        uint256 value;
    }

    mapping(uint256 tournamentId => mapping(address player => uint256 rank)) public tournamentRankings;

    address public immutable owner;

    event RankRecorded(uint256 indexed tournamentId, address indexed player, uint256 rank);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    function recordRank(uint256 tournamentId, address player, uint256 rank) public onlyOwner {
        tournamentRankings[tournamentId][player] = rank;
        emit RankRecorded(tournamentId, player, rank);
    }

    function getRank(uint256 tournamentId, address player) public view returns (uint256) {
        return tournamentRankings[tournamentId][player];
    }
}
```

### Blockchain Service Integration:
```
Features:
- Hardhat local blockchain node
- Tournament result recording on-chain
- Immutable tournament history
- Player ranking verification
- Smart contract interaction from tournament service
```

### Hardhat Configuration:
- Local Ethereum network setup
- Contract compilation and deployment
- Test environment configuration
- Script automation for deployment

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
- [ ] Campaign mode (21 levels)
- [ ] Quick match PVP
- [ ] Tournament system
- [ ] Bot training mode
- [ ] Real-time multiplayer
- [ ] Chat system

### Backend Services ✅
- [ ] Auth service (JWT, profiles)
- [ ] Game service (WebSocket games)
- [ ] Tournament service (brackets, rankings)
- [ ] User service (stats, achievements)
- [ ] Proper database schemas

### Blockchain ✅
- [ ] Smart contract for tournament rankings
- [ ] Hardhat local network
- [ ] Tournament result recording

### DevOps ✅
- [ ] Complete Docker setup
- [ ] Makefile automation
- [ ] nginx configuration
- [ ] Development workflow

### Testing ✅
- [ ] All services start successfully
- [ ] Frontend loads at localhost:80
- [ ] User registration/login works
- [ ] Campaign mode progression works
- [ ] Tournament creation/joining works
- [ ] Real-time games function
- [ ] Blockchain recording works

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