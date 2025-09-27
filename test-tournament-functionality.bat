@echo off
echo 🧪 Testing Tournament Functionality
echo =================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    echo 📥 Please install Node.js from https://nodejs.org/
    echo 🔄 Then run this script again
    pause
    exit /b 1
)

echo ✅ Node.js is installed
echo.

REM Navigate to project directory
cd /d "%~dp0"

echo 📁 Installing dependencies for tournament service...
cd tournament-service
call npm install --silent
if %errorlevel% neq 0 (
    echo ❌ Failed to install tournament service dependencies
    pause
    exit /b 1
)

echo 📁 Installing dependencies for auth service...
cd ..\auth-service
call npm install --silent
if %errorlevel% neq 0 (
    echo ❌ Failed to install auth service dependencies
    pause
    exit /b 1
)

echo 📁 Installing dependencies for user service...
cd ..\user-service
call npm install --silent
if %errorlevel% neq 0 (
    echo ❌ Failed to install user service dependencies
    pause
    exit /b 1
)

echo 📁 Installing dependencies for game service...
cd ..\game-service
call npm install --silent
if %errorlevel% neq 0 (
    echo ❌ Failed to install game service dependencies
    pause
    exit /b 1
)

cd ..

echo.
echo ✅ All dependencies installed successfully!
echo.
echo 🚀 Starting services...
echo 📋 This will open multiple terminal windows
echo.

REM Start each service in a new window
echo 🔐 Starting Auth Service (Port 3001)...
start "Auth Service" cmd /c "cd auth-service && npm start"
timeout /t 2 >nul

echo 👤 Starting User Service (Port 3002)...
start "User Service" cmd /c "cd user-service && npm start"
timeout /t 2 >nul

echo 🎮 Starting Game Service (Port 3003)...
start "Game Service" cmd /c "cd game-service && npm start"
timeout /t 2 >nul

echo 🏆 Starting Tournament Service (Port 3004)...
start "Tournament Service" cmd /c "cd tournament-service && npm start"
timeout /t 2 >nul

echo.
echo ⏱️  Waiting for services to start up...
timeout /t 10 >nul

echo.
echo 🧪 Testing service availability...

REM Test each service
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Auth Service is running
) else (
    echo ❌ Auth Service is not responding
)

curl -s http://localhost:3002/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ User Service is running
) else (
    echo ❌ User Service is not responding
)

curl -s http://localhost:3003/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Game Service is running
) else (
    echo ❌ Game Service is not responding
)

curl -s http://localhost:3004/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Tournament Service is running
) else (
    echo ❌ Tournament Service is not responding
)

echo.
echo 🌐 Opening test pages...

REM Open test pages in default browser
start "" "frontend\tournament-test-fix.html"
timeout /t 2 >nul
start "" "frontend\service-status.html"
timeout /t 2 >nul

echo.
echo 📋 Test Instructions:
echo 1. Check the service status page for green checkmarks
echo 2. Try the tournament test page to see visual improvements
echo 3. Test tournament join functionality
echo.
echo 🔧 Debug commands (use in browser console):
echo   window.debugTournamentElements() - Check DOM elements
echo   window.testTournamentsClick() - Test tournament navigation
echo   window.testShowTournaments() - Test section display
echo.
echo ✅ Tournament testing environment is ready!
echo.
echo ⚠️  To stop services: Close the terminal windows that opened
echo.
pause
