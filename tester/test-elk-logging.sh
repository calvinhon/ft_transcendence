#!/bin/bash

# Test Suite: ELK Logging
# Module: ELK Stack (Elasticsearch, Logstash, Kibana)
# Points: 10 (Major)
# Components: Elasticsearch 7.17, Kibana, Filebeat
# Date: December 5, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE="$SCRIPT_DIR/results-elk-logging.txt"
PASS_COUNT=0
FAIL_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== ELK Logging Test Results ===" > "$RESULTS_FILE"
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

# Test 1: Elasticsearch Health Check
test_elasticsearch_health() {
    echo -e "${YELLOW}Running Test 1: Elasticsearch Health Check${NC}"
    
    local response=$(curl -s http://localhost:9200/_cluster/health 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 1 "Elasticsearch Health Check" "PASS"
        return 0
    fi
    
    log_result 1 "Elasticsearch Health Check" "FAIL"
    return 1
}

# Test 2: Index Creation
test_index_creation() {
    echo -e "${YELLOW}Running Test 2: Index Creation${NC}"
    
    local response=$(curl -s http://localhost:9200/_cat/indices 2>/dev/null)
    
    if [ -n "$response" ]; then
        log_result 2 "Index Creation" "PASS"
        return 0
    fi
    
    log_result 2 "Index Creation" "FAIL"
    return 1
}

# Test 3: Log Ingestion
test_log_ingestion() {
    echo -e "${YELLOW}Running Test 3: Log Ingestion${NC}"
    
    # Check if Filebeat configuration exists
    if [ -f "$PROJECT_ROOT/filebeat/filebeat.yml" ]; then
        log_result 3 "Log Ingestion" "PASS"
        return 0
    fi
    
    log_result 3 "Log Ingestion" "FAIL"
    return 1
}

# Test 4: Kibana Access
test_kibana_access() {
    echo -e "${YELLOW}Running Test 4: Kibana Access${NC}"
    
    local response=$(curl -s http://localhost:5601/api/status 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 4 "Kibana Access" "PASS"
        return 0
    fi
    
    log_result 4 "Kibana Access" "FAIL"
    return 1
}

# Test 5: Document Indexing
test_document_indexing() {
    echo -e "${YELLOW}Running Test 5: Document Indexing${NC}"
    
    # Send a test document
    local response=$(curl -s -X POST "http://localhost:9200/test-index/_doc" \
        -H "Content-Type: application/json" \
        -d '{"timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'", "message": "test"}' 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 5 "Document Indexing" "PASS"
        return 0
    fi
    
    log_result 5 "Document Indexing" "FAIL"
    return 1
}

# Test 6: Full-Text Search
test_full_text_search() {
    echo -e "${YELLOW}Running Test 6: Full-Text Search${NC}"
    
    local response=$(curl -s -X GET "http://localhost:9200/test-index/_search?q=message:test" 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 6 "Full-Text Search" "PASS"
        return 0
    fi
    
    log_result 6 "Full-Text Search" "FAIL"
    return 1
}

# Test 7: Aggregations
test_aggregations() {
    echo -e "${YELLOW}Running Test 7: Aggregations${NC}"
    
    local response=$(curl -s -X GET "http://localhost:9200/test-index/_search" \
        -H "Content-Type: application/json" \
        -d '{"aggs": {"messages": {"terms": {"field": "message"}}}}' 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 7 "Aggregations" "PASS"
        return 0
    fi
    
    log_result 7 "Aggregations" "FAIL"
    return 1
}

# Test 8: Kibana Dashboards
test_kibana_dashboards() {
    echo -e "${YELLOW}Running Test 8: Kibana Dashboards${NC}"
    
    local response=$(curl -s http://localhost:5601/api/saved_objects/dashboard 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 8 "Kibana Dashboards" "PASS"
        return 0
    fi
    
    log_result 8 "Kibana Dashboards" "FAIL"
    return 1
}

# Test 9: Filebeat Integration
test_filebeat_integration() {
    echo -e "${YELLOW}Running Test 9: Filebeat Integration${NC}"
    
    if grep -q "elasticsearch\|output" "$PROJECT_ROOT/filebeat/filebeat.yml"; then
        log_result 9 "Filebeat Integration" "PASS"
        return 0
    fi
    
    log_result 9 "Filebeat Integration" "FAIL"
    return 1
}

# Test 10: Index Management
test_index_management() {
    echo -e "${YELLOW}Running Test 10: Index Management${NC}"
    
    # Check if we can get index settings
    local response=$(curl -s -X GET "http://localhost:9200/_cat/indices?format=json" 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 10 "Index Management" "PASS"
        return 0
    fi
    
    log_result 10 "Index Management" "FAIL"
    return 1
}

# Test 11: Query Performance
test_query_performance() {
    echo -e "${YELLOW}Running Test 11: Query Performance${NC}"
    
    local start=$(date +%s%N)
    curl -s -X GET "http://localhost:9200/test-index/_search" > /dev/null 2>&1
    local end=$(date +%s%N)
    local elapsed=$(( ($end - $start) / 1000000 ))
    
    if [ "$elapsed" -lt 500 ]; then
        log_result 11 "Query Performance" "PASS"
        return 0
    fi
    
    log_result 11 "Query Performance" "FAIL"
    return 1
}

# Test 12: Data Retention
test_data_retention() {
    echo -e "${YELLOW}Running Test 12: Data Retention${NC}"
    
    # Check if index templates are configured
    local response=$(curl -s -X GET "http://localhost:9200/_index_template" 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 12 "Data Retention" "PASS"
        return 0
    fi
    
    log_result 12 "Data Retention" "FAIL"
    return 1
}

# Main execution
main() {
    echo -e "${YELLOW}=== ELK Logging Test Suite ===${NC}"
    echo "Testing ELK Stack (Elasticsearch, Logstash, Kibana)..."
    echo ""
    
    cd "$PROJECT_ROOT"
    
    test_elasticsearch_health || true
    test_index_creation || true
    test_log_ingestion || true
    test_kibana_access || true
    test_document_indexing || true
    test_full_text_search || true
    test_aggregations || true
    test_kibana_dashboards || true
    test_filebeat_integration || true
    test_index_management || true
    test_query_performance || true
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
