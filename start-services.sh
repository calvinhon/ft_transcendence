#!/bin/bash

echo "🚀 Starting Transcendence services..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Navigate to project directory
cd "$(dirname "$0")"

echo "📁 Current directory: $(pwd)"

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found in current directory"
    exit 1
fi

echo "🔧 Building and starting services..."

# Build and start services
docker compose up -d --build

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Service status:"
docker compose ps

echo ""
echo "🌐 Services should be available at:"
echo "   Frontend: http://localhost:8080"
echo "   Auth Service: http://localhost:3001"
echo "   Game Service: http://localhost:3002"
echo "   Tournament Service: http://localhost:3003"
echo "   User Service: http://localhost:3004"

echo ""
echo "🔍 Testing tournament service..."
curl -s http://localhost:3003/api/tournament/list > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Tournament service is responding"
else
    echo "❌ Tournament service is not responding"
fi

echo ""
echo "🎯 To test the tournament feature:"
echo "1. Open http://localhost:8080 in your browser"
echo "2. Register/login with any username"
echo "3. Click on 'Tournaments' tab"
echo "4. Try creating a tournament"

echo ""
echo "📝 To view logs: docker compose logs -f"
echo "🛑 To stop services: docker compose down"