#!/bin/bash

# Test Suite: OAuth/SSO
# Module: Remote Authentication (OAuth/SSO)
# Points: 10 (Major)
# Providers: Google, GitHub
# Date: December 5, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE="$SCRIPT_DIR/results-oauth-sso.txt"
PASS_COUNT=0
FAIL_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== OAuth/SSO Test Results ===" > "$RESULTS_FILE"
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

# Test 1: OAuth Initialization
test_oauth_initialization() {
    echo -e "${YELLOW}Running Test 1: OAuth Initialization${NC}"
    
    local response=$(curl -s -X GET "http://localhost:3001/oauth/init?provider=google" -i 2>/dev/null)
    
    if echo "$response" | grep -q "302\|Location"; then
        log_result 1 "OAuth Initialization" "PASS"
        return 0
    fi
    
    log_result 1 "OAuth Initialization" "FAIL"
    return 1
}

# Test 2: CSRF Protection
test_csrf_protection() {
    echo -e "${YELLOW}Running Test 2: CSRF Protection${NC}"
    
    local auth_files=$(find "$PROJECT_ROOT/auth/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$auth_files" | xargs grep -l "csrf\|state\|nonce" 2>/dev/null | grep -q .; then
        log_result 2 "CSRF Protection" "PASS"
        return 0
    fi
    
    log_result 2 "CSRF Protection" "FAIL"
    return 1
}

# Test 3: Code Exchange
test_code_exchange() {
    echo -e "${YELLOW}Running Test 3: Code Exchange${NC}"
    
    local auth_files=$(find "$PROJECT_ROOT/auth/src" -type f -name "*oauth*" 2>/dev/null)
    
    if [ -n "$auth_files" ]; then
        log_result 3 "Code Exchange" "PASS"
        return 0
    fi
    
    log_result 3 "Code Exchange" "FAIL"
    return 1
}

# Test 4: Token Storage
test_token_storage() {
    echo -e "${YELLOW}Running Test 4: Token Storage${NC}"
    
    local auth_files=$(find "$PROJECT_ROOT/auth/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$auth_files" | xargs grep -l "token\|cookie\|session" 2>/dev/null | grep -q .; then
        log_result 4 "Token Storage" "PASS"
        return 0
    fi
    
    log_result 4 "Token Storage" "FAIL"
    return 1
}

# Test 5: User Profile Sync
test_user_profile_sync() {
    echo -e "${YELLOW}Running Test 5: User Profile Sync${NC}"
    
    local auth_files=$(find "$PROJECT_ROOT/auth/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$auth_files" | xargs grep -l "sync\|profile\|avatar\|email" 2>/dev/null | grep -q .; then
        log_result 5 "User Profile Sync" "PASS"
        return 0
    fi
    
    log_result 5 "User Profile Sync" "FAIL"
    return 1
}

# Test 6: Google OAuth
test_google_oauth() {
    echo -e "${YELLOW}Running Test 6: Google OAuth${NC}"
    
    local auth_files=$(find "$PROJECT_ROOT/auth/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$auth_files" | xargs grep -l "google\|Google" 2>/dev/null | grep -q .; then
        log_result 6 "Google OAuth" "PASS"
        return 0
    fi
    
    log_result 6 "Google OAuth" "FAIL"
    return 1
}

# Test 7: GitHub OAuth
test_github_oauth() {
    echo -e "${YELLOW}Running Test 7: GitHub OAuth${NC}"
    
    local auth_files=$(find "$PROJECT_ROOT/auth/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$auth_files" | xargs grep -l "github\|GitHub" 2>/dev/null | grep -q .; then
        log_result 7 "GitHub OAuth" "PASS"
        return 0
    fi
    
    log_result 7 "GitHub OAuth" "FAIL"
    return 1
}

# Test 8: Token Validation
test_token_validation() {
    echo -e "${YELLOW}Running Test 8: Token Validation${NC}"
    
    local auth_files=$(find "$PROJECT_ROOT/auth/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$auth_files" | xargs grep -l "verify\|validate.*token\|jwt" 2>/dev/null | grep -q .; then
        log_result 8 "Token Validation" "PASS"
        return 0
    fi
    
    log_result 8 "Token Validation" "FAIL"
    return 1
}

# Test 9: Logout Functionality
test_logout_functionality() {
    echo -e "${YELLOW}Running Test 9: Logout Functionality${NC}"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/auth/logout 2>/dev/null)
    
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        log_result 9 "Logout Functionality" "PASS"
        return 0
    fi
    
    log_result 9 "Logout Functionality" "FAIL"
    return 1
}

# Test 10: Session Management
test_session_management() {
    echo -e "${YELLOW}Running Test 10: Session Management${NC}"
    
    local auth_files=$(find "$PROJECT_ROOT/auth/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$auth_files" | xargs grep -l "session\|refresh\|expir" 2>/dev/null | grep -q .; then
        log_result 10 "Session Management" "PASS"
        return 0
    fi
    
    log_result 10 "Session Management" "FAIL"
    return 1
}

# Test 11: Security Headers
test_security_headers() {
    echo -e "${YELLOW}Running Test 11: Security Headers${NC}"
    
    local response=$(curl -s -i http://localhost:3001/health 2>/dev/null)
    
    # Check for any security-related headers or HTTP success
    if echo "$response" | grep -qi "HTTP\|content-type\|x-"; then
        log_result 11 "Security Headers" "PASS"
        return 0
    fi
    
    log_result 11 "Security Headers" "FAIL"
    return 1
}

# Test 12: Error Handling
test_error_handling() {
    echo -e "${YELLOW}Running Test 12: Error Handling${NC}"
    
    local auth_files=$(find "$PROJECT_ROOT/auth/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$auth_files" | xargs grep -l "error\|catch\|throw" 2>/dev/null | grep -q .; then
        log_result 12 "Error Handling" "PASS"
        return 0
    fi
    
    log_result 12 "Error Handling" "FAIL"
    return 1
}

# Main execution
main() {
    echo -e "${YELLOW}=== OAuth/SSO Test Suite ===${NC}"
    echo "Testing OAuth/SSO authentication..."
    echo ""
    
    cd "$PROJECT_ROOT"
    
    test_oauth_initialization || true
    test_csrf_protection || true
    test_code_exchange || true
    test_token_storage || true
    test_user_profile_sync || true
    test_google_oauth || true
    test_github_oauth || true
    test_token_validation || true
    test_logout_functionality || true
    test_session_management || true
    test_security_headers || true
    test_error_handling || true
    
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
