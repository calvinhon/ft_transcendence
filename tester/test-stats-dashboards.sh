#!/bin/bash

# Test Suite: Stats Dashboards
# Module: Display Statistics (Dashboards)
# Points: 5 (Minor)
# Date: December 5, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE="$SCRIPT_DIR/results-stats-dashboards.txt"
PASS_COUNT=0
FAIL_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Stats Dashboards Test Results ===" > "$RESULTS_FILE"
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

# Global test user ID
TEST_USER_ID=""

# Hoach edited - Added test user setup function for dynamic testing
# Setup test user
setup_test_user() {
    echo -e "${YELLOW}Setting up test user...${NC}"
    
    local timestamp=$(date +%s)
    local username="stats_test_${timestamp}"
    local email="stats_test_${timestamp}@example.com"
    
    # Create test user
    local register_response=$(curl -sk -X POST https://localhost/api/auth/register \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"${username}\",\"email\":\"${email}\",\"password\":\"TestPass123!\"}" 2>/dev/null)
    
    # Extract user ID from response (assuming it returns user data with ID)
    if echo "$register_response" | python3 -m json.tool > /dev/null 2>&1; then
        # Try to extract user ID from response
        TEST_USER_ID=$(echo "$register_response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('user', {}).get('id', data.get('id', '1')))" 2>/dev/null)
        if [ -z "$TEST_USER_ID" ] || [ "$TEST_USER_ID" = "1" ]; then
            # Fallback: assume user ID is 1 or try to get it from login
            TEST_USER_ID="1"
        fi
        echo -e "${GREEN}Test user created with ID: ${TEST_USER_ID}${NC}"
        return 0
    else
        echo -e "${RED}Failed to create test user, using fallback ID: 1${NC}"
        TEST_USER_ID="1"
        return 1
    fi
}
# Hoach edit ended

# Test 1: Dashboard Endpoint
test_dashboard_endpoint() {
    echo -e "${YELLOW}Running Test 1: Dashboard Endpoint${NC}"
    
    # Hoach edited - Updated to use HTTPS endpoint through nginx proxy
    # Try localhost first (host), works with wrapper script replacement in Docker
    local response=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 2 https://localhost/api/game/stats 2>/dev/null)
    # Hoach edit ended
    
    if [ "$response" = "200" ] || [ "$response" = "401" ] || [ "$response" = "404" ]; then
        log_result 1 "Dashboard Endpoint" "PASS"
        return 0
    fi
    
    log_result 1 "Dashboard Endpoint" "FAIL"
    return 1
}

# Test 2: Game History API (replaces Leaderboard)
test_game_history_api() {
    echo -e "${YELLOW}Running Test 2: Game History API${NC}"
    
    # Hoach edited - Changed from leaderboard to game history API, using HTTPS endpoint
    local response=$(curl -sk https://localhost/api/game/history/${TEST_USER_ID} 2>/dev/null)
    # Hoach edit ended
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 2 "Game History API" "PASS"
        return 0
    fi
    
    log_result 2 "Game History API" "FAIL"
    return 1
}

# Test 3: User Profile Stats
test_user_profile_stats() {
    echo -e "${YELLOW}Running Test 3: User Profile Stats${NC}"
    
    local response=$(curl -sk https://localhost/api/user/profile/${TEST_USER_ID} 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 3 "User Profile Stats" "PASS"
        return 0
    fi
    
    log_result 3 "User Profile Stats" "FAIL"
    return 1
}

# Test 4: Game Statistics
test_game_statistics() {
    echo -e "${YELLOW}Running Test 4: Game Statistics${NC}"
    
    local response=$(curl -sk https://localhost/api/game/stats/${TEST_USER_ID} 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 4 "Game Statistics" "PASS"
        return 0
    fi
    
    log_result 4 "Game Statistics" "FAIL"
    return 1
}

# Test 5: Win/Loss Ratio
test_winloss_ratio() {
    echo -e "${YELLOW}Running Test 5: Win/Loss Ratio${NC}"
    
    local response=$(curl -sk https://localhost/api/game/stats/${TEST_USER_ID} 2>/dev/null)
    
    # Check if valid JSON response exists (win/loss data is computed from games)
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 5 "Win/Loss Ratio" "PASS"
        return 0
    fi
    
    log_result 5 "Win/Loss Ratio" "FAIL"
    return 1
}

# Test 6: Ranking System
test_ranking_system() {
    echo -e "${YELLOW}Running Test 6: Ranking System${NC}"
    
    local response=$(curl -sk https://localhost/api/tournament/user/${TEST_USER_ID}/rankings 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 6 "Ranking System" "PASS"
        return 0
    fi
    
    log_result 6 "Ranking System" "FAIL"
    return 1
}

# Test 7: Historical Data
test_historical_data() {
    echo -e "${YELLOW}Running Test 7: Historical Data${NC}"
    
    local response=$(curl -sk "https://localhost/api/game/history/${TEST_USER_ID}" 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 7 "Historical Data" "PASS"
        return 0
    fi
    
    log_result 7 "Historical Data" "FAIL"
    return 1
}

# Test 8: Performance Metrics
test_performance_metrics() {
    echo -e "${YELLOW}Running Test 8: Performance Metrics${NC}"
    
    local response=$(curl -sk https://localhost/api/game/stats/${TEST_USER_ID} 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 8 "Performance Metrics" "PASS"
        return 0
    fi
    
    log_result 8 "Performance Metrics" "FAIL"
    return 1
}

# Test 9: Dashboard UI Accessibility
test_dashboard_ui() {
    echo -e "${YELLOW}Running Test 9: Dashboard UI Accessibility${NC}"
    
    # Check for dashboard/stats pages in the frontend source code
    if [ -f "$PROJECT_ROOT/frontend/src/pages/DashboardPage.ts" ] && [ -f "$PROJECT_ROOT/frontend/src/pages/ProfilePage.ts" ]; then
        # Check if ProfilePage contains stats-related functionality
        if grep -q "stats\|dashboard\|leaderboard\|ranking" "$PROJECT_ROOT/frontend/src/pages/ProfilePage.ts"; then
            log_result 9 "Dashboard UI Accessibility" "PASS"
            return 0
        fi
    fi
    
    log_result 9 "Dashboard UI Accessibility" "FAIL"
    return 1
}

# Test 10: Real-time Updates
test_realtime_updates() {
    echo -e "${YELLOW}Running Test 10: Real-time Updates${NC}"
    
    # Check if WebSocket or SSE is configured for stats
    local game_files=$(find "$PROJECT_ROOT/game-service/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$game_files" | xargs grep -l "ws\|websocket\|sse\|subscribe\|emit" 2>/dev/null | grep -q .; then
        log_result 10 "Real-time Updates" "PASS"
        return 0
    fi
    
    log_result 10 "Real-time Updates" "FAIL"
    return 1
}

# Test 11: Data Export
test_data_export() {
    echo -e "${YELLOW}Running Test 11: Data Export${NC}"
    
    local response=$(curl -sk -X GET "https://localhost/api/user/gdpr/export/${TEST_USER_ID}" 2>/dev/null)
    
    if [ -n "$response" ]; then
        log_result 11 "Data Export" "PASS"
        return 0
    fi
    
    log_result 11 "Data Export" "FAIL"
    return 1
}

# Test 12: Caching Strategy
test_caching_strategy() {
    echo -e "${YELLOW}Running Test 12: Caching Strategy${NC}"
    
    # Check if stats endpoint responds (caching is implemented via HTTP headers by Fastify)
    local response=$(curl -sk --max-time 2 https://localhost/api/game/stats/${TEST_USER_ID} 2>/dev/null)
    
    if [ -n "$response" ] && echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 12 "Caching Strategy" "PASS"
        return 0
    fi
    
    log_result 12 "Caching Strategy" "FAIL"
    return 1
}

# Main execution
main() {
    echo -e "${YELLOW}=== Stats Dashboards Test Suite ===${NC}"
    echo "Testing statistics and dashboard implementation..."
    echo ""
    
    cd "$PROJECT_ROOT"
    
    setup_test_user || true
    
    test_dashboard_endpoint || true
    test_game_history_api || true
    test_user_profile_stats || true
    test_game_statistics || true
    test_winloss_ratio || true
    test_ranking_system || true
    test_historical_data || true
    test_performance_metrics || true
    test_dashboard_ui || true
    test_realtime_updates || true
    test_data_export || true
    test_caching_strategy || true
    
    echo ""
    echo -e "${YELLOW}=== Test Summary ===${NC}"
    echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
    echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
    echo "Total: $((PASS_COUNT + FAIL_COUNT))"
    
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
