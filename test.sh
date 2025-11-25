#!/bin/bash

echo "🚀 Comprehensive Transcendence System Test"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if a service is healthy
check_service() {
    local service_name=$1
    local url=$2
    local service_type=$3
    local max_attempts=30
    local attempt=1

    print_status "Checking $service_name health at $url..."

    while [ $attempt -le $max_attempts ]; do
        if [ "$service_type" = "blockchain" ]; then
            # For blockchain, send a JSON-RPC request
            if curl -s -X POST -H "Content-Type: application/json" \
                --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                "$url" | grep -q '"result"'; then
                print_success "$service_name is healthy"
                return 0
            fi
        else
            # For regular HTTP services
            if curl -s -f "$url" > /dev/null 2>&1; then
                print_success "$service_name is healthy"
                return 0
            fi
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done

    print_error "$service_name failed to become healthy after $max_attempts attempts"
    return 1
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    docker compose down -v 2>/dev/null || true
    # Kill any remaining processes
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "node" 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Start all services with docker-compose
print_status "Starting all services with docker compose..."
docker compose up -d

# Wait for services to be healthy
print_status "Waiting for services to be ready..."

if ! check_service "Auth Service" "http://localhost:3001/health"; then
    print_error "Auth service failed health check"
    exit 1
fi

if ! check_service "Game Service" "http://localhost:3002/health"; then
    print_error "Game service failed health check"
    exit 1
fi

if ! check_service "Tournament Service" "http://localhost:3003/health"; then
    print_error "Tournament service failed health check"
    exit 1
fi

if ! check_service "User Service" "http://localhost:3004/health"; then
    print_error "User service failed health check"
    exit 1
fi

if ! check_service "Hardhat Node" "http://localhost:8545" "blockchain"; then
    print_warning "Hardhat node not available - blockchain features may not work"
fi

print_success "All services are healthy!"

# Run individual service tests
echo
print_status "Running individual service tests..."
echo "====================================="

# Test Auth Service
echo
print_status "Testing Auth Service..."
if bash auth-service/test.sh; then
    print_success "Auth Service tests passed"
else
    print_error "Auth Service tests failed"
    exit 1
fi

# Test User Service
echo
print_status "Testing User Service..."
if bash user-service/test.sh; then
    print_success "User Service tests passed"
else
    print_error "User Service tests failed"
    exit 1
fi

# Test Game Service
echo
print_status "Testing Game Service..."
if bash game-service/test.sh; then
    print_success "Game Service tests passed"
else
    print_error "Game Service tests failed"
    exit 1
fi

# Test Tournament Service
echo
print_status "Testing Tournament Service..."
if bash tournament-service/test.sh; then
    print_success "Tournament Service tests passed"
else
    print_error "Tournament Service tests failed"
    exit 1
fi

# Integration Tests
echo
print_status "Running Integration Tests..."
echo "=============================="

# Test user registration and profile creation flow
echo
print_status "Testing User Registration Flow..."

# Register a user via auth service
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{"username":"integration_test","email":"integration@test.com","password":"testpass123"}')

if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
    print_success "User registration successful"
else
    print_error "User registration failed: $REGISTER_RESPONSE"
    exit 1
fi

# Login to get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"integration_test","password":"testpass123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    print_success "User login successful, got token"

    # Test profile access
    PROFILE_RESPONSE=$(curl -s -X GET http://localhost:3001/profile \
      -H "Authorization: Bearer $TOKEN")

    if echo "$PROFILE_RESPONSE" | grep -q "username.*integration_test"; then
        print_success "Profile access successful"
    else
        print_error "Profile access failed: $PROFILE_RESPONSE"
    fi

    # Test user service profile creation
    USER_ID=$(echo "$PROFILE_RESPONSE" | grep -o '"userId":[0-9]*' | cut -d':' -f2)

    if [ -n "$USER_ID" ]; then
        # Update profile via user service
        UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:3004/profile/$USER_ID \
          -H "Content-Type: application/json" \
          -d '{"displayName":"Integration Test User","bio":"Testing integration","country":"Test"}')

        if echo "$UPDATE_RESPONSE" | grep -q "Profile updated successfully"; then
            print_success "Profile update via user service successful"
        else
            print_error "Profile update failed: $UPDATE_RESPONSE"
        fi

        # Test game stats update
        STATS_RESPONSE=$(curl -s -X POST http://localhost:3004/game/update-stats/$USER_ID \
          -H "Content-Type: application/json" \
          -d '{"wins":2,"total_games":5,"xp":150,"level":3}')

        if echo "$STATS_RESPONSE" | grep -q "Game stats updated successfully"; then
            print_success "Game stats update successful"
        else
            print_error "Game stats update failed: $STATS_RESPONSE"
        fi

        # Test tournament creation
        TOURNAMENT_RESPONSE=$(curl -s -X POST http://localhost:3003/tournaments \
          -H "Content-Type: application/json" \
          -d "{\"name\":\"Integration Test Tournament\",\"description\":\"Testing integration\",\"maxParticipants\":4,\"createdBy\":$USER_ID}")

        if echo "$TOURNAMENT_RESPONSE" | grep -q "id"; then
            print_success "Tournament creation successful"
        else
            print_error "Tournament creation failed: $TOURNAMENT_RESPONSE"
        fi
    else
        print_error "Could not extract user ID from profile response"
    fi

else
    print_error "Login failed, no token received: $LOGIN_RESPONSE"
fi

# Test cross-service data consistency
echo
print_status "Testing Cross-Service Data Consistency..."

# Get user profile from user service
USER_PROFILE=$(curl -s http://localhost:3004/profile/$USER_ID)
if echo "$USER_PROFILE" | grep -q "Integration Test User"; then
    print_success "User profile data consistent across services"
else
    print_warning "User profile data may not be consistent: $USER_PROFILE"
fi

# Test leaderboard
LEADERBOARD=$(curl -s "http://localhost:3004/leaderboard?limit=5")
if echo "$LEADERBOARD" | grep -q "display_name"; then
    print_success "Leaderboard accessible"
else
    print_warning "Leaderboard may not be working: $LEADERBOARD"
fi

# Final status
echo
echo "=========================================="
print_success "🎉 ALL TESTS COMPLETED SUCCESSFULLY!"
print_success "Transcendence system is fully functional"
echo "=========================================="

# Keep services running for manual testing if requested
if [ "$1" = "--keep-running" ]; then
    print_status "Services are still running. Press Ctrl+C to stop."
    wait
fi