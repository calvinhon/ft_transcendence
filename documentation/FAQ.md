# FT_TRANSCENDENCE - Frequently Asked Questions (FAQ)

**Last Updated**: December 5, 2025

This document contains common questions and answers about the ft_transcendence project.

---

## General Concepts

### Q: What is the Framework module (Fastify + Node.js + TypeScript)?

**A:** The **Framework module** refers to using a modern web framework instead of pure PHP for building the backend. In ft_transcendence, we implement this using **Fastify + Node.js + TypeScript**.

#### Component Breakdown

**1. Node.js** - JavaScript Runtime Environment
- **What it is**: Server-side JavaScript runtime built on Chrome's V8 engine
- **Purpose**: Allows JavaScript to run on the server (outside browser)
- **Benefits**: 
  - Asynchronous I/O (handles many requests simultaneously)
  - NPM ecosystem (millions of packages)
  - Fast execution with V8 engine
  - Same language for frontend and backend (JavaScript/TypeScript)

**2. TypeScript** - Typed Superset of JavaScript
- **What it is**: JavaScript with static typing (compile-time type checking)
- **Purpose**: Add type safety to JavaScript code
- **Benefits**:
  - Catch errors before runtime (during compilation)
  - Auto-completion and IntelliSense in IDEs
  - Self-documenting code with type annotations
  - Easier refactoring and maintenance
  - Compiles to plain JavaScript

Example:
```typescript
// TypeScript with types
interface User {
    id: string;
    username: string;
    email: string;
}

function getUser(id: string): User {
    // TypeScript ensures you return a User object
    return { id, username: "player1", email: "player1@example.com" };
}
```

**3. Fastify** - Web Framework
- **What it is**: High-performance web framework for Node.js
- **Purpose**: Handle HTTP requests, routing, middleware, validation
- **Benefits**:
  - **Fast**: Up to 20,000 requests/second (2x faster than Express)
  - **Low Overhead**: ~50MB RAM per service
  - **Schema Validation**: Built-in JSON Schema validation
  - **TypeScript Support**: First-class TypeScript support
  - **Plugin System**: Modular architecture
  - **Async/Await**: Modern async patterns

Example:
```typescript
import Fastify from 'fastify';

const server = Fastify({ logger: true });

// Define route with schema validation
server.post('/api/auth/login', {
    schema: {
        body: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 8 }
            }
        }
    }
}, async (request, reply) => {
    const { email, password } = request.body;
    // Handle login logic
    return { success: true, token: "jwt_token" };
});

await server.listen({ port: 3001 });
```

#### Why This Stack?

**Subject Requirement**: 
- Subject allows either pure PHP OR a backend framework
- Framework module is worth **10 points** (major module)

**Our Choice - Fastify + Node.js + TypeScript**:
1. **Performance**: Handles real-time WebSocket for game synchronization
2. **Type Safety**: TypeScript prevents bugs in 18,750+ lines of code
3. **Modern**: Async/await for clean asynchronous code
4. **Ecosystem**: NPM packages for JWT, OAuth, WebSocket, etc.
5. **Developer Experience**: Better tooling, debugging, and auto-completion

#### In ft_transcendence

We use this stack for **4 microservices**:

1. **auth-service** (Port 3001) - Fastify + JWT + bcrypt
   - Authentication, registration, OAuth, 2FA
   
2. **game-service** (Port 3002) - Fastify + WebSocket
   - Real-time Pong game logic, server-side physics
   
3. **user-service** (Port 3003) - Fastify + SQLite
   - User profiles, friends, statistics
   
4. **tournament-service** (Port 3004) - Fastify + Blockchain
   - Tournament management, blockchain integration

Each service is independent, has its own database, and communicates via RESTful APIs.

#### File Structure Example

```
auth-service/
├── package.json          # Dependencies: fastify, @fastify/jwt, bcrypt
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── server.ts         # Fastify instance creation
│   ├── routes/           # API route handlers
│   │   ├── auth.ts       # POST /auth/login, /auth/register
│   │   └── oauth.ts      # OAuth flows
│   └── services/         # Business logic
│       └── authService.ts
└── database/
    └── auth.db           # SQLite database
```

#### Performance Comparison

| Framework | Req/sec | Memory | Latency |
|-----------|---------|--------|---------|
| Fastify   | 20,000+ | 50MB   | 5ms     |
| Express   | 10,000  | 80MB   | 12ms    |
| PHP (raw) | 5,000   | 100MB+ | 25ms    |

**Conclusion**: The Framework module (Fastify + Node.js + TypeScript) provides a modern, performant, and type-safe foundation for building scalable microservices architecture with real-time capabilities.

---

### Q: What does API stand for?

**A:** API stands for **Application Programming Interface**.

In the context of this project (ft_transcendence), the APIs are the HTTP endpoints that allow the frontend to communicate with the backend microservices. For example:

- `/api/auth/login` - Authentication API endpoint
- `/api/game/ws` - WebSocket API for real-time game communication
- `/api/tournament/create` - Tournament creation API endpoint
- `/api/user/stats/:userId` - User statistics API endpoint

The `/api/` prefix in the nginx configuration routes requests to the appropriate backend service (auth-service, game-service, tournament-service, or user-service).

---

## Security & CORS

### Q: What is CORS and why is it configured for all API endpoints?

**A:** CORS stands for **Cross-Origin Resource Sharing**.

In the ft_transcendence project, CORS is configured for all API endpoints to allow the frontend (running on `http://localhost`) to make requests to the backend services.

#### Purpose of CORS Configuration

**Without CORS**: Browsers block requests from `http://localhost` (frontend) to `http://localhost/api/*` (backend) because they're considered different "origins" due to security policies.

**With CORS**: The backend explicitly tells the browser "it's okay to accept requests from http://localhost"

#### CORS Configuration in nginx

In the nginx configuration (`frontend/nginx/nginx.conf`):

```nginx
# For auth service (with credentials for cookies)
location /api/auth/ {
    # CORS headers
    add_header 'Access-Control-Allow-Origin' 'http://localhost' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
}
```

#### Key CORS Headers Explained

1. **`Access-Control-Allow-Origin: http://localhost`**
   - Specifies which origin (domain) can access the API
   - Allows requests from `http://localhost`

2. **`Access-Control-Allow-Credentials: true`**
   - **Critical for HTTP-only cookies!**
   - Allows the browser to send cookies with requests
   - Required for JWT cookie authentication to work

3. **`Access-Control-Allow-Methods: GET, POST, OPTIONS`**
   - Lists which HTTP methods are allowed
   - OPTIONS is for preflight requests

4. **`Access-Control-Allow-Headers: ...`**
   - Lists which request headers the browser can send
   - Includes `Authorization` for backward compatibility

#### Why It's Essential for This Project

The authentication system uses **HTTP-only cookies**, which require:
- `Access-Control-Allow-Credentials: true`
- Specific origin (not `*`) - we use `http://localhost`
- Cookie proxy headers in nginx

Without proper CORS + credentials configuration, the authentication would fail because browsers wouldn't send the JWT cookie with API requests.

---

## Authentication

### Q: Why use HTTP-only cookies instead of localStorage/sessionStorage?

**A:** HTTP-only cookies provide better security against XSS (Cross-Site Scripting) attacks:

1. **HTTP-only Flag**: JavaScript cannot access the cookie via `document.cookie`
2. **SameSite=Strict**: Prevents CSRF (Cross-Site Request Forgery) attacks
3. **Automatic Sending**: Browser automatically includes cookies in requests
4. **Server-Side Control**: Only the backend can set/clear the authentication token

**Previous Vulnerability**: Storing JWT in localStorage/sessionStorage allows any JavaScript code (including malicious XSS payloads) to steal the token.

**Current Implementation**: JWT stored in HTTP-only cookie that's inaccessible to JavaScript, significantly reducing attack surface.

---

## Game Mechanics

### Q: Why are tournament controls position-based instead of player-based?

**A:** In tournament mode, two players share the same keyboard for local multiplayer. Position-based controls make sense because:

1. **Physical Seating**: Players sit on left/right sides of the keyboard
2. **Consistent Controls**: Left player always uses W/S, right player always uses U/J
3. **No Confusion**: Controls don't change when players swap sides in the UI
4. **Natural Mapping**: Physical position matches paddle position on screen

**Key Implementation**:
- Left paddle: W/S or Arrow keys → sends `playerId: 1` → routes to `team1[0]`
- Right paddle: U/J keys → sends `playerId: 2` → routes to `team2[0]`
- When players swap sides in UI, we track `originalPlayer1Id` and `originalPlayer2Id` for result reporting

---

## Architecture

### Q: What game modes are actually implemented?

**A:** The system implements three game modes:

1. **Co-op / Campaign Mode (21 Levels)**
   - Single player vs AI bot
   - Progressive difficulty (easy → medium → hard)
   - Campaign level saved in user profile
   - Automatic advancement on win

2. **Arcade Mode (Local Multiplayer)**
   - Team-based gameplay (1v1, 2v2, 3v3)
   - Multiple paddles per side
   - Host + local guest players
   - Team controls:
     * Team 1: Q/A, W/S, E/D
     * Team 2: U/J, I/K, O/L

3. **Tournament Mode (Single-Elimination Brackets)**
   - Create tournaments with up to 8+ players
   - Automatic BYE handling
   - Local 1v1 matches on same keyboard
   - Blockchain recording of results

**Not Implemented**: Quick Match PVP (online matchmaking), standalone Bot Training mode

---

## Technical Details

### Q: How does the WebSocket game synchronization work?

**A:** The game uses a server-authoritative model:

1. **Client Input**: Frontend sends paddle movement commands via WebSocket
   ```json
   {"type": "movePaddle", "direction": "up", "playerId": 1}
   ```

2. **Server Physics**: Backend calculates game physics at 60 FPS
   - Ball movement and collision detection
   - Paddle positions
   - Scoring

3. **State Broadcast**: Server sends game state updates to all clients at 60 FPS
   ```json
   {
     "type": "gameStateUpdate",
     "gameState": {
       "ball": {"x": 405, "y": 303, "dx": 5, "dy": 3},
       "paddles": {...},
       "scores": {"player1": 1, "player2": 0}
     }
   }
   ```

4. **Client Rendering**: Frontend renders the authoritative server state

**Benefits**: Prevents cheating, ensures consistency, handles network lag gracefully

---

## Blockchain

### Q: How are tournament results recorded on the blockchain?

**A:** Tournament results are recorded on a local Ethereum blockchain (Hardhat node):

1. **Smart Contract**: `TournamentRankings.sol` stores tournament results
   ```solidity
   mapping(tournamentId => mapping(playerAddress => rank))
   ```

2. **After Tournament Completion**:
   - Calculate final rankings (1st, 2nd, 3rd, 4th places)
   - Convert userIds to Ethereum addresses
   - Call `recordRanks()` function on smart contract
   - Transaction is mined and confirmed

3. **Immutability**: Once recorded, tournament results cannot be altered

4. **Verification**: Anyone can query the blockchain to verify tournament results
   ```typescript
   const rank = await contract.getRank(tournamentId, playerAddress);
   ```

**Purpose**: Provides tamper-proof proof of tournament outcomes

---

## Deployment

### Q: Why do all services use port 3000 internally but different ports externally (3001, 3002, 3003, 3004)?

**A:** This is Docker port mapping - each service runs on port 3000 **inside its own container**, but is mapped to a different port on the **host machine**.

#### Port Mapping Explanation

**Internal Port (Inside Container)**: All services listen on port `3000`
```typescript
// In each service's server.ts
const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: '0.0.0.0' });
```

**External Port (Host Machine)**: Each service maps to a unique external port
```yaml
# docker-compose.yml
auth-service:
  ports:
    - "3001:3000"  # host:container
    
game-service:
  ports:
    - "3002:3000"
    
tournament-service:
  ports:
    - "3003:3000"
    
user-service:
  ports:
    - "3004:3000"
```

#### Port Mapping Format: `HOST:CONTAINER`

- **`3001:3000`** means:
  - **Left (3001)**: Port on your **host machine** (your laptop/computer)
  - **Right (3000)**: Port **inside the Docker container**
  - Traffic to `localhost:3001` gets forwarded to container's port `3000`

#### Why This Design?

1. **Simplicity**: Each service uses the same internal port (3000) - simpler configuration
2. **Isolation**: Containers are isolated - they can all use port 3000 without conflicts
3. **External Access**: Different external ports let you access each service directly:
   - `http://localhost:3001` → auth-service
   - `http://localhost:3002` → game-service
   - `http://localhost:3003` → tournament-service
   - `http://localhost:3004` → user-service

#### Service-to-Service Communication

**Inside Docker network**, services talk to each other using **service names** and **internal port**:
```typescript
// From tournament-service talking to auth-service
fetch('http://auth-service:3000/verify')  // NOT localhost:3001!
```

**From your browser/host machine**, you use **localhost** and **external ports**:
```bash
curl http://localhost:3001/verify  # Access auth-service from host
```

#### nginx Routing

nginx (running on port 80) routes requests to services using **internal addresses**:
```nginx
upstream auth_backend {
    server auth-service:3000;  # Service name + internal port
}

upstream game_backend {
    server game-service:3000;
}
```

So when you visit `http://localhost/api/auth/login`:
1. Request goes to nginx (port 80)
2. nginx forwards to `auth-service:3000` (internal)
3. auth-service processes request
4. Response returns through nginx to your browser

#### Complete Port Map

| Service | Internal Port | External Port | Access From Host | Internal Access |
|---------|--------------|---------------|------------------|-----------------|
| nginx | 80 | 80 | `http://localhost` | `nginx:80` |
| auth-service | 3000 | 3001 | `http://localhost:3001` | `auth-service:3000` |
| game-service | 3000 | 3002 | `http://localhost:3002` | `game-service:3000` |
| tournament-service | 3000 | 3003 | `http://localhost:3003` | `tournament-service:3000` |
| user-service | 3000 | 3004 | `http://localhost:3004` | `user-service:3000` |
| hardhat-node | 8545 | 8545 | `http://localhost:8545` | `hardhat-node:8545` |

**In practice**: You only access through `http://localhost` (port 80) via nginx, which handles all routing internally.

---

### Q: Why does blockchain (hardhat-node) listen on port 8545 instead of 3000 like other services?

**A:** This is because **Hardhat** (the Ethereum development framework) uses **port 8545 as its standard default port** for the local blockchain node. This is an industry convention for Ethereum JSON-RPC APIs.

#### Why Port 8545?

1. **Ethereum Standard**: Port 8545 is the conventional port for Ethereum JSON-RPC servers
2. **Different Protocol**: Hardhat node uses JSON-RPC protocol, not HTTP REST like other services
3. **Compatibility**: Using 8545 ensures compatibility with Ethereum tools and libraries

#### Port Configuration

```yaml
# docker-compose.yml
hardhat-node:
  ports:
    - "8545:8545"  # Both internal and external use 8545
```

Unlike other services, hardhat-node uses the **same port internally and externally** (8545:8545) because:
- It's already a standard port
- No need to remap for clarity
- Ethereum tools expect this port

#### How Services Connect to Blockchain

**From tournament-service (inside Docker network)**:
```typescript
const provider = new ethers.JsonRpcProvider('http://hardhat-node:8545');
```

**From your computer (testing)**:
```bash
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

#### nginx Configuration Note

⚠️ **Important**: There's a discrepancy in the nginx configuration file:

```nginx
upstream blockchain_backend {
    server hardhat-node:3001;  # ❌ INCORRECT - should be 8545
}
```

This should be corrected to:
```nginx
upstream blockchain_backend {
    server hardhat-node:8545;  # ✅ CORRECT
}
```

**However**, the blockchain is not accessed through nginx in the current implementation. The tournament-service connects **directly** to `hardhat-node:8545` within the Docker network, so this nginx config line is unused.

#### Summary

- **Other services**: Use port 3000 internally (by design choice)
- **Hardhat node**: Uses port 8545 (Ethereum standard convention)
- **Access pattern**: Direct connection, not through nginx

---

### Q: What are the two types of communication in this program (REST API vs WebSocket) and how are they applied?

**A:** The ft_transcendence project uses **two different communication protocols** for different purposes:

## 1. REST API (Request-Response Pattern)

### What is REST API?

**REST** (Representational State Transfer) is a **stateless**, **request-response** protocol using HTTP methods:
- **Client sends request** → **Server processes** → **Server sends response** → **Connection closes**
- Each request is independent
- Traditional web API pattern

### HTTP Methods Used:
- **GET**: Retrieve data (e.g., get user profile, get tournament details)
- **POST**: Create data or trigger actions (e.g., register user, create tournament)
- **PUT**: Update data (e.g., update profile)
- **DELETE**: Remove data (e.g., delete tournament)

### Where REST API is Used in This Program:

#### 1. **Authentication Service** (auth-service)
```typescript
// User registration
POST /api/auth/register
Body: { username, email, password }
Response: { success: true, userId: 123 }

// User login (sets HTTP-only cookie)
POST /api/auth/login
Body: { username, password }
Response: { success: true, user: {...} }
Set-Cookie: token=jwt_token; HttpOnly; SameSite=Strict

// Token verification
POST /api/auth/verify
Cookie: token=jwt_token
Response: { valid: true, user: {...} }

// Logout (clears cookie)
POST /api/auth/logout
Response: { success: true }
```

**Why REST for Auth?**
- One-time operations (login once, not continuously)
- Stateless verification (each request can be verified independently)
- Standard HTTP security (cookies, headers)

#### 2. **Tournament Service** (tournament-service)
```typescript
// Create tournament
POST /api/tournament/create
Body: { name, description, maxParticipants }
Response: { success: true, tournamentId: 5 }

// Join tournament
POST /api/tournament/join
Body: { tournamentId: 5, userId: 123 }
Response: { success: true }

// Get tournament details
GET /api/tournament/details/5
Response: { tournament: {...}, participants: [...], matches: [...] }

// Submit match result
POST /api/tournament/match/result
Body: { tournamentId, matchId, winnerId, scores }
Response: { success: true, nextRound: [...] }

// Start tournament
POST /api/tournament/start/5
Response: { success: true, matches: [...] }
```

**Why REST for Tournaments?**
- CRUD operations (Create, Read, Update, Delete)
- Infrequent updates (create once, query occasionally)
- Complex data structures (brackets, participants, matches)
- No need for real-time push notifications

#### 3. **User Service** (user-service)
```typescript
// Get user profile
GET /api/user/profile/123
Response: { userId, username, stats: {...}, campaignLevel: 5 }

// Update profile
PUT /api/user/profile/123
Body: { displayName, bio, avatar }
Response: { success: true }

// Get user statistics
GET /api/user/stats/123
Response: { wins, losses, winRate, tournaments, achievements }

// Get leaderboard
GET /api/user/leaderboard
Response: [{ rank: 1, username, wins, winRate }, ...]

// Get achievements
GET /api/user/achievements/123
Response: [{ id, name, description, unlocked: true }, ...]
```

**Why REST for User Data?**
- Standard CRUD operations
- Data retrieval and updates
- No real-time requirements
- Client-initiated requests

#### REST API Flow Example:
```
User clicks "Create Tournament" button
    ↓
Frontend: fetch('http://localhost/api/tournament/create', {
    method: 'POST',
    credentials: 'include',  // Send cookies
    body: JSON.stringify({ name, description, maxParticipants })
})
    ↓
nginx receives request at port 80
    ↓
nginx routes to tournament-service:3000
    ↓
tournament-service processes request
    ↓
tournament-service queries SQLite database
    ↓
tournament-service returns response
    ↓
nginx forwards response to frontend
    ↓
Frontend updates UI with tournament data
```

---

## 2. WebSocket (Persistent Bi-directional Connection)

### What is WebSocket?

**WebSocket** is a **persistent**, **full-duplex** communication protocol:
- **Connection stays open** for the entire session
- **Bi-directional**: Both client and server can send messages anytime
- **Real-time**: No polling needed, instant message delivery
- **Low latency**: Minimal overhead after connection established

### WebSocket Protocol:
1. **Handshake**: HTTP upgrade request → WebSocket connection
2. **Persistent Connection**: Stays open
3. **Message Exchange**: Both directions, anytime
4. **Close**: Either side can close the connection

### Where WebSocket is Used in This Program:

#### **Game Service** (game-service) - **ONLY WebSocket Usage**

All real-time gameplay happens over WebSocket at `/api/game/ws`

```typescript
// Connection establishment
const ws = new WebSocket('ws://localhost/api/game/ws');

ws.onopen = () => {
    console.log('Connected to game server');
};
```

### WebSocket Message Flow:

#### 1. **Join Game** (Client → Server)
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
    "scoreToWin": 3
  }
}
```

#### 2. **Game Start** (Server → Client)
```json
{
  "type": "gameStart",
  "gameId": 42,
  "gameSettings": {...},
  "gameState": {
    "ball": {"x": 400, "y": 300, "dx": 5, "dy": 3, "frozen": true},
    "paddles": {"player1": {"x": 50, "y": 250}, "player2": {"x": 750, "y": 250}},
    "scores": {"player1": 0, "player2": 0},
    "status": "countdown"
  },
  "config": {
    "canvasWidth": 800,
    "canvasHeight": 600,
    "paddleWidth": 10,
    "paddleHeight": 100,
    "ballRadius": 5
  }
}
```

#### 3. **Countdown** (Server → Client)
```json
{"type": "countdown", "value": 3}
{"type": "countdown", "value": 2}
{"type": "countdown", "value": 1}
{"type": "countdown", "value": "GO!"}
```

#### 4. **Paddle Movement** (Client → Server) - **60 FPS**
```json
// Player pressing W key (up)
{"type": "movePaddle", "direction": "up"}

// Player pressing S key (down)
{"type": "movePaddle", "direction": "down"}

// Tournament mode - left player
{"type": "movePaddle", "direction": "up", "playerId": 1}

// Arcade mode - specific paddle
{"type": "movePaddle", "direction": "up", "playerId": 1, "paddleIndex": 0}
```

#### 5. **Game State Updates** (Server → Client) - **60 FPS (every 16.67ms)**
```json
{
  "type": "gameStateUpdate",
  "gameState": {
    "ball": {"x": 405.5, "y": 303.2, "dx": 5.5, "dy": 3.2, "frozen": false},
    "paddles": {
      "player1": {"x": 50, "y": 248},
      "player2": {"x": 750, "y": 252}
    },
    "scores": {"player1": 0, "player2": 0},
    "status": "playing"
  }
}
```

#### 6. **Score Event** (Server → Client)
```json
{
  "type": "score",
  "scorer": "player1",
  "scores": {"player1": 1, "player2": 0}
}
```

#### 7. **Game Over** (Server → Client)
```json
{
  "type": "gameOver",
  "winner": "player1",
  "finalScores": {"player1": 3, "player2": 1},
  "gameId": 42
}
```

### Why WebSocket for Game?

1. **Real-time Requirements**:
   - Game state updates at 60 FPS (16.67ms intervals)
   - Immediate paddle movement feedback
   - Ball physics synchronization

2. **Low Latency**:
   - No HTTP overhead per message
   - Connection already established
   - Minimal delay for player inputs

3. **Bi-directional**:
   - Server pushes game state continuously
   - Client sends paddle inputs anytime
   - No polling needed

4. **Efficiency**:
   - One connection for entire game session
   - Less bandwidth than REST polling
   - Server controls game loop timing

### WebSocket Connection Flow:
```
Frontend creates WebSocket connection
    ↓
ws = new WebSocket('ws://localhost/api/game/ws')
    ↓
Browser sends HTTP Upgrade request to nginx
    ↓
nginx upgrades connection and proxies to game-service:3000


    ↓
game-service accepts WebSocket connection
    ↓
Connection stays open (persistent)
    ↓
[Game Loop Runs]
While game is active:
    - Client sends paddle inputs (on key press)
    - Server calculates physics (60 FPS)
    - Server broadcasts state (60 FPS)
    - Client renders state (60 FPS)
    ↓
Game ends
    ↓
Server sends gameOver message
    ↓
Connection closes
```

---

## Comparison Table: REST API vs WebSocket in This Program

| Aspect | REST API | WebSocket |
|--------|----------|-----------|
| **Pattern** | Request-Response | Persistent Connection |
| **Direction** | Client-initiated only | Bi-directional |
| **Connection** | New connection per request | Single persistent connection |
| **Use Cases** | Auth, Tournaments, User Profiles | Real-time Game |
| **Services** | auth, tournament, user | game only |
| **Frequency** | Occasional (user actions) | Continuous (60 FPS) |
| **Data Size** | Larger payloads | Small frequent messages |
| **Latency** | Higher (new connection) | Lower (persistent) |
| **Overhead** | HTTP headers per request | Minimal after handshake |
| **State** | Stateless | Stateful (connection persists) |

---

## nginx Configuration for Both Protocols:

### REST API Proxy (HTTP)
```nginx
location /api/auth/ {
    proxy_pass http://auth-service:3000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    # ... standard HTTP proxy
}
```

### WebSocket Proxy (Upgrade)
```nginx
location /api/game/ws {
    proxy_pass http://game-service:3000/ws;
    proxy_http_version 1.1;
    
    # WebSocket-specific headers
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    proxy_set_header Host $host;
    # ... other headers
}
```

The key difference: `Upgrade` and `Connection "upgrade"` headers tell nginx to switch from HTTP to WebSocket protocol.

---

## Summary

**REST API** = Traditional web requests for standard operations (login, create tournament, get stats)
- ✅ Simple, stateless, well-understood
- ✅ Good for CRUD operations
- ✅ HTTP caching possible
- ❌ Not suitable for real-time

**WebSocket** = Real-time bi-directional communication for live gameplay
- ✅ Real-time, low latency
- ✅ Server can push updates
- ✅ Efficient for continuous data
- ❌ More complex to implement
- ❌ No HTTP caching

**This program uses BOTH**:
- REST API for everything except gameplay
- WebSocket ONLY for real-time Pong game synchronization

---

### Q: How do I start the entire system?

**A:** Use the Makefile:

```bash
# Start everything (builds and runs all services)
make start

# Stop all services
make stop

# Restart services (without rebuild)
make restart

# Rebuild everything from scratch
make rebuild

# Clean up (remove containers, volumes, images)
make clean
```

The system will be accessible at `http://localhost`

**Services Started**:
- nginx (port 80) - Frontend and API gateway
- auth-service (port 3001) - Authentication
- game-service (port 3002) - Game logic
- tournament-service (port 3003) - Tournaments
- user-service (port 3004) - User profiles
- hardhat-node (port 8545) - Blockchain

---

## Development

### Q: How do I verify HTTP-only cookies are working?

**A:** See `documentation/verify_http_only_cookie.md` for detailed instructions.

**Quick verification**:

1. **Browser DevTools**: F12 → Application tab → Cookies
   - Look for `token` cookie
   - Should show `HttpOnly` and `SameSite=Strict` flags

2. **Console Test**: Try `document.cookie` in browser console
   - Should NOT show the token cookie (that's the security feature!)

3. **Network Tab**: Check login response headers
   - Should see `Set-Cookie: token=...; HttpOnly; SameSite=Strict`

4. **Subsequent Requests**: Check request headers
   - Should automatically include `Cookie: token=...`

---

## Troubleshooting

### Q: Left or right paddle not moving in tournament mode?

**A:** This was a recent bug that's been fixed. Ensure both paddles send correct `playerId`:

- Left paddle messages must include `playerId: 1`
- Right paddle messages must include `playerId: 2`

The backend routes these to the correct team:
```typescript
const team = playerId === 1 ? 'team1' : 'team2';
paddle = paddles[team][0];
```

**Fix Location**: `frontend/src/game.ts` in `handleTournamentInputs()` function

---

### Q: Why does this program use port 80 with HTTP instead of port 8080 with HTTPS for better security?

**A:** Great security question! Here's why HTTP on port 80 is used for this **localhost development environment**:

## For Development (Current Setup)

### Why HTTP + Port 80:

1. **Localhost Isolation**:
   - Only accessible from `127.0.0.1` (your own computer)
   - Not exposed to the internet
   - No external attackers can intercept traffic

2. **Development Simplicity**:
   - No SSL certificate management needed
   - Faster iteration and testing
   - Easier debugging (can inspect traffic easily)

3. **Docker Simplicity**:
   - Port 80 is the standard HTTP port (no need to specify `:8080`)
   - Access via `http://localhost` instead of `http://localhost:8080`

4. **Security Already Implemented**:
   - **HTTP-only cookies** (prevents XSS attacks)
   - **SameSite=Strict** (prevents CSRF attacks)
   - **CORS** properly configured
   - Traffic never leaves your machine

### Why Port 8080 Wouldn't Add Security on Localhost:
- Port number doesn't affect encryption
- Port 8080 is just a convention for alternate HTTP servers
- Traffic is still unencrypted on port 8080 without HTTPS
- **HTTPS requires SSL certificates**, not just a different port

---

## For Production (What You MUST Change)

If you deploy this to a **public server**, you **MUST** switch to HTTPS:

### Production Setup Requirements:

#### 1. **Get SSL Certificate**:
```bash
# Using Let's Encrypt (free)
certbot certonly --nginx -d yourdomain.com
```

#### 2. **Update nginx Configuration**:
```nginx
server {
    listen 443 ssl http2;  # HTTPS port
    server_name yourdomain.com;

    # SSL Certificate paths
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Strong SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of your nginx config
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

#### 3. **Update docker-compose.yml**:
```yaml
nginx:
  ports:
    - "80:80"      # HTTP (redirects to HTTPS)
    - "443:443"    # HTTPS
  volumes:
    - ./frontend/nginx/nginx.conf:/etc/nginx/nginx.conf
    - /etc/letsencrypt:/etc/letsencrypt  # SSL certificates
```

#### 4. **Update Cookie Configuration**:
```typescript
// In auth-service
res.cookie('token', token, {
  httpOnly: true,
  sameSite: 'strict',
  secure: true,  // ✅ ADD THIS for production HTTPS
  maxAge: 86400000
});
```

The `secure: true` flag ensures cookies are **only sent over HTTPS**, never HTTP.

#### 5. **Update Frontend URLs**:
```typescript
// Change WebSocket protocol
const ws = new WebSocket('wss://yourdomain.com/api/game/ws');  // wss = secure WebSocket

// Update fetch calls (automatic with https://)
fetch('https://yourdomain.com/api/auth/login', { ... });
```

---

## Security Comparison: Development vs Production

| Aspect | Development (HTTP) | Production (HTTPS) |
|--------|-------------------|-------------------|
| **Port** | 80 | 443 (+ 80 for redirect) |
| **Protocol** | HTTP | HTTPS |
| **Encryption** | None (not needed) | TLS 1.2/1.3 |
| **Access** | localhost only | Public internet |
| **Certificates** | None | SSL/TLS certificates |
| **Cookie `secure`** | false | true |
| **WebSocket** | ws:// | wss:// |
| **Risk** | Very low (isolated) | High without HTTPS |

---

## Why HTTPS is CRITICAL for Production:

1. **Encryption**: Prevents man-in-the-middle attacks
2. **Authentication**: Verifies server identity (prevents impersonation)
3. **Data Integrity**: Prevents data tampering in transit
4. **Browser Requirements**: Modern browsers require HTTPS for:
   - Geolocation
   - Camera/Microphone access
   - Service Workers
   - HTTP/2 protocol
5. **SEO**: Google penalizes HTTP sites
6. **User Trust**: Browsers show "Not Secure" warning for HTTP

---

## Summary

**Development (localhost)**: HTTP on port 80 is fine
- ✅ Isolated environment
- ✅ Faster development
- ✅ No certificate management
- ✅ Already using HTTP-only cookies + SameSite

**Production (public server)**: HTTPS on port 443 is MANDATORY
- ⚠️ HTTP exposes passwords and session tokens
- ⚠️ Vulnerable to packet sniffing
- ⚠️ Browsers will show security warnings
- ⚠️ Violates security best practices

**Port number doesn't provide security** - encryption protocol (HTTPS) does!

---

### Q: What is TypeScript and how/why is it used in this program for both frontend (Vite) and backend services (Node.js + Fastify)?

**A:** TypeScript is JavaScript with **static type checking** - it adds type safety to JavaScript code.

## What is TypeScript?

**TypeScript** = JavaScript + Type System

```typescript
// JavaScript (no types)
function add(a, b) {
  return a + b;
}
add(5, "hello");  // ❌ Bug! Returns "5hello" instead of error

// TypeScript (with types)
function add(a: number, b: number): number {
  return a + b;
}
add(5, "hello");  // ✅ Compiler error: "hello" is not a number
```

### Key Features:

1. **Type Safety**: Catch errors at compile-time, not runtime
2. **IntelliSense**: Better autocomplete and IDE support
3. **Refactoring**: Rename variables/functions safely across codebase
4. **Documentation**: Types serve as inline documentation
5. **Compiles to JavaScript**: TypeScript → JavaScript for browsers/Node.js

---

## TypeScript in This Program

This project uses TypeScript for **ALL code** - both frontend and backend:

```
Frontend (Vite):         TypeScript → JavaScript (bundled)
Backend Services:        TypeScript → JavaScript (Node.js)
```

---

## Frontend: TypeScript + Vite

### Stack:
- **TypeScript**: Type-safe source code
- **Vite**: Modern build tool and dev server
- **Browser**: Runs compiled JavaScript

### File Structure:
```
frontend/
├── src/
│   ├── game.ts          ← TypeScript source
│   ├── auth.ts
│   ├── tournament.ts
│   └── types.ts         ← Type definitions
├── tsconfig.json        ← TypeScript configuration
├── vite.config.js       ← Vite build configuration
└── package.json
```

### TypeScript Configuration (`frontend/tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2020",           // Compile to ES2020 JavaScript
    "module": "ES2020",            // Use ES modules (import/export)
    "moduleResolution": "node",
    "outDir": "./dist",            // Output compiled JS here
    "rootDir": "./src",            // Source TypeScript files
    "strict": true,                // Enable all strict type checks
    "lib": ["ES2020", "DOM"],      // Browser APIs available
    "types": ["node"]
  }
}
```

### Example: Type-Safe Frontend Code

#### Type Definitions (`frontend/src/game.ts`):
```typescript
interface User {
  userId: number;
  username: string;
  email?: string;  // Optional property
}

interface GameState {
  leftPaddle: { y: number; speed: number };
  rightPaddle: { y: number; speed: number };
  ball: { x: number; y: number; vx: number; vy: number };
  leftScore: number;
  rightScore: number;
  status: string;
  gameWidth: number;
  gameHeight: number;
}

interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  ballRadius: number;
  paddleSpeed: number;
}
```

#### Type-Safe Functions:
```typescript
// TypeScript catches type errors at compile time
function handleGameState(state: GameState): void {
  canvas.width = state.gameWidth;    // ✅ OK
  canvas.height = state.gameHeight;  // ✅ OK
  
  // state.invalidProp  // ❌ Compile error: Property doesn't exist
}

// WebSocket message with type checking
function sendPaddleMove(direction: 'up' | 'down'): void {
  ws.send(JSON.stringify({
    type: 'movePaddle',
    direction: direction  // ✅ Only 'up' or 'down' allowed
  }));
  
  // sendPaddleMove('left');  // ❌ Compile error: 'left' not valid
}

// API call with typed response
async function login(username: string, password: string): Promise<User> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  
  const data: User = await response.json();
  return data;  // ✅ TypeScript knows this is a User
}
```

### How Vite Processes TypeScript:

```
1. Development (npm run dev):
   ┌──────────────┐
   │ game.ts      │ ← TypeScript source
   └──────┬───────┘
          │ Vite compiles on-the-fly
          ↓
   ┌──────────────┐
   │ game.js      │ ← JavaScript (in memory)
   └──────┬───────┘
          │ Hot reload
          ↓
   ┌──────────────┐
   │ Browser      │
   └──────────────┘

2. Production Build (npm run build):
   ┌──────────────┐
   │ src/*.ts     │ ← All TypeScript files
   └──────┬───────┘
          │ TypeScript compiler (tsc)
          ↓
   ┌──────────────┐
   │ JavaScript   │
   └──────┬───────┘
          │ Vite bundles, minifies, optimizes
          ↓
   ┌──────────────┐
   │ dist/        │ ← Optimized JavaScript bundles
   │ ├── index.js │   (served by nginx)
   │ └── style.css│
   └──────────────┘
```

### Why TypeScript + Vite for Frontend?

1. **Type Safety**: Catch bugs before deployment
   ```typescript
   // ❌ Would crash at runtime in JavaScript
   const score: number = "10";  // ✅ TypeScript error at compile time
   ```

2. **Better Refactoring**: Rename `GameState` → IDE updates all usages
3. **Autocomplete**: IDE suggests `state.leftScore` after typing `state.`
4. **Team Collaboration**: Types document what data structures look like
5. **Fast Builds**: Vite uses esbuild (written in Go) for blazing fast compilation
6. **Hot Module Replacement**: Changes appear instantly during development

---

## Backend: TypeScript + Node.js + Fastify

### Stack (All 4 Services):
- **TypeScript**: Type-safe source code
- **Node.js**: JavaScript runtime
- **Fastify**: Fast web framework
- **ts-node-dev**: Development server with auto-reload

### File Structure (Example: auth-service):
```
auth-service/
├── src/
│   ├── server.ts           ← TypeScript source
│   ├── routes/
│   │   └── auth.ts
│   ├── services/
│   │   └── authService.ts
│   ├── types/
│   │   └── index.ts        ← Type definitions
│   └── utils/
│       ├── config.ts
│       └── database.ts
├── dist/                   ← Compiled JavaScript (generated)
│   └── server.js
├── tsconfig.json           ← TypeScript configuration
└── package.json
```

### TypeScript Configuration (`auth-service/tsconfig.json`):
```json
{
  "compilerOptions": {
    "target": "ES2020",           // Compile to ES2020
    "module": "commonjs",          // Use CommonJS (Node.js modules)
    "outDir": "./dist",            // Output compiled JS
    "rootDir": "./src",            // Source TS files
    "strict": true,                // Strict type checking
    "esModuleInterop": true,
    "declaration": true,           // Generate .d.ts files
    "sourceMap": true              // Generate source maps for debugging
  }
}
```

### Example: Type-Safe Backend Code

#### Type Definitions (`auth-service/src/types/index.ts`):
```typescript
export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
}
```

#### Type-Safe Server (`auth-service/src/server.ts`):
```typescript
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';

const fastify: FastifyInstance = Fastify({
  logger: true
});

// TypeScript knows fastify's methods and types
await fastify.register(cors, {
  origin: 'http://localhost',
  credentials: true
});

await fastify.register(cookie);
```

#### Type-Safe Routes (`auth-service/src/routes/auth.ts`):
```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RegisterRequest, LoginRequest, User } from '../types';

export default async function authRoutes(fastify: FastifyInstance) {
  
  // Register endpoint with typed request body
  fastify.post<{ Body: RegisterRequest }>(
    '/register',
    async (request: FastifyRequest<{ Body: RegisterRequest }>, reply: FastifyReply) => {
      const { username, email, password } = request.body;
      
      // TypeScript ensures these properties exist
      // username is string (not number or undefined)
      
      // ... registration logic
      
      return reply.status(201).send({
        success: true,
        userId: newUser.id
      });
    }
  );
  
  // Login endpoint with typed request body
  fastify.post<{ Body: LoginRequest }>(
    '/login',
    async (request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) => {
      const { username, password } = request.body;
      
      // ... authentication logic
      
      // Type-safe cookie setting
      reply.setCookie('token', token, {
        httpOnly: true,       // ✅ TypeScript knows this is boolean
        sameSite: 'strict',   // ✅ Only allows 'strict' | 'lax' | 'none'
        maxAge: 86400000      // ✅ TypeScript knows this is number
      });
      
      return { success: true, user: userData };
    }
  );
}
```

#### Type-Safe Database Queries (`auth-service/src/services/authService.ts`):
```typescript
import { User } from '../types';

export class AuthService {
  
  // Return type is Promise<User | null>
  async getUserByUsername(username: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, row: User) => {  // ✅ row is typed as User
          if (err) reject(err);
          resolve(row || null);
        }
      );
    });
  }
  
  // TypeScript ensures we pass correct parameter types
  async createUser(username: string, email: string, passwordHash: string): Promise<number> {
    // ... insert logic
    return userId;  // ✅ Must return number
  }
}
```

### Build Process (Development vs Production):

#### Development (`npm run dev`):
```bash
# package.json script
"dev": "ts-node-dev --respawn --transpile-only src/server.ts"
```

```
┌──────────────┐
│ src/         │ ← TypeScript source files
│ server.ts    │
└──────┬───────┘
       │ ts-node-dev compiles & runs
       ↓
┌──────────────┐
│ Node.js      │ ← Runs JavaScript in memory
└──────┬───────┘
       │ Auto-restart on file changes
       ↓
┌──────────────┐
│ Fastify      │ ← Server listening on port 3000
│ :3000        │
└──────────────┘
```

#### Production (`npm run build` → `npm start`):
```bash
# package.json scripts
"build": "tsc"
"start": "node dist/server.js"
```

```
1. Compile TypeScript:
   ┌──────────────┐
   │ src/*.ts     │ ← TypeScript source
   └──────┬───────┘
          │ tsc (TypeScript compiler)
          ↓
   ┌──────────────┐
   │ dist/*.js    │ ← Compiled JavaScript
   │ dist/*.d.ts  │ ← Type definition files
   │ dist/*.js.map│ ← Source maps
   └──────────────┘

2. Run Compiled JavaScript:
   ┌──────────────┐
   │ node         │
   │ dist/server.js│
   └──────┬───────┘
          │
          ↓
   ┌──────────────┐
   │ Fastify      │
   │ :3000        │
   └──────────────┘
```

### Why TypeScript + Node.js + Fastify for Backend?

1. **Type Safety**: Catch errors before deployment
   ```typescript
   // ❌ Would cause runtime error in JavaScript
   fastify.register(cors, {
     origin: 123  // ✅ TypeScript error: should be string or array
   });
   ```

2. **API Contract Enforcement**:
   ```typescript
   // Request body MUST have username and password
   interface LoginRequest {
     username: string;
     password: string;
   }
   // Missing properties = compile error
   ```

3. **Database Type Safety**:
   ```typescript
   const user: User = await getUserById(123);
   console.log(user.username);  // ✅ OK
   console.log(user.invalidProp);  // ❌ Compile error
   ```

4. **Refactoring**: Rename `User.id` → `User.userId` updates everywhere
5. **Team Collaboration**: Types document API contracts
6. **IDE Support**: Autocomplete for Fastify methods, request/reply objects
7. **Fewer Runtime Errors**: Most bugs caught at compile time

---

## Comparison: JavaScript vs TypeScript in This Program

### Without TypeScript (JavaScript):
```javascript
// ❌ No type checking - bugs at runtime
function handleGameState(state) {
  canvas.width = state.gameWidth;     // What if undefined?
  canvas.height = state.gameHieght;   // Typo! No error until runtime
}

// ❌ No autocomplete - have to remember exact property names
const user = await getUser(123);
console.log(user.usrname);  // Typo! Returns undefined silently

// ❌ Unclear API contracts
fastify.post('/login', async (request, reply) => {
  const { username, password } = request.body;
  // What properties does request.body have? Unknown!
});
```

### With TypeScript:
```typescript
// ✅ Type checking - bugs at compile time
function handleGameState(state: GameState): void {
  canvas.width = state.gameWidth;     // ✅ OK
  canvas.height = state.gameHieght;   // ❌ Compile error: typo detected
}

// ✅ Autocomplete - IDE suggests properties
const user: User = await getUser(123);
console.log(user.usrname);  // ❌ Compile error: should be 'username'

// ✅ Clear API contracts
fastify.post<{ Body: LoginRequest }>(
  '/login',
  async (request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) => {
    const { username, password } = request.body;
    // TypeScript knows exactly what properties exist
  }
);
```

---

## Complete Data Flow with TypeScript:

```
1. Frontend sends login request:
   ┌─────────────────────────────┐
   │ frontend/src/auth.ts        │
   │                             │
   │ interface LoginRequest {    │ ← Type definition
   │   username: string;         │
   │   password: string;         │
   │ }                           │
   │                             │
   │ fetch('/api/auth/login', {  │
   │   body: JSON.stringify({    │
   │     username: "player1",    │ ✅ Matches type
   │     password: "pass123"     │
   │   })                        │
   │ })                          │
   └──────────┬──────────────────┘
              │ Compiled to JavaScript by Vite
              ↓
   ┌──────────────────────────────┐
   │ nginx → auth-service:3000    │
   └──────────┬───────────────────┘
              ↓
2. Backend receives typed request:
   ┌─────────────────────────────┐
   │ auth-service/src/routes/    │
   │ auth.ts                     │
   │                             │
   │ interface LoginRequest {    │ ← Same type definition
   │   username: string;         │
   │   password: string;         │
   │ }                           │
   │                             │
   │ fastify.post<{              │
   │   Body: LoginRequest        │ ✅ Type-safe
   │ }>(                         │
   │   '/login',                 │
   │   async (req, reply) => {   │
   │     const { username,       │
   │             password } =     │
   │       req.body;             │ ✅ TypeScript validates
   │   }                         │
   │ )                           │
   └──────────┬──────────────────┘
              │ Compiled to JavaScript by tsc
              ↓
   ┌─────────────────────────────┐
   │ Node.js runs dist/server.js │
   └─────────────────────────────┘
```

---

## TypeScript Tools in This Project:

| Tool | Purpose | Usage |
|------|---------|-------|
| **tsc** | TypeScript Compiler | Compiles `.ts` → `.js` |
| **ts-node-dev** | Development Runner | Runs TypeScript directly (dev mode) |
| **Vite** | Frontend Build Tool | Compiles & bundles frontend TS |
| **@types/node** | Node.js Type Definitions | Types for Node.js APIs |
| **@types/bcrypt** | Bcrypt Type Definitions | Types for bcrypt library |
| **tsconfig.json** | TypeScript Configuration | Compiler options |

---

## Summary

**TypeScript** = JavaScript + Types

**Why Use TypeScript in This Program?**

✅ **Catch bugs early**: Type errors at compile-time, not runtime  
✅ **Better IDE support**: Autocomplete, refactoring, inline documentation  
✅ **Team collaboration**: Types serve as API contracts  
✅ **Fewer runtime errors**: Most bugs caught before deployment  
✅ **Easier maintenance**: Refactoring is safer with type checking  
✅ **Self-documenting**: Types explain what data structures look like  

**Frontend (Vite)**:
- TypeScript source (`src/*.ts`)
- Vite compiles to JavaScript
- Browser runs JavaScript
- Fast development with hot reload

**Backend (Node.js + Fastify)**:
- TypeScript source (`src/*.ts`)
- `tsc` compiles to JavaScript (`dist/*.js`)
- Node.js runs JavaScript
- Type-safe API routes and database queries

**Result**: Fewer bugs, better developer experience, more maintainable code!

---

## Need More Help?

- **Detailed Implementation**: See `RECREATION_PROMPTS.md`
- **Security Recommendations**: See `SECURITY_RECOMMENDATIONS.md`
- **Tournament Testing**: See `TOURNAMENT_TEST_PLAN.md`
- **Bug Reports**: Check `DEBUG_LOG.md` files in service directories
