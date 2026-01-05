# Security Implementation

## Overview
This document details the security measures implemented in the ft_transcendence project to protect against common web vulnerabilities and attacks.

## Authentication & Session Management

### Session-Based Authentication
- **Mechanism**: HTTP-only cookies with Redis-backed session storage
- **Cookie Configuration**:
  - `httpOnly: true` - Prevents JavaScript access
  - `secure: true` - HTTPS-only transmission
  - `sameSite: 'lax'` - CSRF protection
- **Session Secret**: Managed via HashiCorp Vault
- **No JWT Required**: Session ID in cookie is sufficient for authentication

### Route Protection
- **Middleware**: `requireAuth()` in `/packages/common/src/middleware.ts`
- **Implementation**: Fastify `preHandler` hooks on protected routes
- **Coverage**: All authenticated endpoints across 5 microservices:
  - auth-service: Profile routes
  - game-service: Game history, stats, friends, online users
  - tournament-service: CRUD, participants, matches, user tournaments
  - blockchain-service: Record endpoint
  - user-service: Profile management (hybrid: session OR microservice secret)

## OAuth Security

### Google OAuth Integration
**File**: `/home/honguyen/test1/auth-service/src/routes/handlers/oauth.ts`

**Vulnerability Fixed**: Wildcard postMessage origin
```typescript
// BEFORE (Vulnerable):
window.opener.postMessage({...}, '*')

// AFTER (Secure):
window.opener.postMessage({...}, ${JSON.stringify(frontendOrigin)})
```

**Protection**: Only configured frontend can receive OAuth tokens

## Game Result Validation

### Server-Authoritative Gameplay
**File**: `/home/honguyen/test1/game-service/src/routes/modules/game-logic.ts`

**Architecture**:
- Games ONLY created via authenticated WebSocket connections
- Server maintains 60 FPS authoritative game state
- `activeGames Map` tracks all live game sessions
- Scores calculated server-side in `GameScoring` class
- Results automatically saved via `saveGameResult()` method

### POST /save Endpoint Protection
**File**: `/home/honguyen/test1/game-service/src/routes/index.ts`

**Security Measures**:
1. **Tournament-Only Manual Submission**:
   - Non-tournament games MUST be saved via WebSocket gameplay
   - Manual `/save` requests for non-tournament games are rejected (403)
   
2. **Participant Verification**:
   ```typescript
   if (userId !== player1Id && userId !== player2Id) {
     return sendError(reply, 'You can only save results for games you participated in', 403);
   }
   ```
   - Users can only save results for games they actually played

3. **Idempotency Protection**:
   - Duplicate tournament match submissions return existing record
   - Prevents replay attacks on tournament results

### Why This Works
- **No HTTP Game Creation**: Games cannot be created via HTTP POST requests
- **WebSocket Gatekeeper**: Only authenticated WebSocket connections can create games
- **Server-Side Scoring**: Client never calculates final scores
- **Tournament Exception**: Tournament games are pre-validated by tournament-service

**Attack Scenario Blocked**:
```javascript
// User attempts to forge game result from browser console
fetch('/api/game/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    player1Id: 5,
    player2Id: 10,
    player1Score: 11,  // Fake score
    player2Score: 0,
    winnerId: 5
  })
})
// ❌ REJECTED: "Non-tournament games are saved automatically during gameplay. Manual submission not allowed."
```

## Replay Attack Protection

### Idempotency Implementation
**File**: `/home/honguyen/test1/game-service/src/routes/modules/game-history-service.ts`

**Mechanism**: Check for existing tournament match before insertion
```typescript
if (tournamentMatchId) {
  db.get('SELECT id FROM games WHERE tournament_match_id = ? LIMIT 1', [tournamentMatchId], ...);
  if (existingGame) {
    logger.warn('Duplicate submission detected');
    resolve({ gameId: existingGame.id }); // Return existing game
  }
}
```

**File**: `/home/honguyen/test1/tournament-service/src/services/matchService.ts`

**Behavior**: Return existing match instead of throwing error on duplicate submission
```typescript
// If match already has result, return it instead of rejecting
if (match.status !== 'pending') {
  return match; // Idempotent behavior
}
```

**Protection**: Users cannot replay captured requests to manipulate databases

## CSRF Protection

### Current Implementation
- `sameSite: 'lax'` cookie attribute provides partial CSRF protection
- Blocks cross-site requests from POST, PUT, DELETE methods
- Allows top-level navigation (OAuth redirects still work)

### Additional Protection (Optional Enhancement)
For sensitive operations, CSRF tokens can be added:
```typescript
// Generate token on login
request.session.csrfToken = generateRandomToken();

// Validate on state-changing operations
if (request.body.csrfToken !== request.session.csrfToken) {
  return sendError(reply, 'Invalid CSRF token', 403);
}
```

## Microservice Communication

### Internal Service Authentication
**File**: `/home/honguyen/test1/user-service/src/routes/profile.ts`

**Hybrid Middleware**: `requireAuthOrMicroservice()`
- Accepts user session cookies OR `x-microservice-secret` header
- Allows service-to-service calls while protecting user-facing endpoints
- Microservice secret managed via HashiCorp Vault

## Database Security

### SQL Injection Prevention
- All queries use parameterized statements
- Example from game-history-service:
  ```typescript
  db.run(
    'INSERT INTO games (...) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [player1Id, player2Id, score1, score2, winnerId, gameMode, tournamentId, matchId]
  );
  ```

### Friend Service Protection
**File**: `/home/honguyen/test1/game-service/src/routes/modules/friend-service.ts`

- Uses `INSERT OR IGNORE` to prevent duplicate friend relationships
- Idempotent by design

## Additional Security Layers

### Network Security
- **HTTPS/TLS**: All traffic encrypted in production
- **ModSecurity WAF**: Web Application Firewall protection
- **CORS**: Configured with specific origin validation

### Rate Limiting
- Implemented via Nginx reverse proxy
- Protects against brute force and DoS attacks

### Secrets Management
- **HashiCorp Vault**: Centralized secrets storage
- **Environment Variables**: Never committed to repository
- **Secret Rotation**: Supported via Vault API

## Security Best Practices

### Code Review Checklist
- ✅ All route handlers use `requireAuth` middleware
- ✅ No inline authentication checks (DRY principle)
- ✅ Client-submitted data validated server-side
- ✅ Game results calculated by server, not trusted from client
- ✅ Parameterized SQL queries for all database operations
- ✅ Sensitive cookies marked `httpOnly` and `secure`
- ✅ OAuth origins explicitly specified (no wildcards)
- ✅ Idempotency keys used for critical operations
- ✅ User authorization verified (can only access own data)

### Deployment Security
- Change all default secrets in production
- Enable HTTPS with valid TLS certificates
- Configure WAF rules for application-specific threats
- Implement log monitoring and alerting
- Regular security audits and dependency updates

## Incident Response

If a security vulnerability is discovered:
1. **Assess Impact**: Determine affected users and data
2. **Patch Immediately**: Deploy fix to production
3. **Notify Users**: If data breach occurred
4. **Post-Mortem**: Document incident and prevention measures
5. **Security Update**: Review and enhance security measures

## Contact
For security concerns, contact the development team immediately.
