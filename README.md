# FT_TRANSCENDENCE - Multiplayer Pong Platform

**Status:** 105/125 Points ✅ | 120/120 Tests Passing ✅ | Production Ready

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

### 1. Campaign Mode
- **Progressive Difficulty**: 21 levels with increasing challenge
- **Achievement Unlocks**: Earn rewards as you advance
- **Statistics Tracking**: Performance metrics and progress visualization

### 2. Quick Match (PVP)
- **Instant Matchmaking**: Find opponents quickly
- **Real-time Gameplay**: WebSocket-powered synchronization
- **Match Statistics**: Detailed performance analytics

### 3. Tournament Mode
- **Create Tournaments**: Host custom tournaments with configurable settings
- **Bracket System**: Automated tournament progression
- **Blockchain Verification**: Tournament results recorded on blockchain
- **Prize Distribution**: Winner rewards and recognition

### 4. Bot Training
- **AI Opponents**: Practice against computer-controlled players
- **Difficulty Levels**: Adjustable bot difficulty for skill development
- **Training Metrics**: Performance analysis against AI

## 🏗️ Architecture

### Microservices Architecture
The platform consists of 8 independent microservices, each handling specific business domains:

#### Frontend Service (`/frontend`)
- **Port**: 80 (Nginx reverse proxy)
- **Technology**: TypeScript, HTML5 Canvas, WebSockets
- **Features**:
  - Responsive web interface
  - Real-time game rendering
  - Client-side routing
  - WebSocket communication

#### Auth Service (`/auth-service`)
- **Port**: 3001
- **Database**: SQLite (`auth.db`)
- **Features**:
  - User authentication and registration
  - Password hashing with bcrypt
  - Session management
  - Profile management

#### Game Service (`/game-service`)
- **Port**: 3002
- **Database**: SQLite (`games.db`)
- **Features**:
  - Real-time match hosting and management
  - WebSocket game state synchronization
  - Bot opponent AI logic
  - Match result recording and statistics

#### User Service (`/user-service`)
- **Port**: 3003
- **Database**: SQLite (`users.db`)
- **Features**:
  - Extended user profiles and avatars
  - Achievement system and progression tracking
  - Friend relationships and social features
  - Comprehensive statistics and leaderboards

#### Tournament Service (`/tournament-service`)
- **Port**: 3004
- **Database**: SQLite (`tournaments.db`)
- **Features**:
  - Tournament creation and management
  - Automated bracket generation
  - Match result processing
  - Blockchain integration for result verification

#### SSR Service (`/ssr-service`)
- **Port**: 3005
- **Technology**: Node.js, Fastify, Handlebars
- **Features**:
  - Server-side rendering for SEO
  - Dynamic page generation
  - Performance optimization

#### Blockchain Service (`/blockchain`)
- **Port**: 8545 (Hardhat network)
- **Technology**: Solidity, Hardhat, ethers.js
- **Features**:
  - Smart contract deployment
  - Tournament result verification
  - Immutable record keeping

#### Vault Service (`/vault`)
- **Port**: 8200
- **Technology**: HashiCorp Vault
- **Features**:
  - Centralized secrets management
  - Secure credential storage
  - Dynamic secret generation

### Infrastructure Components
- **Nginx Reverse Proxy**: Load balancing and request routing with WAF protection
- **WebSocket Proxy**: Real-time communication handling
- **Docker Compose**: Container orchestration and service management

### Shared Utilities Package (`/packages/common`)
- **Package**: `@ft-transcendence/common`
- **Technology**: TypeScript, Jest (testing)
- **Features**:
  - Consolidated response utilities (`sendSuccess`, `sendError`)
  - Standardized health check responses
  - Unified database access patterns with SQLite
  - Shared server bootstrap and configuration
  - Consistent logging across all services
  - Common middleware and validation functions
  - Comprehensive test coverage (22 tests passing)

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
curl https://localhost  # Should show web interface
docker compose ps     # All containers should show "Up (healthy)"
```

### Verify Services Are Running
```bash
# Quick health check
curl https://localhost/api/auth/health

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

# Run comprehensive test suite (120 tests)
cd tester && ./run-all-tests.sh

# See all commands
make help
```

## 🔐 Security Features

- **Password Hashing**: bcrypt for secure password storage
- **WAF Protection**: ModSecurity for SQL injection/XSS prevention
- **Vault Integration**: Centralized secrets management
- **CORS Configuration**: Proper cross-origin request handling
- **Input Validation**: Comprehensive request validation

## 🧪 Testing Infrastructure

- **120 Tests**: Comprehensive coverage across all modules
- **10 Test Suites**: One per major module/feature
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
- ✅ Server-Side Pong
- ✅ Security (WAF & Vault)
- ✅ SSR Integration

## 📈 Performance

- **WebSocket Optimization**: Efficient real-time communication
- **Database Indexing**: Optimized queries for high performance
- **Caching**: Strategic caching for frequently accessed data
- **Containerization**: Efficient resource utilization with Docker

## 🔧 Troubleshooting

### Database Permission Issues (When Switching Hosts)

**Problem**: When moving the project between different computers or users, you may encounter database permission errors like:
```
Error: SQLITE_CANTOPEN: unable to open database file
Error: EACCES: permission denied
```

**Cause**: SQLite database files retain ownership from the previous host system. Docker containers may create files owned by root or other users.

**Solution**: Run the ownership fix command before starting services:
```bash
make fix-ownership
```

This command:
- Sets proper permissions (664) on all `.db` files
- Fixes ownership issues when switching between hosts
- Is automatically run during `make dev` and `make clean-start`

**Prevention**: Always run `make fix-ownership` after cloning or moving the project to a new system.

### Common Issues

- **Port conflicts**: Ensure ports 8080, 8443, and 8200 are available
- **Docker issues**: Run `make clean-start` for a complete reset
- **SSL certificate errors**: The project uses self-signed certificates for development
- **Service startup failures**: Check logs with `make logs`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with**: TypeScript, Node.js, Fastify, SQLite, Docker, WebSockets, HTML5 Canvas, Solidity, Hardhat