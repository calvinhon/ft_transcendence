#!/bin/bash

# Docker Test Runner - Complete containerized testing solution
# No host dependencies required except Docker

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        DOCKER-BASED TEST RUNNER - FT_TRANSCENDENCE         ║${NC}"
echo -e "${BLUE}║          No host dependencies required!                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is required but not found${NC}"
    exit 1
fi

# Check if containers are running
echo -e "${YELLOW}Checking container status...${NC}"
REQUIRED_CONTAINERS=(
    "ft_transcendence-auth-service-1"
    "ft_transcendence-game-service-1"
    "ft_transcendence-tournament-service-1"
    "ft_transcendence-user-service-1"
    "ft_transcendence-ssr-service-1"
)

ALL_RUNNING=true
for container in "${REQUIRED_CONTAINERS[@]}"; do
    if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "${RED}✗ Container not running: ${container}${NC}"
        ALL_RUNNING=false
    else
        echo -e "${GREEN}✓ Running: ${container}${NC}"
    fi
done

if [ "$ALL_RUNNING" = false ]; then
    echo -e "${RED}Please start all containers first: make start${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Building test container...${NC}"
docker build -t ft_transcendence-tester -f "$SCRIPT_DIR/Dockerfile.tester" "$SCRIPT_DIR" 2>&1 | grep -E "Successfully|Error" || true

echo ""
echo -e "${GREEN}Starting containerized test execution...${NC}"
echo ""

# Run tests in dedicated container with access to Docker network
# Mount project as both /project and at original path to avoid path issues
docker run --rm \
    --network ft_transcendence_transcendence-network \
    -v "$SCRIPT_DIR:/tests-original:ro" \
    -v "$PROJECT_ROOT:$PROJECT_ROOT:ro" \
    -v "$PROJECT_ROOT:/project:ro" \
    -e PROJECT_ROOT="$PROJECT_ROOT" \
    ft_transcendence-tester \
    /bin/bash -c "
        # Copy test scripts to writable location
        cp -r /tests-original /tests-work
        cd /tests-work
        
        # Update service URLs for Docker network (internal port 3000)
        echo '🔧 Configuring for Docker network...'
        for script in *.sh; do
            [ -f \"\$script\" ] || continue
            sed -i \\
                -e 's|http://localhost:3001|http://ft_transcendence-auth-service-1:3000|g' \\
                -e 's|http://localhost:3002|http://ft_transcendence-game-service-1:3000|g' \\
                -e 's|http://localhost:3003|http://ft_transcendence-tournament-service-1:3000|g' \\
                -e 's|http://localhost:3004|http://ft_transcendence-user-service-1:3000|g' \\
                -e 's|http://localhost:3005|http://ft_transcendence-ssr-service-1:3005|g' \\
                \"\$script\"
        done
        
        echo '✅ Configuration complete'
        echo ''
        
        # Run all tests
        ./run-all-tests.sh
    "

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ALL TESTS PASSED! ✓                           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║           SOME TESTS FAILED - See above ✗                  ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
fi

exit $TEST_EXIT_CODE
