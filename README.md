# FT_TRANSCENDENCE - Multiplayer Pong Platform

A full-stack multiplayer Pong game platform built with microservices architecture, featuring campaign progression, tournaments, leaderboards, and blockchain integration.

## 🎮 Game Features

### Core Gameplay
- **Real-time Pong**: Smooth, responsive multiplayer Pong with WebSocket synchronization
- **Multiple Game Modes**: Campaign, Quick Match, Tournament, and Bot training
- **Cross-platform**: Web-based with responsive design for desktop and mobile
- **Real-time Communication**: Integrated chat system for players

### Progression System
- **Campaign Mode**: 21 progressive levels with increasing difficulty
- **Achievements**: Unlockable achievements and milestones
- **Statistics Tracking**: Comprehensive match history and performance metrics
- **Leaderboards**: Global rankings and tournament standings

### Tournament System
- **Single Elimination**: Automated bracket generation with support for any number of players
- **BYE System**: Handles non-power-of-2 participant counts automatically
- **Live Updates**: Real-time tournament progress and match results
- **Final Rankings**: Complete ranking system for all participants

### Social Features
- **User Profiles**: Extended profiles with stats, achievements, and history
- **Friend System**: Add friends and track their progress
- **Match History**: Detailed records of all games played

### Blockchain Integration
- **Tournament Recording**: Store tournament results on blockchain for immutability
- **Achievement NFTs**: Potential for blockchain-based achievements (future feature)

## 🎯 Game Modes

### 1. Campaign Mode
- **21 Levels**: Progressive difficulty from beginner to expert
- **Story Progression**: Unlock new challenges and achievements
- **Level Syncing**: Automatic progression tracking and database persistence
- **Bot Opponents**: AI opponents with varying skill levels

### 2. Quick Match (PVP)
- **Instant Matchmaking**: Find opponents quickly
- **Real-time Gameplay**: Live multiplayer matches
- **Spectator Mode**: Watch ongoing matches
- **Match Statistics**: Detailed performance analytics

### 3. Tournament Mode
- **Create Tournaments**: Host custom tournaments with configurable settings
- **Join System**: Easy registration and participant management
- **Automated Brackets**: Single-elimination with automatic progression
- **Prize System**: Winner takes all tournaments

### 4. Bot Training
- **AI Opponents**: Practice against computer-controlled players
- **Difficulty Levels**: Adjustable bot difficulty
- **Custom Scenarios**: Specialized training modes

## 🏗️ Architecture & Structure

### Frontend Architecture (`/frontend`)
```
frontend/
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.ts              # Main application controller (1953 lines)
│   ├── router.ts           # Client-side routing
│   ├── state.ts            # Global state management
│   ├── auth.ts             # Authentication handling
│   ├── game.ts             # Core game logic (3495 lines)
│   ├── tournament.ts       # Tournament UI logic (1409 lines)
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
├── package.json            # Frontend dependencies
├── tsconfig.json           # TypeScript configuration
├── vite.config.js          # Vite build configuration
└── index.html              # Main HTML template
```

**Key Components:**
- **Game Engine**: Custom Pong physics and rendering engine
- **State Management**: Centralized state for user data and game status
- **WebSocket Client**: Real-time communication with game servers
- **UI Framework**: Modular component-based interface

### Backend Microservices

#### Auth Service (`/auth-service`)
- **Port**: 3001
- **Database**: SQLite (`auth.db`)
- **Features**:
  - User registration and login
  - JWT token management
  - Password hashing and security
  - Profile management

#### Game Service (`/game-service`)
- **Port**: 3002
- **Database**: SQLite (`games.db`)
- **Features**:
  - Real-time match hosting
  - WebSocket game state synchronization
  - Bot opponent management
  - Match result recording

#### User Service (`/user-service`)
- **Port**: 3003
- **Database**: SQLite (`users.db`)
- **Features**:
  - Extended user profiles
  - Achievement system
  - Friend relationships
  - Statistics tracking

#### Tournament Service (`/tournament-service`)
- **Port**: 3004
- **Database**: SQLite (`tournaments.db`)
- **Features**:
  - Tournament creation and management
  - Automated bracket generation
  - Match result processing
  - Blockchain integration

### API Gateway (`/api-gateway`)
- **nginx Configuration**: Routes requests to appropriate services
- **WebSocket Proxy**: Handles real-time connections
- **Load Balancing**: Distributes requests across services

### Blockchain Integration (`/blockchain`)
- **Smart Contracts**: Tournament result recording
- **Hardhat Framework**: Development and testing environment
- **Contract Deployment**: Automated deployment scripts

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Quick Start with Docker
```bash
# Clone the repository
git clone https://github.com/calvinhon/ft_transcendence.git
cd ft_transcendence

# Start all services
docker compose up --build

# Access the application
open http://localhost:8080
```

### Local Development
```bash
# Install dependencies for each service
npm install

# Start individual services
npm run dev

# Or use the makefile for convenience
make dev
```

## 📊 Database Schema

### Auth Service Database
- **users**: User accounts, credentials, JWT tokens
- **profiles**: Extended user information

### Game Service Database
- **matches**: Game sessions and results
- **game_states**: Real-time game state snapshots

### User Service Database
- **user_stats**: Performance statistics
- **achievements**: Unlocked achievements
- **friends**: Friend relationships

### Tournament Service Database
- **tournaments**: Tournament metadata
- **tournament_participants**: Tournament registrations
- **tournament_matches**: Match brackets and results

## 🔧 Development

### Available Scripts
```bash
# Start all services
make up

# Stop all services
make down

# View logs
make logs

# Run tests
make test

# Clean up
make clean
```

### Code Organization
- **Frontend**: Modular TypeScript with separation of concerns
- **Backend**: Microservices with clear API boundaries
- **Database**: SQLite for simplicity and portability
- **Testing**: Unit tests for critical components

## 🎯 Gameplay Flow

1. **Registration/Login**: User creates account or logs in
2. **Mode Selection**: Choose Campaign, Quick Match, or Tournament
3. **Matchmaking**: System finds opponent or creates bot
4. **Gameplay**: Real-time Pong with WebSocket synchronization
5. **Results**: Match outcomes recorded and statistics updated
6. **Progression**: Campaign levels, achievements, and rankings updated

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **CORS Configuration**: Proper cross-origin request handling
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against abuse

## 📈 Performance

- **WebSocket Optimization**: Efficient real-time communication
- **Database Indexing**: Optimized queries for high performance
- **Caching**: Strategic caching for frequently accessed data
- **Containerization**: Efficient resource utilization with Docker

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with**: TypeScript, Node.js, Fastify, SQLite, Docker, WebSockets, HTML5 Canvas