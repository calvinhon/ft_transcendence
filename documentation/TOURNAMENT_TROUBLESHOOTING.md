# Tournament Feature Troubleshooting Guide

## Quick Fix Summary

The tournament feature wasn't working because the `TournamentManager` wasn't being initialized when users logged in. This has been fixed by adding the manager initialization in the `showGameScreen()` method.

## What Was Fixed

1. **Manager Initialization**: Added tournament, profile, and leaderboard manager initialization in `frontend/js/app.js`
2. **DOM Ready Check**: Enhanced tournament.js with proper DOM ready checks and debugging
3. **Startup Scripts**: Created `start-services.bat` and `start-services.sh` for easy service startup

## Testing the Tournament Feature

### 1. Start Services
Run one of these commands from the project root:

**Windows:**
```cmd
start-services.bat
```

**Linux/Mac:**
```bash
./start-services.sh
```

### 2. Test Tournament Functionality

1. Open http://localhost:8080 in your browser
2. Register or login with any username
3. Click on the "Tournaments" tab
4. You should see:
   - "Create Tournament" button
   - Two tabs: "All Tournaments" and "My Tournaments"
   - Working tournament creation modal

### 3. Check Browser Console

Open browser developer tools (F12) and check the Console tab for these messages:
- "TournamentManager constructor called"
- "Setting up tournament event listeners"
- "Create tournament button found: true"

## Common Issues and Solutions

### Issue 1: "Cannot read property of undefined" errors
**Cause**: Services not running or manager not initialized
**Solution**: 
1. Ensure all services are running with `docker compose ps`
2. Check that TournamentManager is initialized in app.js

### Issue 2: Tournament button doesn't work
**Cause**: Event listeners not attached
**Solution**: 
1. Check browser console for initialization messages
2. Verify DOM elements exist when manager initializes

### Issue 3: API calls fail
**Cause**: Tournament service not responding
**Solution**:
1. Check service status: `docker compose ps`
2. Check logs: `docker compose logs tournament-service`
3. Test endpoint: `curl http://localhost:3003/api/tournament/list`

### Issue 4: Authentication errors
**Cause**: Invalid or expired JWT tokens
**Solution**:
1. Clear localStorage and login again
2. Check token expiry (now set to 24 hours)

## Debugging Tools

### Test Page
Use `frontend/tournament-test.html` to test tournament functionality in isolation:
1. Open the file directly in browser
2. Check test results for component functionality

### Service Logs
```bash
# View all service logs
docker compose logs -f

# View specific service logs
docker compose logs -f tournament-service
docker compose logs -f auth-service
```

### API Testing
```bash
# Test tournament service
curl http://localhost:3003/api/tournament/list

# Test with authentication (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" http://localhost:3003/api/tournament/list
```

## File Changes Made

1. `frontend/js/app.js`: Added manager initialization in `showGameScreen()`
2. `frontend/js/tournament.js`: Added debugging and DOM ready checks
3. `start-services.bat` / `start-services.sh`: Service startup scripts
4. `frontend/tournament-test.html`: Isolated testing page

## Verification Steps

After starting services, verify:

1. ✅ All containers running: `docker compose ps`
2. ✅ Frontend accessible: http://localhost:8080
3. ✅ Tournament service responding: http://localhost:3003/api/tournament/list
4. ✅ Can login/register successfully
5. ✅ Tournament tab visible and clickable
6. ✅ Create tournament button works
7. ✅ Tournament modal opens/closes
8. ✅ Browser console shows manager initialization logs

## Architecture Overview

The tournament system consists of:

- **Frontend**: TournamentManager class handles UI and API calls
- **Backend**: tournament-service (Node.js/Fastify) with SQLite database
- **API**: RESTful endpoints for CRUD operations
- **Database**: SQLite with tournaments and participants tables
- **Authentication**: JWT tokens for API access
- **Routing**: Nginx proxy routes `/api/tournament/*` to service

The system is now fully functional with proper initialization and error handling.