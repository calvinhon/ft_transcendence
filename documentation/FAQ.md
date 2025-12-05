# FT_TRANSCENDENCE - Frequently Asked Questions (FAQ)

**Last Updated**: December 5, 2025

This document contains common questions and answers about the ft_transcendence project.

---

## General Concepts

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

## Need More Help?

- **Detailed Implementation**: See `RECREATION_PROMPTS.md`
- **Security Recommendations**: See `SECURITY_RECOMMENDATIONS.md`
- **Tournament Testing**: See `TOURNAMENT_TEST_PLAN.md`
- **Bug Reports**: Check `DEBUG_LOG.md` files in service directories
