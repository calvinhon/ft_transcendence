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
