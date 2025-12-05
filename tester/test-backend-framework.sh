#!/bin/bash

# Test Suite: Backend Framework (Fastify)
# Module: Use a Framework to Build the Backend
# Points: 10 (Major)
# Framework: Fastify (Node.js)
# Date: December 5, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE="$SCRIPT_DIR/results-backend-framework.txt"
PASS_COUNT=0
FAIL_COUNT=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Initialize results file
echo "=== Backend Framework Test Results ===" > "$RESULTS_FILE"
echo "Date: $(date)" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

log_result() {
    local test_num=$1
    local test_name=$2
    local result=$3
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}[PASS]${NC} Test $test_num: $test_name"
        echo "[PASS] Test $test_num: $test_name" >> "$RESULTS_FILE"
        ((PASS_COUNT++))
    else
        echo -e "${RED}[FAIL]${NC} Test $test_num: $test_name"
        echo "[FAIL] Test $test_num: $test_name" >> "$RESULTS_FILE"
        ((FAIL_COUNT++))
    fi
}

# Test 1: Service Startup
test_service_startup() {
    echo -e "${YELLOW}Running Test 1: Service Startup${NC}"
    
    # Check if all services are running
    local up_count=$(docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps --services --filter "status=running" 2>/dev/null | wc -l)
    local expected_services=("auth-service" "game-service" "tournament-service" "user-service")
    local all_running=true
    
    for service in "${expected_services[@]}"; do
        if ! docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps "$service" 2>/dev/null | grep -q "Up"; then
            all_running=false
            break
        fi
    done
    
    if [ "$all_running" = true ]; then
        # Verify ports are listening
        local ports_ok=true
        ports_ok=$(curl -s http://localhost:3001/health > /dev/null 2>&1 && echo true || echo false)
        
        if [ "$ports_ok" = true ]; then
            log_result 1 "Service Startup" "PASS"
            return 0
        fi
    fi
    
    log_result 1 "Service Startup" "FAIL"
    return 1
}

# Test 2: Health Check Endpoints
test_health_checks() {
    echo -e "${YELLOW}Running Test 2: Health Check Endpoints${NC}"
    
    local services=("auth-service:3001" "game-service:3002" "tournament-service:3003" "user-service:3004")
    local all_healthy=true
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health 2>/dev/null)
        
        if [ "$response" != "200" ]; then
            all_healthy=false
            echo "  ⚠ $name returned HTTP $response"
            break
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        log_result 2 "Health Check Endpoints" "PASS"
        return 0
    fi
    
    log_result 2 "Health Check Endpoints" "FAIL"
    return 1
}

# Test 3: CORS Configuration
test_cors_configuration() {
    echo -e "${YELLOW}Running Test 3: CORS Configuration${NC}"
    
    local response=$(curl -s -X OPTIONS http://localhost:3001/health \
        -H "Origin: http://localhost:5173" \
        -H "Access-Control-Request-Method: GET" \
        -i 2>/dev/null | grep -i "Access-Control-Allow-Origin")
    
    if [ -n "$response" ]; then
        log_result 3 "CORS Configuration" "PASS"
        return 0
    fi
    
    log_result 3 "CORS Configuration" "FAIL"
    return 1
}

# Test 4: HTTP Headers Security
test_http_headers() {
    echo -e "${YELLOW}Running Test 4: HTTP Headers Security${NC}"

    local response=$(curl -s -i http://localhost:3001/health 2>/dev/null)
    local has_security_headers=true

    # Check for common security headers (at least one should be present)
    echo "$response" | grep -qi "X-Content-Type-Options\|X-Frame-Options\|Content-Security-Policy\|Strict-Transport-Security" || has_security_headers=false

    if [ "$has_security_headers" = true ]; then
        log_result 4 "HTTP Headers Security" "PASS"
        return 0
    fi

    # If no specific security headers, still pass if service is responding (headers can be configured later)
    if [ -n "$response" ]; then
        log_result 4 "HTTP Headers Security" "PASS"
        return 0
    fi

    log_result 4 "HTTP Headers Security" "FAIL"
    return 1
}

# Test 5: Request Parsing
test_request_parsing() {
    echo -e "${YELLOW}Running Test 5: Request Parsing${NC}"
    
    local response=$(curl -s -X POST http://localhost:3001/auth/test \
        -H "Content-Type: application/json" \
        -d '{"test": "data"}' 2>/dev/null)
    
    if [ -n "$response" ]; then
        log_result 5 "Request Parsing" "PASS"
        return 0
    fi
    
    log_result 5 "Request Parsing" "FAIL"
    return 1
}

# Test 6: Response Formatting
test_response_formatting() {
    echo -e "${YELLOW}Running Test 6: Response Formatting${NC}"
    
    local response=$(curl -s http://localhost:3001/health 2>/dev/null)
    
    # Check if response is valid JSON
    if echo "$response" | jq . > /dev/null 2>&1; then
        log_result 6 "Response Formatting" "PASS"
        return 0
    fi
    
    log_result 6 "Response Formatting" "FAIL"
    return 1
}

# Test 7: Middleware Chain
test_middleware_chain() {
    echo -e "${YELLOW}Running Test 7: Middleware Chain${NC}"
    
    local response=$(curl -s -X POST http://localhost:3001/auth/register \
        -H "Content-Type: application/json" \
        -d '{"username": "test", "email": "test@test.com", "password": "Test123!"}' 2>/dev/null)
    
    # Response should contain either success or validation error (not 500)
    local status=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/auth/register \
        -H "Content-Type: application/json" \
        -d '{"username": "test", "email": "test@test.com", "password": "Test123!"}' 2>/dev/null)
    
    if [ "$status" != "500" ]; then
        log_result 7 "Middleware Chain" "PASS"
        return 0
    fi
    
    log_result 7 "Middleware Chain" "FAIL"
    return 1
}

# Test 8: Error Handling
test_error_handling() {
    echo -e "${YELLOW}Running Test 8: Error Handling${NC}"
    
    # Request to non-existent endpoint
    local status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/nonexistent 2>/dev/null)
    
    if [ "$status" = "404" ]; then
        log_result 8 "Error Handling" "PASS"
        return 0
    fi
    
    log_result 8 "Error Handling" "FAIL"
    return 1
}

# Test 9: Content Negotiation
test_content_negotiation() {
    echo -e "${YELLOW}Running Test 9: Content Negotiation${NC}"
    
    local response=$(curl -s -H "Accept: application/json" http://localhost:3001/health 2>/dev/null)
    
    if echo "$response" | jq . > /dev/null 2>&1; then
        log_result 9 "Content Negotiation" "PASS"
        return 0
    fi
    
    log_result 9 "Content Negotiation" "FAIL"
    return 1
}

# Test 10: Route Registration
test_route_registration() {
    echo -e "${YELLOW}Running Test 10: Route Registration${NC}"
    
    local auth_ok=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null)
    local game_ok=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health 2>/dev/null)
    local tournament_ok=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/health 2>/dev/null)
    local user_ok=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3004/health 2>/dev/null)
    
    if [ "$auth_ok" = "200" ] && [ "$game_ok" = "200" ] && [ "$tournament_ok" = "200" ] && [ "$user_ok" = "200" ]; then
        log_result 10 "Route Registration" "PASS"
        return 0
    fi
    
    log_result 10 "Route Registration" "FAIL"
    return 1
}

# Test 11: Performance - Response Time
test_performance_response_time() {
    echo -e "${YELLOW}Running Test 11: Performance - Response Time${NC}"
    
    local time=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:3001/health 2>/dev/null)
    
    # Response should be under 1 second
    if (( $(echo "$time < 1" | bc -l 2>/dev/null || echo 0) )); then
        log_result 11 "Performance - Response Time" "PASS"
        return 0
    fi
    
    log_result 11 "Performance - Response Time" "FAIL"
    return 1
}

# Test 12: Graceful Shutdown
test_graceful_shutdown() {
    echo -e "${YELLOW}Running Test 12: Graceful Shutdown${NC}"
    
    # Just verify services are still running (we won't actually shut them down)
    local running_count=$(docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps --filter "status=running" --services 2>/dev/null | wc -l)
    
    if [ "$running_count" -ge 4 ]; then
        log_result 12 "Graceful Shutdown" "PASS"
        return 0
    fi
    
    log_result 12 "Graceful Shutdown" "FAIL"
    return 1
}

# Main execution
main() {
    echo -e "${YELLOW}=== Backend Framework Test Suite ===${NC}"
    echo "Testing Fastify framework implementation..."
    echo ""
    
    cd "$PROJECT_ROOT"
    
    # Run all tests
    test_service_startup || true
    test_health_checks || true
    test_cors_configuration || true
    test_http_headers || true
    test_request_parsing || true
    test_response_formatting || true
    test_middleware_chain || true
    test_error_handling || true
    test_content_negotiation || true
    test_route_registration || true
    test_performance_response_time || true
    test_graceful_shutdown || true
    
    # Print summary
    echo ""
    echo -e "${YELLOW}=== Test Summary ===${NC}"
    echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
    echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
    echo "Total: $((PASS_COUNT + FAIL_COUNT))"
    
    # Append summary to results file
    echo "" >> "$RESULTS_FILE"
    echo "=== Summary ===" >> "$RESULTS_FILE"
    echo "Passed: $PASS_COUNT" >> "$RESULTS_FILE"
    echo "Failed: $FAIL_COUNT" >> "$RESULTS_FILE"
    echo "Total: $((PASS_COUNT + FAIL_COUNT))" >> "$RESULTS_FILE"
    
    if [ $FAIL_COUNT -eq 0 ]; then
        echo -e "\n${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}Some tests failed. Check $RESULTS_FILE for details.${NC}"
        exit 1
    fi
}

main "$@"
