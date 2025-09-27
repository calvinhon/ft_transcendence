@echo off
echo 🐘 Testing PHP Backend
echo ===================

REM Check if PHP is installed
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PHP is not installed
    echo 📥 Please install PHP from https://windows.php.net/download/
    echo 📁 Extract to C:\php and add to PATH
    echo 🔄 Then run this script again
    pause
    exit /b 1
)

echo ✅ PHP is installed
php --version
echo.

REM Navigate to project directory
cd /d "%~dp0"

echo 📁 Setting up PHP backend...
cd php-backend

echo 🗄️  Running database migration...
php database/migrate.php
if %errorlevel% neq 0 (
    echo ❌ Database migration failed
    pause
    exit /b 1
)

echo.
echo 🚀 Starting PHP development server...
echo 📍 Server will be available at: http://localhost:8000
echo 🔗 API endpoints will be at: http://localhost:8000/api/
echo.

REM Start PHP server in background
cd public
start "PHP Backend Server" cmd /c "php -S localhost:8000"

echo ⏱️  Waiting for server to start...
timeout /t 5 >nul

echo.
echo 🧪 Testing API endpoints...

REM Test health endpoint
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ PHP Backend is running
    echo 📊 Health check: http://localhost:8000/health
) else (
    echo ❌ PHP Backend is not responding
)

echo.
echo 📋 Available API endpoints:
echo 🔐 Auth:
echo   POST /auth/register - Register new user
echo   POST /auth/login - User login
echo   GET  /auth/me - Get current user info
echo.
echo 🏆 Tournaments:
echo   GET  /tournament/list - List all tournaments
echo   POST /tournament/create - Create tournament
echo   POST /tournament/join - Join tournament
echo   GET  /tournament/{id} - Get tournament details
echo.
echo 🎮 Games:
echo   GET  /game/list - List games
echo   POST /game/create - Create game
echo   POST /game/join/{id} - Join game
echo.
echo 👤 Users:
echo   GET  /user/profile/{id} - Get user profile
echo   GET  /user/stats/{id} - Get user statistics
echo.

REM Create a simple test HTML file
cd ..
echo Creating API test page...

echo ^<!DOCTYPE html^> > api-test.html
echo ^<html^> >> api-test.html
echo ^<head^> >> api-test.html
echo     ^<title^>PHP Backend API Test^</title^> >> api-test.html
echo     ^<style^> >> api-test.html
echo         body { font-family: Arial, sans-serif; margin: 20px; } >> api-test.html
echo         .endpoint { margin: 10px 0; padding: 10px; border: 1px solid #ddd; } >> api-test.html
echo         .method { font-weight: bold; color: #007acc; } >> api-test.html
echo         button { padding: 5px 10px; margin: 5px; } >> api-test.html
echo         .result { margin-top: 10px; padding: 10px; background: #f5f5f5; } >> api-test.html
echo     ^</style^> >> api-test.html
echo ^</head^> >> api-test.html
echo ^<body^> >> api-test.html
echo     ^<h1^>PHP Backend API Test^</h1^> >> api-test.html
echo     ^<p^>Backend running at: ^<strong^>http://localhost:8000^</strong^>^</p^> >> api-test.html
echo. >> api-test.html
echo     ^<div class="endpoint"^> >> api-test.html
echo         ^<div class="method"^>GET /health^</div^> >> api-test.html
echo         ^<button onclick="testHealth()"^>Test Health^</button^> >> api-test.html
echo         ^<div id="health-result" class="result"^>^</div^> >> api-test.html
echo     ^</div^> >> api-test.html
echo. >> api-test.html
echo     ^<div class="endpoint"^> >> api-test.html
echo         ^<div class="method"^>GET /tournament/list^</div^> >> api-test.html
echo         ^<button onclick="testTournaments()"^>Test Tournaments^</button^> >> api-test.html
echo         ^<div id="tournaments-result" class="result"^>^</div^> >> api-test.html
echo     ^</div^> >> api-test.html
echo. >> api-test.html
echo     ^<script^> >> api-test.html
echo         async function testHealth() { >> api-test.html
echo             try { >> api-test.html
echo                 const response = await fetch('http://localhost:8000/health'); >> api-test.html
echo                 const data = await response.json(); >> api-test.html
echo                 document.getElementById('health-result').innerHTML = '^<pre^>' + JSON.stringify(data, null, 2) + '^</pre^>'; >> api-test.html
echo             } catch (error) { >> api-test.html
echo                 document.getElementById('health-result').innerHTML = 'Error: ' + error.message; >> api-test.html
echo             } >> api-test.html
echo         } >> api-test.html
echo. >> api-test.html
echo         async function testTournaments() { >> api-test.html
echo             try { >> api-test.html
echo                 const response = await fetch('http://localhost:8000/tournament/list'); >> api-test.html
echo                 const data = await response.json(); >> api-test.html
echo                 document.getElementById('tournaments-result').innerHTML = '^<pre^>' + JSON.stringify(data, null, 2) + '^</pre^>'; >> api-test.html
echo             } catch (error) { >> api-test.html
echo                 document.getElementById('tournaments-result').innerHTML = 'Error: ' + error.message; >> api-test.html
echo             } >> api-test.html
echo         } >> api-test.html
echo     ^</script^> >> api-test.html
echo ^</body^> >> api-test.html
echo ^</html^> >> api-test.html

echo.
echo 🌐 Opening API test page...
start "" "api-test.html"

echo.
echo 🌐 Opening frontend test pages...
cd ..\frontend
start "" "tournament-test-fix.html"
timeout /t 2 >nul
start "" "service-status.html"

echo.
echo ✅ PHP Backend testing environment is ready!
echo.
echo 📋 What to test:
echo 1. API test page - Test backend endpoints
echo 2. Tournament test page - Visual improvements  
echo 3. Service status page - Backend connectivity
echo.
echo 🔧 Sample user accounts (from migration):
echo   Username: admin, Password: admin123
echo   Username: player1, Password: player123
echo   Username: testuser, Password: test123
echo.
echo ⚠️  To stop server: Close the PHP Backend Server window
echo.
pause
