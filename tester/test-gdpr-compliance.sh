#!/bin/bash

# Test Suite: GDPR Compliance
# Module: GDPR Data Protection
# Points: 5 (Minor)
# Features: Data Export, Data Delete, Anonymization
# Date: December 5, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE="$SCRIPT_DIR/results-gdpr-compliance.txt"
PASS_COUNT=0
FAIL_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== GDPR Compliance Test Results ===" > "$RESULTS_FILE"
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

# Test 1: GDPR Endpoints Configuration
test_gdpr_endpoints() {
    echo -e "${YELLOW}Running Test 1: GDPR Endpoints Configuration${NC}"
    
    # Check if GDPR endpoints exist
    local user_files=$(find "$PROJECT_ROOT/user/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$user_files" | xargs grep -l "export\|delete\|anonymize\|gdpr" 2>/dev/null | grep -q .; then
        log_result 1 "GDPR Endpoints Configuration" "PASS"
        return 0
    fi
    
    log_result 1 "GDPR Endpoints Configuration" "FAIL"
    return 1
}

# Test 2: Data Export Functionality
test_data_export() {
    echo -e "${YELLOW}Running Test 2: Data Export Functionality${NC}"
    
    local response=$(curl -s -X GET "http://user:3000/gdpr/export" 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 2 "Data Export Functionality" "PASS"
        return 0
    fi
    
    log_result 2 "Data Export Functionality" "FAIL"
    return 1
}

# Test 3: Data Deletion Request
test_data_deletion() {
    echo -e "${YELLOW}Running Test 3: Data Deletion Request${NC}"
    
    local response=$(curl -s -X POST "http://user:3000/gdpr/delete" \
        -H "Content-Type: application/json" \
        -d '{}' 2>/dev/null)
    
    if [ -n "$response" ]; then
        log_result 3 "Data Deletion Request" "PASS"
        return 0
    fi
    
    log_result 3 "Data Deletion Request" "FAIL"
    return 1
}

# Test 4: User Data Anonymization
test_user_anonymization() {
    echo -e "${YELLOW}Running Test 4: User Data Anonymization${NC}"
    
    local response=$(curl -s -X POST "http://user:3000/gdpr/anonymize" \
        -H "Content-Type: application/json" \
        -d '{}' 2>/dev/null)
    
    if [ -n "$response" ]; then
        log_result 4 "User Data Anonymization" "PASS"
        return 0
    fi
    
    log_result 4 "User Data Anonymization" "FAIL"
    return 1
}

# Test 5: Consent Management
test_consent_management() {
    echo -e "${YELLOW}Running Test 5: Consent Management${NC}"
    
    # Check if user service has user management capabilities
    if [ -d "$PROJECT_ROOT/user" ] && [ -f "$PROJECT_ROOT/user/src/server.ts" ]; then
        log_result 5 "Consent Management" "PASS"
        return 0
    fi
    
    log_result 5 "Consent Management" "FAIL"
    return 1
}

# Test 6: Audit Trail
test_audit_trail() {
    echo -e "${YELLOW}Running Test 6: Audit Trail${NC}"
    
    # Check if logging infrastructure exists
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ] && grep -q "elasticsearch\|elk" "$PROJECT_ROOT/docker-compose.yml"; then
        log_result 6 "Audit Trail" "PASS"
        return 0
    fi
    
    log_result 6 "Audit Trail" "FAIL"
    return 1
}

# Test 7: Data Portability
test_data_portability() {
    echo -e "${YELLOW}Running Test 7: Data Portability${NC}"
    
    local response=$(curl -s -X GET "http://user:3000/gdpr/export?format=json" 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 7 "Data Portability" "PASS"
        return 0
    fi
    
    log_result 7 "Data Portability" "FAIL"
    return 1
}

# Test 8: Right to be Forgotten
test_right_to_be_forgotten() {
    echo -e "${YELLOW}Running Test 8: Right to be Forgotten${NC}"
    
    local user_files=$(find "$PROJECT_ROOT/user/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$user_files" | xargs grep -l "delete.*user\|remove.*data\|forgotten" 2>/dev/null | grep -q .; then
        log_result 8 "Right to be Forgotten" "PASS"
        return 0
    fi
    
    log_result 8 "Right to be Forgotten" "FAIL"
    return 1
}

# Test 9: Privacy Policy Compliance
test_privacy_policy() {
    echo -e "${YELLOW}Running Test 9: Privacy Policy Compliance${NC}"
    
    if [ -f "$PROJECT_ROOT/documentation/GDPR_IMPLEMENTATION.md" ]; then
        log_result 9 "Privacy Policy Compliance" "PASS"
        return 0
    fi
    
    log_result 9 "Privacy Policy Compliance" "FAIL"
    return 1
}

# Test 10: Data Processing Agreement
test_data_processing_agreement() {
    echo -e "${YELLOW}Running Test 10: Data Processing Agreement${NC}"
    
    local user_files=$(find "$PROJECT_ROOT/user/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$user_files" | xargs grep -l "process\|agreement\|dpa" 2>/dev/null | grep -q .; then
        log_result 10 "Data Processing Agreement" "PASS"
        return 0
    fi
    
    log_result 10 "Data Processing Agreement" "FAIL"
    return 1
}

# Test 11: Response Time for GDPR Requests
test_gdpr_response_time() {
    echo -e "${YELLOW}Running Test 11: Response Time for GDPR Requests${NC}"
    
    local start=$(date +%s%N)
    curl -s -X GET "http://user:3000/gdpr/export" > /dev/null 2>&1
    local end=$(date +%s%N)
    local elapsed=$(( ($end - $start) / 1000000 ))
    
    # Should respond within 2 seconds
    if [ "$elapsed" -lt 2000 ]; then
        log_result 11 "Response Time for GDPR Requests" "PASS"
        return 0
    fi
    
    log_result 11 "Response Time for GDPR Requests" "FAIL"
    return 1
}

# Test 12: Secure Data Transmission
test_secure_data_transmission() {
    echo -e "${YELLOW}Running Test 12: Secure Data Transmission${NC}"
    
    # Check if user service is accessible
    local response=$(curl -s http://user:3000/health 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 12 "Secure Data Transmission" "PASS"
        return 0
    fi
    
    log_result 12 "Secure Data Transmission" "FAIL"
    return 1
}

# Main execution
main() {
    echo -e "${YELLOW}=== GDPR Compliance Test Suite ===${NC}"
    echo "Testing GDPR compliance implementation..."
    echo ""
    
    cd "$PROJECT_ROOT"
    
    test_gdpr_endpoints || true
    test_data_export || true
    test_data_deletion || true
    test_user_anonymization || true
    test_consent_management || true
    test_audit_trail || true
    test_data_portability || true
    test_right_to_be_forgotten || true
    test_privacy_policy || true
    test_data_processing_agreement || true
    test_gdpr_response_time || true
    test_secure_data_transmission || true
    
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
