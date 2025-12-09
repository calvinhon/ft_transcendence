# FT_TRANSCENDENCE - Feature Showcase & Module Verification Guide

**Version:** 2.0.0  
**Date:** December 9, 2025  
**Purpose:** Complete walkthrough of all features and modules with browser & terminal commands  
**Audience:** Evaluators, Developers, Demonstrators  
**Estimated Duration:** 30-45 minutes for full showcase

---

## Table of Contents

1. [Quick Setup](#quick-setup)
2. [Browser-Based Feature Showcase](#browser-based-feature-showcase)
3. [Terminal-Based Module Verification](#terminal-based-module-verification)
4. [Feature Matrix](#feature-matrix)
5. [Advanced Testing](#advanced-testing)
6. [Troubleshooting](#troubleshooting)

---

## Quick Setup

### Prerequisites

```bash
# 1. Ensure Docker is running
docker ps

# 2. Navigate to project directory
cd /path/to/ft_transcendence

# 3. Start all services (takes 2-3 minutes)
make start

# 4. Wait for healthy status
docker compose ps
# All services should show "Up" status

# 5. Verify frontend is accessible
curl -k https://localhost 2>&1 | grep -q "DOCTYPE" && echo "✅ Frontend Ready"
# Note: Using -k flag to skip SSL verification (self-signed certificate is normal for local dev)
```

### Quick Health Check

```bash
# Check all microservices are running
make health

# Or manually check each service (use -k flag for HTTPS if needed)
curl -s http://localhost:3001/health | jq .  # Auth Service
curl -s http://localhost:3002/health | jq .  # Game Service
curl -s http://localhost:3004/health | jq .  # User Service
curl -s http://localhost:3003/health | jq .  # Tournament Service

# Expected: {"status":"healthy"} or similar for each
# Note: Some services might respond on HTTPS, use: curl -sk https://localhost:3001/health
```

---

## Browser-Based Feature Showcase

### Access the Application

```
URL: http://localhost
Browser: Chrome, Firefox, Safari (recommend Firefox)
Resolution: 1920x1080 (for best display)
Network: Local or via HTTPS at https://localhost (if HTTPS configured)
```

### 1. Authentication & Security Module

#### Feature: User Registration

**Steps:**
1. Open http://localhost in browser
2. Click **"Register"** button
3. Fill registration form:
   - Username: `testuser_demo`
   - Email: `testuser@example.com`
   - Password: `SecurePass123!`
   - Confirm: `SecurePass123!`
4. Click **"Create Account"**
5. **Expected:** Automatically logged in, redirected to main menu

**What to Look For:**
- ✅ Form validation (empty fields, weak password)
- ✅ Unique username check
- ✅ Email format validation
- ✅ Auto-login after registration
- ✅ Secure password handling

#### Feature: OAuth Login (42 School)

**Prerequisites:** OAuth configured in `.env`

**Steps:**
1. On login page, click **"Sign in with 42"**
2. You'll be redirected to 42's OAuth provider
3. Log in with your 42 credentials
4. Click **"Allow"** to authorize
5. **Expected:** Redirect back, automatically logged in with profile created

**What to Look For:**
- ✅ OAuth flow completion
- ✅ Profile auto-creation from OAuth data
- ✅ Session token generation
- ✅ HTTPS redirect handling

#### Feature: Two-Factor Authentication (2FA)

**Steps:**
1. Login with your account
2. Go to **Profile → Security Settings**
3. Click **"Enable 2FA"**
4. Scan QR code with authenticator app:
   - Google Authenticator
   - Microsoft Authenticator
   - Authy
5. Enter 6-digit code from app
6. Click **"Verify and Enable"**
7. Save backup codes in secure location

**Verification:**
- Logout
- Try login again
- System should prompt for 2FA code
- Enter code from authenticator app
- **Expected:** Login successful with 2FA

**What to Look For:**
- ✅ QR code generation
- ✅ Time-based code validation (TOTP)
- ✅ Backup codes generation
- ✅ 2FA enforcement on login
- ✅ Session timeout handling

#### Feature: HTTPS/TLS Security

**Steps:**
1. Open https://localhost in browser
2. Browser will show certificate warning (self-signed)
3. Click "Advanced" → "Accept Risk and Continue"
4. **Expected:** Access granted, notice "🔒 Secure" in address bar

**What to Look For:**
- ✅ HTTPS enforcement
- ✅ Valid certificate (or self-signed for dev)
- ✅ HTTP-only cookies (browser doesn't expose to JavaScript)
- ✅ Secure headers present

**Terminal Verification:**
```bash
# Check HTTPS is working (use GET instead of HEAD, some servers have issues with HEAD)
curl -k -s https://localhost 2>&1 | head -1
# Expected: <!DOCTYPE html>

# Verify HTTP-only cookies
curl -k -c /tmp/cookies.txt -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser_demo","password":"SecurePass123!"}'
cat /tmp/cookies.txt | grep -i "httponly"
# Should show: HttpOnly flag is set
```

---

### 2. Game Modes & Gameplay Module

#### Feature: Arcade Mode (Quick 1v1 Match)

**Steps:**
1. From main menu, click **"Arcade Mode"**
2. Click **"Create Game"** or **"Join Game"**
3. You'll be placed in a game lobby
4. Click **"Start Game"**
5. Play Pong against AI or another player

**What to Look For:**
- ✅ Game initializes without lag
- ✅ Ball physics working (collision detection)
- ✅ Score tracking in real-time
- ✅ Paddle response to keyboard inputs
- ✅ Game ends when score reaches 3 points
- ✅ Match result recorded automatically

**Controls:**
- **W/↑** - Move paddle up
- **S/↓** - Move paddle down
- **Space** - Ready/Start
- **ESC** - Forfeit/Exit

#### Feature: Campaign Mode (PvE)

**Steps:**
1. From main menu, click **"Campaign"**
2. Click **"New Campaign"**
3. Select **"Easy"**, **"Normal"**, or **"Hard"** difficulty
4. Click **"Start"**
5. Beat AI opponents across levels

**What to Look For:**
- ✅ Progressive difficulty increase
- ✅ AI behaves intelligently (adapts to player)
- ✅ Level progression system
- ✅ Score multipliers for higher difficulties
- ✅ Leaderboard tracking

#### Feature: Tournament Mode

**Steps:**
1. From main menu, click **"Tournaments"**
2. Click **"Create Tournament"**
3. Enter tournament name (e.g., "Demo Tournament")
4. Set max players: 4 or 8
5. Click **"Create"**
6. Invite other players or add AI
7. Click **"Start Tournament"**
8. Play matches in bracket format

**What to Look For:**
- ✅ Tournament bracket generation (4/8/16 players)
- ✅ Match scheduling
- ✅ Automatic advancement on wins
- ✅ Final rankings
- ✅ Statistics tracking per tournament
- ✅ Blockchain recording (if enabled)

**View Tournament Results:**
1. Go to **Tournaments → History**
2. Click tournament name
3. See full bracket and results

---

### 3. User Profile & Statistics Module

#### Feature: View Profile Dashboard

**Steps:**
1. Click **"Profile"** in main menu
2. View your profile showing:
   - Avatar and username
   - Win/Loss ratio
   - Total matches played
   - Current ranking
   - Recent matches

**What to Look For:**
- ✅ All statistics displayed correctly
- ✅ Recent match history shown
- ✅ Ranking based on wins/losses
- ✅ Match details (opponent, score, date)
- ✅ Profile avatar visible

#### Feature: Edit Profile

**Steps:**
1. In Profile, click **"Edit Profile"**
2. Update:
   - **Display Name**: New name for display
   - **Bio**: Short description
   - **Avatar**: Upload image or choose from presets
3. Click **"Save Changes"**
4. **Expected:** Profile updates immediately

**What to Look For:**
- ✅ Image upload works
- ✅ Bio character limits enforced
- ✅ Changes persist after logout/login
- ✅ Avatar displays correctly in matches

#### Feature: Statistics & Analytics

**Steps:**
1. In Profile, click **"Statistics"**
2. View detailed stats:
   - Win rate (percentage)
   - Wins/losses by game mode
   - Most frequent opponent
   - Average match duration
   - Daily activity chart

**What to Look For:**
- ✅ Accurate calculation of statistics
- ✅ Charts render correctly
- ✅ Data filters work (by date range, game mode)
- ✅ Export statistics button (if available)

---

### 4. Social & Friends System Module

#### Feature: Add Friend

**Steps:**
1. Click **"Social"** or **"Players"** in menu
2. Search for a username
3. Click **"Add Friend"**
4. User receives friend request notification

**What to Look For:**
- ✅ Search functionality works
- ✅ Friend request sent notification
- ✅ Request appears in receiver's pending list

#### Feature: Accept/Reject Friend Request

**Steps:**
1. If you receive a friend request, notification appears
2. Click notification or go to **Friends → Pending**
3. Click **"Accept"** or **"Reject"**

**What to Look For:**
- ✅ Requests properly recorded
- ✅ Friends list updates immediately
- ✅ Can see friend's online status

#### Feature: View Friends & Online Status

**Steps:**
1. Click **"Friends"** in menu
2. See list of all friends with status
3. Click on friend to:
   - View their profile
   - View their statistics
   - Invite to a game

**What to Look For:**
- ✅ Online/offline status updates
- ✅ Friend profiles accessible
- ✅ Can initiate match invitation

---

### 5. AI Opponent Module

#### Feature: Play Against AI

**Steps:**
1. In Arcade Mode, select **"Play vs AI"**
2. Choose difficulty: Easy, Normal, Hard
3. Click **"Start Game"**
4. Notice AI paddle movement

**AI Characteristics:**
- **Easy**: Slower reaction time, occasional misses
- **Normal**: Responsive, competitive play
- **Hard**: Near-perfect returns, strategic positioning

**What to Look For:**
- ✅ AI responds to ball movement
- ✅ Difficulty levels noticeably different
- ✅ AI doesn't cheat (ball speed same as player)
- ✅ Game responsiveness smooth

---

### 6. Blockchain Integration Module

#### Feature: Tournament Recording on Blockchain

**Prerequisites:**
- Smart contract deployed
- Tournament has completed

**Steps:**
1. Complete a full tournament
2. Go to **Tournaments → History**
3. Click completed tournament
4. Click **"View on Blockchain"** (if available)

**What to Look For:**
- ✅ Transaction hash displayed
- ✅ Can verify on Hardhat network
- ✅ Tournament data immutable
- ✅ Timestamp recorded

**Terminal Verification:**
```bash
# Check blockchain transactions
curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq .

# List tournaments on blockchain
curl -s http://localhost:3003/tournaments/blockchain
```

---

### 7. Database & Data Persistence Module

#### Feature: Data Persists Across Restarts

**Steps:**
1. Create account, play a match, view profile
2. Stop services: `make stop`
3. Start services: `make start` (wait 2-3 min)
4. Login again
5. Go to Profile → Statistics
6. **Expected:** All previous data still present

**What to Look For:**
- ✅ Database files persist in Docker volumes
- ✅ Match history unchanged
- ✅ User profiles intact
- ✅ Rankings recalculated correctly

---

### 8. GDPR Compliance Module

#### Feature: Export Personal Data

**Steps:**
1. Click **"Profile"** → **"Privacy & Data"**
2. Click **"Export My Data"**
3. Download starts (JSON file)
4. Open JSON file to view contents

**What Should Be Included:**
```json
{
  "user": {
    "id": "...",
    "username": "...",
    "email": "...",
    "createdAt": "..."
  },
  "profile": {
    "bio": "...",
    "avatar": "..."
  },
  "matches": [...],
  "friends": [...],
  "tournaments": [...]
}
```

**What to Look For:**
- ✅ All personal data included
- ✅ Properly formatted JSON
- ✅ No truncation of data
- ✅ Timestamps present

#### Feature: Delete Account

**⚠️ CAUTION: This action cannot be undone!**

**Steps (for testing with test account):**
1. Login with test account
2. Go to **Profile** → **Privacy & Data**
3. Click **"Delete Account"**
4. Read warning carefully
5. Type "DELETE" to confirm
6. Click **"Confirm Deletion"**
7. **Expected:** Account removed, redirected to login

**What to Look For:**
- ✅ Requires explicit confirmation
- ✅ Account immediately inaccessible
- ✅ Cannot login with deleted account
- ✅ Data removed from all services

---

## Terminal-Based Module Verification

### ℹ️ Important Notes for Terminal Testing

**SSL/TLS Certificate Handling:**
- Frontend (nginx): Uses self-signed HTTPS certificate
  - Use `-k` flag with curl to skip verification: `curl -k https://localhost`
  - This is normal for local development
  
- Internal Services (port 3001-3004): Use HTTP internally
  - No -k flag needed for internal API calls
  - Example: `curl http://localhost:3001/health`

**Common curl flags you'll need:**
```bash
-k     # Skip SSL certificate verification (for HTTPS frontend)
-s     # Silent mode (no progress bar)
-X     # Specify HTTP method (POST, PUT, GET, DELETE)
-H     # Add header
-d     # Send data (POST body)
-c     # Save cookies to file
-b     # Send cookies from file
```

**If curl commands fail with SSL error:**
```bash
# Frontend test - use -k flag
curl -k https://localhost

# Or use jq if you have it
curl -sk https://localhost | jq . | head -20
```

### Health Check & Service Verification

#### 1. Check All Services Running

```bash
# View container status
docker compose ps

# Expected output:
# NAME                STATUS              PORTS
# auth-service        Up (healthy)        3001/tcp
# game-service        Up (healthy)        3002/tcp
# tournament-service  Up (healthy)        3003/tcp
# user-service        Up (healthy)        3004/tcp
# frontend            Up                  80/tcp, 443/tcp
# elasticsearch       Up (healthy)        9200/tcp
# hardhat-node        Up (healthy)        8545/tcp
# prometheus          Up                  9090/tcp
# grafana             Up                  3000/tcp
# kibana              Up                  5601/tcp
# vault               Up                  8200/tcp
# filebeat            Created/Running
# ssr-service         Up                  3005/tcp
```

#### 2. Check Service Health Endpoints

```bash
# Auth Service Health
echo "=== Auth Service ==="
curl -s http://localhost:3001/health | jq .

# Game Service Health
echo "=== Game Service ==="
curl -s http://localhost:3002/health | jq .

# User Service Health
echo "=== User Service ==="
curl -s http://localhost:3004/health | jq .

# Tournament Service Health
echo "=== Tournament Service ==="
curl -s http://localhost:3003/health | jq .

# Frontend Health
echo "=== Frontend ==="
curl -s http://localhost:80/api/health | jq . 2>/dev/null || echo "Frontend responding"
```

### Authentication Testing

#### Test User Registration

```bash
# Register new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "terminaluser",
    "email": "terminal@example.com",
    "password": "SecurePass123!"
  }' | jq .

# Expected response:
# {
#   "success": true,
#   "message": "User registered successfully",
#   "token": "eyJhbGciOiJIUzI1NiIs..."
# }
```

#### Test User Login

```bash
# Login with credentials
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "terminaluser",
    "password": "SecurePass123!"
  }' | jq .

# Save token for next requests
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"terminaluser","password":"SecurePass123!"}' | jq -r '.token')

echo "Token: $TOKEN"
```

#### Test Authentication with Token

```bash
# Verify token works
TOKEN="your_token_here"
curl -X GET http://localhost:3004/api/user/profile \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: Current user's profile data
```

### User Service Testing

#### Create/Update Profile

```bash
TOKEN="your_token_here"

# Update user profile
curl -X PUT http://localhost:3004/api/user/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "AwesomePlayer",
    "bio": "Testing from terminal",
    "avatar": "avatar_1"
  }' | jq .
```

#### Get User Statistics

```bash
TOKEN="your_token_here"

# Fetch user stats
curl -s http://localhost:3004/api/user/stats \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected response:
# {
#   "userId": "...",
#   "totalMatches": 0,
#   "wins": 0,
#   "losses": 0,
#   "winRate": 0,
#   "ranking": 1000
# }
```

### Game Service Testing

#### Create a Game Match

```bash
TOKEN="your_token_here"

# Create game
curl -X POST http://localhost:3002/api/games/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gameMode": "arcade",
    "opponentType": "ai",
    "difficulty": "normal"
  }' | jq .

# Response will include gameId for next requests
```

#### Join Existing Game

```bash
TOKEN="your_token_here"

# List available games
curl -s http://localhost:3002/api/games/available \
  -H "Authorization: Bearer $TOKEN" | jq .

# Join a game
GAME_ID="game_id_from_list"
curl -X POST http://localhost:3002/api/games/$GAME_ID/join \
  -H "Authorization: Bearer $TOKEN" | jq .
```

#### Record Game Result

```bash
TOKEN="your_token_here"
GAME_ID="game_id"

# Record match end with score
curl -X POST http://localhost:3002/api/games/$GAME_ID/finish \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "playerScore": 3,
    "opponentScore": 1,
    "duration": 120
  }' | jq .
```

### Tournament Service Testing

#### Create Tournament

```bash
TOKEN="your_token_here"

# Create new tournament
curl -X POST http://localhost:3003/api/tournaments/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Terminal Demo Tournament",
    "maxPlayers": 4,
    "type": "single_elimination"
  }' | jq .
```

#### List Tournaments

```bash
# Get all tournaments
curl -s http://localhost:3003/api/tournaments/list | jq '.[] | {id, name, status, participants}'
```

#### View Tournament Details

```bash
TOKEN="your_token_here"
TOURNAMENT_ID="tournament_id"

# Get tournament with bracket
curl -s http://localhost:3003/api/tournaments/$TOURNAMENT_ID \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Database Verification

#### Check SQLite Databases

```bash
# Auth Database
sqlite3 auth-service/database/auth.db ".tables"
# Expected tables: users, sessions, tokens

sqlite3 auth-service/database/auth.db "SELECT COUNT(*) as user_count FROM users;"

# User Database
sqlite3 user-service/database/users.db "SELECT COUNT(*) as profile_count FROM profiles;"

# Game Database
sqlite3 game-service/database/games.db "SELECT COUNT(*) as match_count FROM matches;"

# Tournament Database
sqlite3 tournament-service/database/tournaments.db "SELECT COUNT(*) as tournament_count FROM tournaments;"
```

#### View Specific Data

```bash
# List all users
sqlite3 auth-service/database/auth.db "SELECT id, username, email FROM users LIMIT 5;"

# View user profiles
sqlite3 user-service/database/users.db "SELECT * FROM profiles LIMIT 3;"

# Check match history
sqlite3 game-service/database/games.db "SELECT id, player1_id, player2_id, winner_id, created_at FROM matches LIMIT 5;"
```

### Elasticsearch Verification

#### Check Cluster Health

```bash
# Get cluster health
curl -s http://localhost:9200/_cluster/health | jq .

# Expected:
# {
#   "status": "green",
#   "number_of_nodes": 1,
#   "active_primary_shards": 0
# }
```

#### View Indices

```bash
# List all indices
curl -s http://localhost:9200/_cat/indices?v

# Get index mapping
curl -s http://localhost:9200/logs-*/_mapping | jq '.[] | .mappings.properties' | head -20
```

#### Search Logs

```bash
# Search game logs
curl -s "http://localhost:9200/logs-game-*/_search?q=*" | jq '.hits.hits[] | {_id, _source}' | head -50

# Search authentication logs
curl -s "http://localhost:9200/logs-auth-*/_search?q=login" | jq '.hits.hits[0:5]'

# Count logs by type
curl -s "http://localhost:9200/_cat/indices" | awk '{print $3}' | sort | uniq -c
```

### Prometheus & Monitoring

#### Check Metrics Collection

```bash
# Verify Prometheus is scraping
curl -s http://localhost:9090/api/v1/query?query=up | jq '.data.result[] | {job: .metric.job, value: .value[1]}'

# Get node count
curl -s http://localhost:9090/api/v1/query?query=node_count | jq .

# Memory usage by service
curl -s 'http://localhost:9090/api/v1/query?query=container_memory_usage_bytes' | jq '.data.result[] | {container: .metric.name, memory: .value[1]}'
```

#### Access Grafana Dashboards

```bash
# Get Grafana health
curl -s http://localhost:3000/api/health | jq .

# List available dashboards
curl -s http://localhost:3000/api/search?query=* | jq '.[] | {title, id}' | head -10
```

### Blockchain Verification

#### Check Hardhat Node Status

```bash
# Get current block number
curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq '.result'

# Get accounts
curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}' | jq '.result'

# Get balance
ACCOUNT="0x..."  # Use account from above
curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$ACCOUNT\",\"latest\"],\"id\":1}" | jq '.result'
```

#### Verify Smart Contract

```bash
# Get contract address
curl -s http://localhost:3003/api/blockchain/contract-address | jq .

# Check contract state
CONTRACT_ADDR="0x..."
curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"$CONTRACT_ADDR\",\"latest\"],\"id\":1}" | jq '.result'
```

---

## Feature Matrix

| Module | Feature | Browser Test | Terminal Test | Points |
|--------|---------|--------------|---------------|--------|
| **AUTH** | Registration | ✅ Form | ✅ POST /register | 5 |
| | Login | ✅ Form | ✅ POST /login | 5 |
| | OAuth (42) | ✅ 42 button | ✅ Redirect flow | 5 |
| | 2FA/TOTP | ✅ QR code | ✅ TOTP validation | 5 |
| | HTTPS | ✅ Lock icon | ✅ cert check | 5 |
| **GAME** | Arcade 1v1 | ✅ Play | ✅ POST /create | 5 |
| | Campaign | ✅ Levels | ✅ Difficulty levels | 5 |
| | Tournament | ✅ Bracket | ✅ GET /tournaments | 5 |
| | AI | ✅ vs AI | ✅ AI logic | 5 |
| **USER** | Profile | ✅ View | ✅ GET /profile | 5 |
| | Statistics | ✅ View | ✅ GET /stats | 5 |
| | Friends | ✅ Add/view | ✅ Friend API | 5 |
| **SOCIAL** | Online Status | ✅ See | ✅ Status API | 5 |
| | Leaderboard | ✅ View | ✅ Ranking query | 5 |
| **BLOCKCHAIN** | Tournament Recording | ✅ View | ✅ eth_blockNumber | 5 |
| **DATABASE** | Persistence | ✅ After restart | ✅ sqlite3 query | 5 |
| **GDPR** | Export Data | ✅ Download | ✅ JSON export | 5 |
| | Delete Account | ✅ Delete | ✅ Account gone | 5 |
| **MONITORING** | Logging | ✅ Console | ✅ ES search | 3 |
| | Metrics | ✅ Dashboard | ✅ Prometheus | 2 |
| **BONUS** | Technical Excellence | - | - | 10 |

---

## Advanced Testing

### Load Testing

```bash
# Install Apache Bench (if not installed)
sudo apt install apache2-utils

# Load test the frontend
ab -n 100 -c 10 http://localhost/

# Load test API
ab -n 100 -c 10 http://localhost:3001/health

# Results should show < 100ms avg response time
```

### WebSocket Testing (Real-time Features)

```bash
# Test WebSocket connection
wscat -c ws://localhost:3002/ws/game/live

# Expected: Connection accepted, ready for real-time updates
```

### Network Latency Simulation

```bash
# Simulate 100ms latency on localhost (requires sudo)
sudo tc qdisc add dev lo root netem delay 100ms

# Run tests
curl http://localhost

# Remove latency
sudo tc qdisc del dev lo root
```

### Database Stress Test

```bash
# Create 1000 test users
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"stresstest_$i\",
      \"email\": \"stress$i@example.com\",
      \"password\": \"SecurePass123!\"
    }" 2>/dev/null
done

# Verify database size
du -sh auth-service/database/
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs for specific service
docker compose logs -f auth-service
docker compose logs -f game-service
docker compose logs -f elasticsearch

# Rebuild services
make stop
docker compose build --no-cache
make start
```

### Authentication Fails

```bash
# Check auth service logs
docker compose logs auth-service | tail -50

# Verify token endpoint
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser_demo","password":"SecurePass123!"}' -v

# Check for 401/403 errors
```

### Game Won't Load

```bash
# Verify game service
curl http://localhost:3002/health

# Check browser console for errors
# F12 → Console tab

# Verify WebSocket connection
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:3002/ws/game/live
```

### Database Issues

```bash
# Check database integrity
sqlite3 auth-service/database/auth.db "PRAGMA integrity_check;"

# Rebuild database (WARNING: loses data)
rm -f auth-service/database/auth.db
docker compose restart auth-service

# Wait for initialization
docker compose logs -f auth-service | grep -i "connected"
```

### Elasticsearch Not Working

```bash
# Check cluster health
curl http://localhost:9200/_cluster/health

# Restart Elasticsearch
docker compose restart elasticsearch

# Wait for green status
while [ "$(curl -s http://localhost:9200/_cluster/health | jq -r .status)" != "green" ]; do
  echo "Waiting for ES..."
  sleep 2
done
echo "Elasticsearch ready!"
```

### HTTPS Certificate Issues

```bash
# Regenerate self-signed certificate
cd nginx/certs
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Restart nginx
docker compose restart nginx
```

---

## Quick Command Reference

```bash
# Start all services
make start

# Stop all services
make stop

# View logs
make logs

# Health check
make health

# Restart specific service
docker compose restart auth-service

# SSH into running container
docker compose exec auth-service bash

# Run tests
make test

# Clean everything (WARNING: deletes data)
make clean

# View database
sqlite3 auth-service/database/auth.db

# Check Elasticsearch
curl http://localhost:9200

# Access Grafana
open http://localhost:3000
```

---

## Feature Completion Checklist

Use this checklist to verify all features during evaluation:

- [ ] User Registration works
- [ ] OAuth Login (42) works
- [ ] 2FA/TOTP enabled and validated
- [ ] HTTPS accessible with certificate
- [ ] Arcade mode playable
- [ ] Campaign mode with levels
- [ ] Tournament mode with bracket
- [ ] AI opponent functional
- [ ] User profile editable
- [ ] Statistics accurate
- [ ] Friends system working
- [ ] Leaderboard displays correctly
- [ ] Data exports as JSON
- [ ] Account deletion works
- [ ] Match history persists
- [ ] Blockchain records transactions
- [ ] Database survives restart
- [ ] All services healthy (docker ps)
- [ ] Elasticsearch collecting logs
- [ ] Prometheus gathering metrics
- [ ] Grafana dashboards accessible

**Total Features: 20/20 ✅**

---

**Last Updated:** December 9, 2025  
**Status:** Complete & Ready for Evaluation
