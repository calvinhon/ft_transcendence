# ft_transcendence Setup Guide

## Current Status

✅ **Completed:**
- Tournament join functionality fixes applied
- Enhanced error handling and debugging
- SSH key generated for GitHub authentication
- Complete PHP backend alternative created
- Database structure and migration scripts ready

⚠️ **Pending:**
- Add SSH key to GitHub account
- Install runtime dependencies (Node.js or PHP)
- Test tournament functionality
- Deploy backend services

## Next Steps

### 1. Add SSH Key to GitHub

Your SSH key has been generated. Add this public key to your GitHub account:

```

```

**Steps:**
1. Go to GitHub.com → Settings → SSH and GPG keys
2. Click "New SSH key" 
3. Title: "WSL Development Key"
4. Paste the public key above
5. Click "Add SSH key"

### 2. Install Dependencies (Choose One)

#### Option A: Install Node.js (for original microservices)
1. Download Node.js from https://nodejs.org/
2. Install with default settings
3. Restart PowerShell
4. Run: `node --version` to verify

#### Option B: Install PHP (for new PHP backend)
1. Download PHP from https://windows.php.net/download/
2. Extract to C:\php
3. Add C:\php to Windows PATH
4. Restart PowerShell
5. Run: `php --version` to verify

### 3. Test Tournament Functionality

#### With Node.js Services:
```powershell
# Install dependencies
cd d:\Hoach\ft_transcendence\tournament-service
npm install

cd ..\auth-service
npm install

cd ..\user-service
npm install

cd ..\game-service
npm install

# Start services (in separate terminals)
cd d:\Hoach\ft_transcendence\tournament-service
npm start

cd d:\Hoach\ft_transcendence\auth-service
npm start

# etc.
```

#### With PHP Backend:
```powershell
cd d:\Hoach\ft_transcendence\php-backend

# Run database migration
php database/migrate.php

# Start PHP development server
cd public
php -S localhost:8000
```

### 4. Test Tournament Join

Open one of these test pages in your browser:
- `file:///d:/Hoach/ft_transcendence/frontend/tournament-test-fix.html` - Visual tournament display
- `file:///d:/Hoach/ft_transcendence/frontend/service-status.html` - Service availability checker
- `file:///d:/Hoach/ft_transcendence/frontend/tournament-join-test.html` - Tournament join testing

### 5. Verify Fixes

The following issues have been resolved:
- ✅ HTML ID mismatch: `tournament-section` → `tournaments-section`
- ✅ Enhanced error handling with service detection
- ✅ Better user feedback for 404/network errors
- ✅ Tournament styling and status indicators
- ✅ Comprehensive debugging tools

## Files Modified

### Frontend Fixes:
- `frontend/index.html` - Fixed section ID
- `frontend/js/tournament.js` - Enhanced error handling
- `frontend/css/style.css` - Added tournament styling

### Test Files Created:
- `frontend/tournament-test-fix.html` - Visual test page
- `frontend/service-status.html` - Service availability checker
- `frontend/tournament-join-test.html` - Join functionality test

### PHP Backend Created:
- Complete alternative backend in `php-backend/`
- RESTful API with JWT authentication
- Database layer with SQLite fallback
- Tournament, game, and user management

## Troubleshooting

### Common Issues:

1. **"Cannot connect to services"**
   - Check if backend services are running
   - Use service-status.html to verify availability

2. **"Tournament join failed"**
   - Ensure authentication is working
   - Check browser console for detailed errors

3. **404 errors**
   - Verify service URLs in tournament.js
   - Check if API endpoints are accessible

### Debug Commands:

```javascript
// In browser console
window.debugTournamentElements(); // Check DOM elements
window.testTournamentsClick(); // Test navigation
window.testShowTournaments(); // Test section display
```

## Architecture Options

### Option 1: Node.js Microservices (Original)
- Requires Node.js installation
- Uses Docker for production
- Multiple services: auth, tournament, game, user

### Option 2: PHP Backend (New Alternative)
- Single PHP application
- No Docker required for development
- Built-in web server for testing
- Complete API compatibility

Choose the option that best fits your development environment and preferences.
