@echo off
echo 🚀 Starting Transcendence services...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Navigate to project directory
cd /d "%~dp0"

echo 📁 Current directory: %cd%

REM Check if docker-compose.yml exists
if not exist "docker-compose.yml" (
    echo ❌ docker-compose.yml not found in current directory
    pause
    exit /b 1
)

echo 🔧 Building and starting services...

REM Build and start services
docker compose up -d --build

echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check service status
echo 📊 Service status:
docker compose ps

echo.
echo 🌐 Services should be available at:
echo    Frontend: http://localhost:8080
echo    Auth Service: http://localhost:3001
echo    Game Service: http://localhost:3002
echo    Tournament Service: http://localhost:3003
echo    User Service: http://localhost:3004

echo.
echo 🔍 Testing tournament service...
curl -s http://localhost:3003/api/tournament/list >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Tournament service is responding
) else (
    echo ❌ Tournament service is not responding
)

echo.
echo 🎯 To test the tournament feature:
echo 1. Open http://localhost:8080 in your browser
echo 2. Register/login with any username
echo 3. Click on 'Tournaments' tab
echo 4. Try creating a tournament

echo.
echo 📝 To view logs: docker compose logs -f
echo 🛑 To stop services: docker compose down
echo.
echo Press any key to continue...
pause >nul