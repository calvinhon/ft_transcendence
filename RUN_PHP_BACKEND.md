# 🐘 Running ft_transcendence with PHP Backend

## Step 1: Install PHP on Windows

### Option A: Using Chocolatey (Recommended - Easiest)
```powershell
# Install Chocolatey if you don't have it
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# Install PHP
choco install php

# Verify installation
php --version
```

### Option B: Manual Installation
1. Go to https://windows.php.net/download/
2. Download **Thread Safe** x64 version (latest 8.x)
3. Extract to `C:\php`
4. Add `C:\php` to Windows PATH:
   - Press Win + X → System → Advanced system settings
   - Environment Variables → System Variables → PATH → Edit → New
   - Add `C:\php`
   - Click OK, restart PowerShell
5. Test: `php --version`

### Option C: Using XAMPP (Alternative)
1. Download XAMPP from https://www.apachefriends.org/
2. Install with default settings
3. Add `C:\xampp\php` to PATH
4. Test: `php --version`

## Step 2: Run the PHP Backend

Once PHP is installed, run these commands:

```powershell
# Navigate to project directory
cd d:\Hoach\ft_transcendence

# Run the automated setup script
.\test-php-backend.bat
```

## Step 3: Manual Setup (Alternative)

If the batch script doesn't work, run these commands manually:

```powershell
# Navigate to PHP backend
cd d:\Hoach\ft_transcendence\php-backend

# Initialize database with sample data
php database/migrate.php

# Start the PHP development server
cd public
php -S localhost:8000
```

## Step 4: Test the Backend

Open these URLs in your browser:

- **Health Check**: http://localhost:8000/health
- **Tournaments List**: http://localhost:8000/tournament/list
- **API Test Page**: Open `php-backend/api-test.html`

## Step 5: Connect Frontend to PHP Backend

The frontend is already configured to work with the PHP backend. Open:

- **Main App**: `frontend/index.html` 
- **Tournament Test**: `frontend/tournament-test-fix.html`
- **Service Status**: `frontend/service-status.html`

## Expected Output

When working correctly, you should see:

### 1. PHP Development Server
```
PHP 8.x.x Development Server (http://localhost:8000) started
```

### 2. Database Migration Success
```
🚀 Starting database migration...
✅ Created user: admin (ID: 1)
✅ Created user: player1 (ID: 2)
✅ Created tournament: Weekly Championship (ID: 1)
🎉 Database migration completed successfully!
```

### 3. API Responses
```json
{
  "status": "success",
  "message": "Service is healthy",
  "data": {
    "status": "OK",
    "timestamp": 1727456789
  }
}
```

## Sample User Accounts

The migration creates these test accounts:

- **Username**: `admin` / **Password**: `admin123`
- **Username**: `player1` / **Password**: `player123`  
- **Username**: `player2` / **Password**: `player123`
- **Username**: `testuser` / **Password**: `test123`

## API Endpoints Available

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info

### Tournaments
- `GET /tournament/list` - List all tournaments
- `POST /tournament/create` - Create tournament
- `POST /tournament/join` - Join tournament
- `GET /tournament/{id}` - Get tournament details
- `POST /tournament/{id}/start` - Start tournament

### Games
- `GET /game/list` - List games
- `POST /game/create` - Create new game
- `POST /game/join/{id}` - Join existing game
- `PUT /game/{id}/score` - Update game score

### Users
- `GET /user/profile/{id}` - Get user profile
- `GET /user/stats/{id}` - Get user statistics
- `PUT /user/profile/{id}` - Update user profile

## Troubleshooting

### Common Issues:

1. **"php is not recognized"**
   - PHP not installed or not in PATH
   - Restart PowerShell after installation

2. **Database errors**
   - Check file permissions in `php-backend/database/`
   - SQLite will be created automatically if MySQL unavailable

3. **CORS errors in browser**
   - The backend includes CORS headers
   - Make sure you're accessing via `localhost:8000`

4. **Port 8000 already in use**
   - Change port: `php -S localhost:8080`
   - Update frontend API URLs accordingly

### Debug Commands:

```powershell
# Check PHP installation
php --version
php -m  # Show loaded modules

# Test specific endpoints
curl http://localhost:8000/health
curl http://localhost:8000/tournament/list

# Check if port is free
netstat -an | findstr "8000"
```

## Advantages of PHP Backend

✅ **No Docker Required** - Runs directly on Windows
✅ **Single Process** - Simpler than microservices
✅ **Built-in Web Server** - No additional setup needed
✅ **SQLite Fallback** - Works without MySQL
✅ **Complete API** - All endpoints implemented
✅ **Sample Data** - Ready-to-test tournaments and users

## Next Steps

After the backend is running:

1. **Test Tournament Functionality** - Use the test pages
2. **Register New Users** - Try the registration API
3. **Create Tournaments** - Test tournament creation/joining
4. **Play Games** - Test game creation and score updates

The PHP backend provides a complete alternative to the Node.js microservices with all the same functionality!
