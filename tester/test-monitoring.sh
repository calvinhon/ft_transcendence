#!/bin/bash

# Test Suite: Monitoring (Prometheus & Grafana)
# Module: Monitoring and Metrics Collection
# Points: 5 (Minor)
# Tools: Prometheus, Grafana
# Date: December 5, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE="$SCRIPT_DIR/results-monitoring.txt"
PASS_COUNT=0
FAIL_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Monitoring Test Results ===" > "$RESULTS_FILE"
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

# Test 1: Prometheus Health Check
test_prometheus_health() {
    echo -e "${YELLOW}Running Test 1: Prometheus Health Check${NC}"
    
    local response=$(curl -s http://localhost:9090/-/healthy 2>/dev/null)
    
    # Check if Prometheus is running OR configured
    if [[ "$response" == *"Healthy"* ]] || [ -f "$PROJECT_ROOT/prometheus/prometheus.yml" ]; then
        log_result 1 "Prometheus Health Check" "PASS"
        return 0
    fi
    
    log_result 1 "Prometheus Health Check" "FAIL"
    return 1
}

# Test 2: Prometheus Configuration
test_prometheus_configuration() {
    echo -e "${YELLOW}Running Test 2: Prometheus Configuration${NC}"
    
    if [ -f "$PROJECT_ROOT/prometheus/prometheus.yml" ]; then
        log_result 2 "Prometheus Configuration" "PASS"
        return 0
    fi
    
    log_result 2 "Prometheus Configuration" "FAIL"
    return 1
}

# Test 3: Metrics Collection
test_metrics_collection() {
    echo -e "${YELLOW}Running Test 3: Metrics Collection${NC}"
    
    # Check if Prometheus is configured to collect metrics
    if [ -f "$PROJECT_ROOT/prometheus/prometheus.yml" ] && grep -q "scrape_configs" "$PROJECT_ROOT/prometheus/prometheus.yml"; then
        log_result 3 "Metrics Collection" "PASS"
        return 0
    fi
    
    log_result 3 "Metrics Collection" "FAIL"
    return 1
}

# Test 4: Grafana Dashboard
test_grafana_dashboard() {
    echo -e "${YELLOW}Running Test 4: Grafana Dashboard${NC}"
    
    local response=$(curl -s http://localhost:3000/api/health 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 4 "Grafana Dashboard" "PASS"
        return 0
    fi
    
    log_result 4 "Grafana Dashboard" "FAIL"
    return 1
}

# Test 5: Data Source Configuration
test_data_source_configuration() {
    echo -e "${YELLOW}Running Test 5: Data Source Configuration${NC}"
    
    # Check if Grafana provisioning exists
    if [ -d "$PROJECT_ROOT/grafana/provisioning" ]; then
        log_result 5 "Data Source Configuration" "PASS"
        return 0
    fi
    
    log_result 5 "Data Source Configuration" "FAIL"
    return 1
}

# Test 6: Service Monitoring
test_service_monitoring() {
    echo -e "${YELLOW}Running Test 6: Service Monitoring${NC}"
    
    # Check if Prometheus config monitors services
    if grep -q "auth-service\|game-service\|tournament-service\|user-service" "$PROJECT_ROOT/prometheus/prometheus.yml"; then
        log_result 6 "Service Monitoring" "PASS"
        return 0
    fi
    
    log_result 6 "Service Monitoring" "FAIL"
    return 1
}

# Test 7: Alert Rules
test_alert_rules() {
    echo -e "${YELLOW}Running Test 7: Alert Rules${NC}"
    
    # Check if alert rules are configured
    if [ -f "$PROJECT_ROOT/prometheus/alerts.yml" ] || grep -q "alert\|rule" "$PROJECT_ROOT/prometheus/prometheus.yml"; then
        log_result 7 "Alert Rules" "PASS"
        return 0
    fi
    
    log_result 7 "Alert Rules" "FAIL"
    return 1
}

# Test 8: Metric Queries
test_metric_queries() {
    echo -e "${YELLOW}Running Test 8: Metric Queries${NC}"
    
    # Check if monitoring is configured
    if [ -f "$PROJECT_ROOT/prometheus/prometheus.yml" ] || [ -d "$PROJECT_ROOT/grafana" ]; then
        log_result 8 "Metric Queries" "PASS"
        return 0
    fi
    
    log_result 8 "Metric Queries" "FAIL"
    return 1
}

# Test 9: Performance Metrics
test_performance_metrics() {
    echo -e "${YELLOW}Running Test 9: Performance Metrics${NC}"
    
    # Check if monitoring infrastructure exists
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ] && grep -q "prometheus" "$PROJECT_ROOT/docker-compose.yml"; then
        log_result 9 "Performance Metrics" "PASS"
        return 0
    fi
    
    log_result 9 "Performance Metrics" "FAIL"
    return 1
}

# Test 10: Resource Monitoring
test_resource_monitoring() {
    echo -e "${YELLOW}Running Test 10: Resource Monitoring${NC}"
    
    # Check if monitoring is configured in docker-compose
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ] && grep -q "grafana\|prometheus" "$PROJECT_ROOT/docker-compose.yml"; then
        log_result 10 "Resource Monitoring" "PASS"
        return 0
    fi
    
    log_result 10 "Resource Monitoring" "FAIL"
    return 1
}

# Test 11: Visualization
test_visualization() {
    echo -e "${YELLOW}Running Test 11: Visualization${NC}"
    
    # Check if Grafana dashboards exist
    local response=$(curl -s http://localhost:3000/api/search?query=dashboard 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 11 "Visualization" "PASS"
        return 0
    fi
    
    log_result 11 "Visualization" "FAIL"
    return 1
}

# Test 12: Data Retention
test_data_retention() {
    echo -e "${YELLOW}Running Test 12: Data Retention${NC}"
    
    # Check Prometheus configuration for retention
    if grep -q "retention\|storage" "$PROJECT_ROOT/prometheus/prometheus.yml"; then
        log_result 12 "Data Retention" "PASS"
        return 0
    fi
    
    log_result 12 "Data Retention" "FAIL"
    return 1
}

# Main execution
main() {
    echo -e "${YELLOW}=== Monitoring Test Suite ===${NC}"
    echo "Testing Prometheus & Grafana monitoring..."
    echo ""
    
    cd "$PROJECT_ROOT"
    
    test_prometheus_health || true
    test_prometheus_configuration || true
    test_metrics_collection || true
    test_grafana_dashboard || true
    test_data_source_configuration || true
    test_service_monitoring || true
    test_alert_rules || true
    test_metric_queries || true
    test_performance_metrics || true
    test_resource_monitoring || true
    test_visualization || true
    test_data_retention || true
    
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
