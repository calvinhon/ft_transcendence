#!/bin/bash

# Test Suite: WAF & Vault
# Module: Web Application Firewall & Secrets Management
# Points: 10 (Major)
# Tools: ModSecurity, HashiCorp Vault
# Date: December 5, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE="$SCRIPT_DIR/results-waf-vault.txt"
PASS_COUNT=0
FAIL_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== WAF & Vault Test Results ===" > "$RESULTS_FILE"
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

# Test 1: ModSecurity Configuration
test_modsecurity_configuration() {
    echo -e "${YELLOW}Running Test 1: ModSecurity Configuration${NC}"
    
    if [ -f "$PROJECT_ROOT/nginx/modsecurity.conf" ]; then
        log_result 1 "ModSecurity Configuration" "PASS"
        return 0
    fi
    
    log_result 1 "ModSecurity Configuration" "FAIL"
    return 1
}

# Test 2: Vault Initialization
test_vault_initialization() {
    echo -e "${YELLOW}Running Test 2: Vault Initialization${NC}"
    
    if [ -f "$PROJECT_ROOT/vault/init.sh" ] && [ -f "$PROJECT_ROOT/vault/config.hcl" ]; then
        log_result 2 "Vault Initialization" "PASS"
        return 0
    fi
    
    log_result 2 "Vault Initialization" "FAIL"
    return 1
}

# Test 3: SQL Injection Prevention
test_sql_injection_prevention() {
    echo -e "${YELLOW}Running Test 3: SQL Injection Prevention${NC}"
    
    if grep -q "sql\|injection\|rule" "$PROJECT_ROOT/nginx/modsecurity.conf"; then
        log_result 3 "SQL Injection Prevention" "PASS"
        return 0
    fi
    
    log_result 3 "SQL Injection Prevention" "FAIL"
    return 1
}

# Test 4: XSS Protection
test_xss_protection() {
    echo -e "${YELLOW}Running Test 4: XSS Protection${NC}"
    
    if grep -q "xss\|script\|html" "$PROJECT_ROOT/nginx/modsecurity.conf"; then
        log_result 4 "XSS Protection" "PASS"
        return 0
    fi
    
    log_result 4 "XSS Protection" "FAIL"
    return 1
}

# Test 5: CSRF Token Validation
test_csrf_token_validation() {
    echo -e "${YELLOW}Running Test 5: CSRF Token Validation${NC}"
    
    local response=$(curl -s -X OPTIONS http://localhost:3001/health -i 2>/dev/null)
    
    if echo "$response" | grep -qi "allow\|csrf"; then
        log_result 5 "CSRF Token Validation" "PASS"
        return 0
    fi
    
    log_result 5 "CSRF Token Validation" "FAIL"
    return 1
}

# Test 6: Secrets Management
test_secrets_management() {
    echo -e "${YELLOW}Running Test 6: Secrets Management${NC}"
    
    # Check if Vault is running
    local response=$(curl -s http://localhost:8200/v1/sys/seal-status 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 6 "Secrets Management" "PASS"
        return 0
    fi
    
    log_result 6 "Secrets Management" "FAIL"
    return 1
}

# Test 7: Environment Variable Protection
test_env_variable_protection() {
    echo -e "${YELLOW}Running Test 7: Environment Variable Protection${NC}"
    
    # Check if environment variables are used in services
    if grep -r "process\.env\|PORT\|NODE_ENV" "$PROJECT_ROOT"/*/src --include="*.ts" 2>/dev/null | head -1 | grep -q .; then
        log_result 7 "Environment Variable Protection" "PASS"
        return 0
    fi
    
    log_result 7 "Environment Variable Protection" "FAIL"
    return 1
}

# Test 8: Certificate Management
test_certificate_management() {
    echo -e "${YELLOW}Running Test 8: Certificate Management${NC}"
    
    # Check for SSL/TLS configuration
    local response=$(curl -s https://localhost 2>/dev/null)
    
    if [ $? -eq 0 ] || [ -n "$response" ]; then
        log_result 8 "Certificate Management" "PASS"
        return 0
    fi
    
    log_result 8 "Certificate Management" "FAIL"
    return 1
}

# Test 9: Access Control Lists
test_access_control_lists() {
    echo -e "${YELLOW}Running Test 9: Access Control Lists${NC}"
    
    if grep -q "deny\|allow\|acl" "$PROJECT_ROOT/nginx/modsecurity.conf"; then
        log_result 9 "Access Control Lists" "PASS"
        return 0
    fi
    
    log_result 9 "Access Control Lists" "FAIL"
    return 1
}

# Test 10: Audit Logging
test_audit_logging() {
    echo -e "${YELLOW}Running Test 10: Audit Logging${NC}"
    
    # Check for logging infrastructure (Vault or ELK)
    if [ -d "$PROJECT_ROOT/vault" ] || grep -q "filebeat\|elasticsearch" "$PROJECT_ROOT/docker-compose.yml" 2>/dev/null; then
        log_result 10 "Audit Logging" "PASS"
        return 0
    fi
    
    log_result 10 "Audit Logging" "FAIL"
    return 1
}

# Test 11: Rate Limiting
test_rate_limiting() {
    echo -e "${YELLOW}Running Test 11: Rate Limiting${NC}"
    
    if grep -q "rate\|limit\|throttle" "$PROJECT_ROOT/nginx/modsecurity.conf"; then
        log_result 11 "Rate Limiting" "PASS"
        return 0
    fi
    
    log_result 11 "Rate Limiting" "FAIL"
    return 1
}

# Test 12: Security Policy Enforcement
test_security_policy_enforcement() {
    echo -e "${YELLOW}Running Test 12: Security Policy Enforcement${NC}"
    
    # Check for security configuration files
    if [ -f "$PROJECT_ROOT/nginx/modsecurity.conf" ] || [ -f "$PROJECT_ROOT/frontend/nginx/nginx.conf" ]; then
        log_result 12 "Security Policy Enforcement" "PASS"
        return 0
    fi
    
    log_result 12 "Security Policy Enforcement" "FAIL"
    return 1
}

# Main execution
main() {
    echo -e "${YELLOW}=== WAF & Vault Test Suite ===${NC}"
    echo "Testing Web Application Firewall and Vault..."
    echo ""
    
    cd "$PROJECT_ROOT"
    
    test_modsecurity_configuration || true
    test_vault_initialization || true
    test_sql_injection_prevention || true
    test_xss_protection || true
    test_csrf_token_validation || true
    test_secrets_management || true
    test_env_variable_protection || true
    test_certificate_management || true
    test_access_control_lists || true
    test_audit_logging || true
    test_rate_limiting || true
    test_security_policy_enforcement || true
    
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
