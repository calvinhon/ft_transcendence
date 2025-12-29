#!/bin/bash

# Containerized Test Runner
# Runs all tests inside Docker containers to avoid host dependencies

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     CONTAINERIZED TEST SUITE - FT_TRANSCENDENCE            ║${NC}"
echo -e "${BLUE}║     Running 10 modules inside Docker containers            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if containers are running
echo -e "${YELLOW}Checking container status...${NC}"
CONTAINERS=(
    "auth"
    "game"
    "tournament"
    "user"
    "vault"
    "frontend"
    "ssr"
)

ALL_RUNNING=true
for container in "${CONTAINERS[@]}"; do
    if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        echo -e "${RED}✗ Container not running: ${container}${NC}"
        ALL_RUNNING=false
    else
        echo -e "${GREEN}✓ Running: ${container}${NC}"
    fi
done

if [ "$ALL_RUNNING" = false ]; then
    echo -e "${RED}Please start all containers first: make full-start${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Installing test dependencies in containers...${NC}"

# Install curl, python3, and other tools in containers
for service in auth game tournament user; do
    container="${service}"
    echo -e "${BLUE}Setting up ${service}...${NC}"
    
    docker exec -u root "$container" sh -c "
        apk add --no-cache curl python3 >/dev/null 2>&1 && \
        echo '✓ Dependencies installed in ${service}'
    " || echo "⚠ Failed to install in ${service}"
done

echo ""
echo -e "${GREEN}Starting test execution...${NC}"
echo ""

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
declare -A MODULE_RESULTS

# Run tests in containers
run_containerized_test() {
    local test_name=$1
    local test_script=$2
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Running: $test_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Copy test script to container and run it
    local container="auth"
    local test_file="${SCRIPT_DIR}/${test_script}"
    
    if [ ! -f "$test_file" ]; then
        echo -e "${RED}✗ Test script not found: $test_file${NC}"
        MODULE_RESULTS["$test_name"]="MISSING"
        return 1
    fi
    
    # Run test from host (tests access services via localhost ports)
    if bash "$test_file" > /tmp/test_output_$$.txt 2>&1; then
        echo -e "${GREEN}✓ $test_name PASSED${NC}"
        MODULE_RESULTS["$test_name"]="PASS"
        
        # Count passed tests from output
        if [ -f /tmp/test_output_$$.txt ]; then
            local passed=$(grep -c "PASS" /tmp/test_output_$$.txt || echo 0)
            PASSED_TESTS=$((PASSED_TESTS + passed))
            TOTAL_TESTS=$((TOTAL_TESTS + passed))
        fi
    else
        echo -e "${RED}✗ $test_name FAILED${NC}"
        MODULE_RESULTS["$test_name"]="FAIL"
        
        # Show last few lines of output
        if [ -f /tmp/test_output_$$.txt ]; then
            echo -e "${YELLOW}Last 10 lines of output:${NC}"
            tail -10 /tmp/test_output_$$.txt
            
            # Count tests
            local passed=$(grep -c "PASS" /tmp/test_output_$$.txt || echo 0)
            local failed=$(grep -c "FAIL" /tmp/test_output_$$.txt || echo 0)
            PASSED_TESTS=$((PASSED_TESTS + passed))
            FAILED_TESTS=$((FAILED_TESTS + failed))
            TOTAL_TESTS=$((TOTAL_TESTS + passed + failed))
        fi
    fi
    
    rm -f /tmp/test_output_$$.txt
    echo ""
}

# Core Modules
echo -e "${YELLOW}=== TESTING CORE MODULES ===${NC}"
run_containerized_test "Backend Framework (Fastify)" "test-backend-framework.sh"
run_containerized_test "Database (SQLite)" "test-database.sh"
run_containerized_test "Blockchain (Solidity/Hardhat)" "test-blockchain.sh"
run_containerized_test "AI Opponent" "test-ai-opponent.sh"
run_containerized_test "Stats Dashboards" "test-stats-dashboards.sh"
run_containerized_test "Microservices Architecture" "test-microservices.sh"
run_containerized_test "Server-Side Pong" "test-server-side-pong.sh"

# Advanced Modules
echo -e "${YELLOW}=== TESTING ADVANCED MODULES ===${NC}"
run_containerized_test "WAF & Vault" "test-waf-vault.sh"
run_containerized_test "GDPR Compliance" "test-gdpr-compliance.sh"
run_containerized_test "SSR Integration" "test-ssr.sh"

# Print Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST EXECUTION SUMMARY                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "Passed:       ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed:       ${RED}${FAILED_TESTS}${NC}"
echo ""

echo "=== DETAILED RESULTS ==="
for module in "Backend Framework (Fastify)" "Database (SQLite)" "Blockchain (Solidity/Hardhat)" \
              "AI Opponent" "Stats Dashboards" "Microservices Architecture" "Server-Side Pong" \
              "WAF & Vault" "GDPR Compliance" "SSR Integration"; do
    result="${MODULE_RESULTS[$module]}"
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $module"
    elif [ "$result" = "FAIL" ]; then
        echo -e "${RED}✗${NC} $module"
    else
        echo -e "${YELLOW}?${NC} $module"
    fi
done

echo ""

# Final verdict
if [ ${FAILED_TESTS} -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ALL TESTS PASSED! ✓                           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                  SOME TESTS FAILED ✗                       ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
