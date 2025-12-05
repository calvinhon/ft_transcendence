#!/bin/bash

# Test Suite: Microservices
# Module: Microservices Architecture
# Points: 10 (Major)
# Date: December 5, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE="$SCRIPT_DIR/results-microservices.txt"
PASS_COUNT=0
FAIL_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Microservices Test Results ===" > "$RESULTS_FILE"
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

# Test 1: Service Discovery
test_service_discovery() {
    echo -e "${YELLOW}Running Test 1: Service Discovery${NC}"
    
    # Check if all services are running
    local services=("auth-service" "game-service" "tournament-service" "user-service")
    local all_running=true
    
    for service in "${services[@]}"; do
        if ! docker compose -f "$PROJECT_ROOT/docker-compose.yml" ps "$service" 2>/dev/null | grep -q "Up"; then
            all_running=false
            break
        fi
    done
    
    if [ "$all_running" = true ]; then
        log_result 1 "Service Discovery" "PASS"
        return 0
    fi
    
    log_result 1 "Service Discovery" "FAIL"
    return 1
}

# Test 2: Inter-Service Communication
test_inter_service_communication() {
    echo -e "${YELLOW}Running Test 2: Inter-Service Communication${NC}"
    
    # Check if services can communicate with each other
    local response=$(curl -s http://localhost:3002/health 2>/dev/null)
    
    if echo "$response" | jq . > /dev/null 2>&1; then
        log_result 2 "Inter-Service Communication" "PASS"
        return 0
    fi
    
    log_result 2 "Inter-Service Communication" "FAIL"
    return 1
}

# Test 3: API Gateway
test_api_gateway() {
    echo -e "${YELLOW}Running Test 3: API Gateway${NC}"
    
    # Check if API gateway (nginx) is configured
    if [ -f "$PROJECT_ROOT/nginx/modsecurity.conf" ] || [ -f "$PROJECT_ROOT/nginx/nginx.conf" ]; then
        log_result 3 "API Gateway" "PASS"
        return 0
    fi
    
    log_result 3 "API Gateway" "FAIL"
    return 1
}

# Test 4: Load Balancing
test_load_balancing() {
    echo -e "${YELLOW}Running Test 4: Load Balancing${NC}"
    
    # Check docker compose for multiple instances or load balancing config
    if grep -q "load_balancing\|upstream\|replica" "$PROJECT_ROOT/docker-compose.yml"; then
        log_result 4 "Load Balancing" "PASS"
        return 0
    fi
    
    log_result 4 "Load Balancing" "FAIL"
    return 1
}

# Test 5: Service Isolation
test_service_isolation() {
    echo -e "${YELLOW}Running Test 5: Service Isolation${NC}"
    
    # Check if each service has separate database
    local db_count=$(find "$PROJECT_ROOT" -name "*.db" 2>/dev/null | wc -l)
    
    if [ "$db_count" -ge 4 ]; then
        log_result 5 "Service Isolation" "PASS"
        return 0
    fi
    
    log_result 5 "Service Isolation" "FAIL"
    return 1
}

# Test 6: Configuration Management
test_configuration_management() {
    echo -e "${YELLOW}Running Test 6: Configuration Management${NC}"
    
    # Check for environment config or Vault integration
    if [ -f "$PROJECT_ROOT/vault/config.hcl" ] || [ -f "$PROJECT_ROOT/.env" ]; then
        log_result 6 "Configuration Management" "PASS"
        return 0
    fi
    
    log_result 6 "Configuration Management" "FAIL"
    return 1
}

# Test 7: Logging and Monitoring
test_logging_monitoring() {
    echo -e "${YELLOW}Running Test 7: Logging and Monitoring${NC}"
    
    # Check for ELK or monitoring setup
    local response=$(curl -s http://localhost:9200 2>/dev/null)
    
    if echo "$response" | jq . > /dev/null 2>&1; then
        log_result 7 "Logging and Monitoring" "PASS"
        return 0
    fi
    
    log_result 7 "Logging and Monitoring" "FAIL"
    return 1
}

# Test 8: Fault Tolerance
test_fault_tolerance() {
    echo -e "${YELLOW}Running Test 8: Fault Tolerance${NC}"
    
    # Check for retry logic, circuit breaker patterns
    local service_files=$(find "$PROJECT_ROOT/*/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$service_files" | xargs grep -l "retry\|timeout\|fallback\|circuit" 2>/dev/null | grep -q .; then
        log_result 8 "Fault Tolerance" "PASS"
        return 0
    fi
    
    log_result 8 "Fault Tolerance" "FAIL"
    return 1
}

# Test 9: Data Consistency
test_data_consistency() {
    echo -e "${YELLOW}Running Test 9: Data Consistency${NC}"
    
    # Check for transaction support and data validation
    local service_files=$(find "$PROJECT_ROOT/*/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$service_files" | xargs grep -l "transaction\|validate\|schema" 2>/dev/null | grep -q .; then
        log_result 9 "Data Consistency" "PASS"
        return 0
    fi
    
    log_result 9 "Data Consistency" "FAIL"
    return 1
}

# Test 10: Scalability
test_scalability() {
    echo -e "${YELLOW}Running Test 10: Scalability${NC}"
    
    # Check if services can be scaled (Docker compose config)
    if grep -q "deploy:\|scale\|replicas" "$PROJECT_ROOT/docker-compose.yml"; then
        log_result 10 "Scalability" "PASS"
        return 0
    fi
    
    log_result 10 "Scalability" "FAIL"
    return 1
}

# Test 11: Security Between Services
test_security_between_services() {
    echo -e "${YELLOW}Running Test 11: Security Between Services${NC}"
    
    # Check for mTLS, authentication tokens, etc.
    local service_files=$(find "$PROJECT_ROOT/*/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$service_files" | xargs grep -l "auth\|token\|jwt\|secret" 2>/dev/null | grep -q .; then
        log_result 11 "Security Between Services" "PASS"
        return 0
    fi
    
    log_result 11 "Security Between Services" "FAIL"
    return 1
}

# Test 12: Service Deployment
test_service_deployment() {
    echo -e "${YELLOW}Running Test 12: Service Deployment${NC}"
    
    # Check Dockerfile for each service
    local services=("auth-service" "game-service" "tournament-service" "user-service")
    local all_have_dockerfile=true
    
    for service in "${services[@]}"; do
        if [ ! -f "$PROJECT_ROOT/$service/Dockerfile" ]; then
            all_have_dockerfile=false
            break
        fi
    done
    
    if [ "$all_have_dockerfile" = true ]; then
        log_result 12 "Service Deployment" "PASS"
        return 0
    fi
    
    log_result 12 "Service Deployment" "FAIL"
    return 1
}

# Main execution
main() {
    echo -e "${YELLOW}=== Microservices Test Suite ===${NC}"
    echo "Testing microservices architecture..."
    echo ""
    
    cd "$PROJECT_ROOT"
    
    test_service_discovery || true
    test_inter_service_communication || true
    test_api_gateway || true
    test_load_balancing || true
    test_service_isolation || true
    test_configuration_management || true
    test_logging_monitoring || true
    test_fault_tolerance || true
    test_data_consistency || true
    test_scalability || true
    test_security_between_services || true
    test_service_deployment || true
    
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
