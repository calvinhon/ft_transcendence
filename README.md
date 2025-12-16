# FT_TRANSCENDENCE - Multiplayer Pong Platform

**Status:** 125/125 Points ✅ | 144/144 Tests Passing ✅ | Production Ready

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

- **Match History**: Detailed records of all games played

## 🎯 Game Modes


### 2. Quick Match (PVP)
- **Match Statistics**: Detailed performance analytics

### 3. Tournament Mode
- **Create Tournaments**: Host custom tournaments with configurable settings
### 4. Bot Training
- **AI Opponents**: Practice against computer-controlled players

### Frontend Architecture (`/frontend`)
│   ├── app.ts              # Main application controller (1953 lines)
│   ├── router.ts           # Client-side routing
│   ├── game.ts             # Core game logic (3495 lines)
│   ├── tournament.ts       # Tournament UI logic (1409 lines)
│   ├── leaderboard.ts      # Leaderboard functionality
│   ├── profile.ts          # User profile management
│   └── ai-player.ts        # AI/bot opponent logic
├── css/
└── index.html              # Main HTML template
```
- **State Management**: Centralized state for user data and game status
- **WebSocket Client**: Real-time communication with game servers

#### Auth Service (`/auth-service`)
- **Port**: 3001
- **Database**: SQLite (`auth.db`)
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
  - Match result processing
  - Blockchain integration
- **nginx Configuration**: Routes requests to appropriate services
- **WebSocket Proxy**: Handles real-time connections
- **Smart Contracts**: Tournament result recording
- **Hardhat Framework**: Development and testing environment

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Quick Start with Docker
```bash
# Clone the repository
git clone https://github.com/calvinhon/ft_transcendence.git
cd ft_transcendence
git checkout debug/finalizing

# 🔥 IMPORTANT: Fresh Clone Setup (prevents database schema errors)
# Remove any stale database files first
docker compose down -v --remove-orphans
rm -rf auth-service/database/*.db
rm -rf game-service/database/*.db
rm -rf user-service/database/*.db
rm -rf tournament-service/database/*.db

# Start all services
make start

# Wait 2-3 minutes for services to initialize
# Then verify with:
curl http://localhost  # Should show web interface
docker compose ps     # All containers should show "Up (healthy)"
```

### Verify Services Are Running

```bash
# Quick health check
curl http://localhost/api/auth/health

# Expected: {"status":"ok"}
```

### Available Scripts
```bash
# ⚡ Fast dev mode (core only, NO 2GB images, ~15s)
make dev

# 📊 Full stack with all services (~2-3 min)
make full

# Quick start (legacy, all services, ~30-60s)
make start

# Restart services (no rebuild, ~10s)
make restart

# Force rebuild (dependency changes, ~5-7 min)
make rebuild

# Stop services
make stop

# View logs
make logs

# Maintenance commands
make clean                  # Remove all containers/volumes
make clean-dev              # Clean node_modules and build artifacts

# Check status
make ps

# Run comprehensive test suite (180 tests)
cd tester && ./run-tests-in-docker.sh

# See all commands
make help
```

### Code Organization
- **Frontend**: Modular TypeScript with separation of concerns
- **Backend**: Microservices with clear API boundaries
- **Database**: SQLite for simplicity and portability
- **Testing**: 180 comprehensive tests across 15 modules (100% containerized)

## 🎯 Gameplay Flow

1. **Registration/Login**: User creates account or logs in
2. **Mode Selection**: Choose Campaign, Quick Match, or Tournament
3. **Matchmaking**: System finds opponent or creates bot
4. **Gameplay**: Real-time Pong with WebSocket synchronization
5. **Results**: Match outcomes recorded and statistics updated
6. **Progression**: Campaign levels, achievements, and rankings updated

## 🔐 Security Features

- **Password Hashing**: bcrypt for secure password storage
- **WAF Protection**: ModSecurity for SQL injection/XSS prevention
- **Vault Integration**: Centralized secrets management
- **CORS Configuration**: Proper cross-origin request handling
- **Input Validation**: Comprehensive request validation
- **GDPR Compliance**: Data privacy and user rights

## 🧪 Testing Infrastructure

- **180 Tests**: Comprehensive coverage across all modules
- **15 Test Suites**: One per major module/feature
- **100% Containerized**: Zero host dependencies except Docker
- **CI/CD Ready**: GitHub Actions compatible
- **Fast Execution**: Complete suite in ~2 minutes
- **Documentation**: See `tester/QUICK_TEST_GUIDE.md`

### Test Coverage
- ✅ Backend Framework & APIs
- ✅ Database Operations
- ✅ Blockchain Integration
- ✅ AI Opponent Logic
- ✅ Statistics & Dashboards
- ✅ Microservices Architecture
- ✅ Authentication & Security
- ✅ Infrastructure & Security
- ✅ Compliance (GDPR)

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