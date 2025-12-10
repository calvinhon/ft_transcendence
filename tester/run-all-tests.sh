#!/bin/bash

# Master Test Runner
# Executes all 12 module test suites
# Date: December 5, 2025

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MASTER_RESULTS="$SCRIPT_DIR/MASTER_TEST_RESULTS.txt"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Initialize master results file
echo "╔════════════════════════════════════════════════════════════╗" > "$MASTER_RESULTS"
echo "║          MASTER TEST SUITE RESULTS                         ║" >> "$MASTER_RESULTS"
echo "╚════════════════════════════════════════════════════════════╝" >> "$MASTER_RESULTS"
echo "" >> "$MASTER_RESULTS"
echo "Date: $(date)" >> "$MASTER_RESULTS"
echo "Project: FT_Transcendence" >> "$MASTER_RESULTS"
echo "" >> "$MASTER_RESULTS"

# Test tracking
TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0
declare -a TEST_RESULTS

run_test_module() {
    local test_name=$1
    local test_script=$2
    local test_file="${SCRIPT_DIR}/${test_script}"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Running: $test_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ -f "$test_file" ]; then
        # Make script executable
        chmod +x "$test_file"
        
        # Run the test
        if bash "$test_file" 2>&1; then
            echo -e "${GREEN}✓ $test_name PASSED${NC}"
            TEST_RESULTS+=("PASS: $test_name")
            echo "" >> "$MASTER_RESULTS"
            echo "✓ PASSED: $test_name" >> "$MASTER_RESULTS"
        else
            echo -e "${RED}✗ $test_name FAILED${NC}"
            TEST_RESULTS+=("FAIL: $test_name")
            echo "" >> "$MASTER_RESULTS"
            echo "✗ FAILED: $test_name" >> "$MASTER_RESULTS"
        fi
    else
        echo -e "${RED}✗ Test script not found: $test_file${NC}"
        TEST_RESULTS+=("MISSING: $test_name")
        echo "" >> "$MASTER_RESULTS"
        echo "✗ MISSING: $test_name" >> "$MASTER_RESULTS"
    fi
    
    echo ""
}

main() {
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║        FT_TRANSCENDENCE - COMPREHENSIVE TEST SUITE         ║${NC}"
    echo -e "${YELLOW}║              15 Modules, 180 Total Tests                   ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Core Modules (60 points)
    echo -e "${YELLOW}=== TESTING CORE MODULES (60 Points) ===${NC}"
    run_test_module "Backend Framework (Fastify)" "test-backend-framework.sh"
    run_test_module "Database (SQLite)" "test-database.sh"
    run_test_module "Blockchain (Solidity/Hardhat)" "test-blockchain.sh"
    run_test_module "AI Opponent" "test-ai-opponent.sh"
    run_test_module "Stats Dashboards" "test-stats-dashboards.sh"
    run_test_module "Microservices Architecture" "test-microservices.sh"
    run_test_module "Server-Side Pong" "test-server-side-pong.sh"
    
    # Advanced Modules (65 points)
    echo -e "${YELLOW}=== TESTING ADVANCED MODULES (65 Points) ===${NC}"
    run_test_module "OAuth/SSO" "test-oauth-sso.sh"
    run_test_module "WAF & Vault" "test-waf-vault.sh"
    run_test_module "ELK Logging" "test-elk-logging.sh"
    run_test_module "Monitoring (Prometheus/Grafana)" "test-monitoring.sh"
    run_test_module "GDPR Compliance" "test-gdpr-compliance.sh"
    run_test_module "CLI Pong Client" "test-cli-client.sh"
    run_test_module "2FA/TOTP" "test-2fa.sh"
    run_test_module "SSR Integration" "test-ssr.sh"
    
    # Print summary
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║                    TEST EXECUTION SUMMARY                  ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Count results
    local pass_count=0
    local fail_count=0
    local missing_count=0
    
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $result == PASS:* ]]; then
            ((pass_count++))
        elif [[ $result == FAIL:* ]]; then
            ((fail_count++))
        elif [[ $result == MISSING:* ]]; then
            ((missing_count++))
        fi
    done
    
    echo -e "${GREEN}Passed:${NC}  $pass_count"
    echo -e "${RED}Failed:${NC}  $fail_count"
    if [ "$missing_count" -gt 0 ]; then
        echo -e "${YELLOW}Missing:${NC} $missing_count"
    fi
    echo -e "Total:${NC}   $((pass_count + fail_count + missing_count))"
    echo ""
    
    # Detailed results
    echo -e "${YELLOW}=== DETAILED RESULTS ===${NC}"
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $result == PASS:* ]]; then
            echo -e "${GREEN}✓ ${result#PASS: }${NC}"
        elif [[ $result == FAIL:* ]]; then
            echo -e "${RED}✗ ${result#FAIL: }${NC}"
        else
            echo -e "${YELLOW}⚠ ${result#MISSING: }${NC}"
        fi
    done
    echo ""
    
    # Success/Failure determination
    if [ "$fail_count" -eq 0 ] && [ "$missing_count" -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                   ALL TESTS PASSED! ✓                      ║${NC}"
        echo -e "${GREEN}║              12/12 Modules - 100% Complete                 ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
        EXIT_CODE=0
    else
        echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║                  SOME TESTS FAILED ✗                       ║${NC}"
        echo -e "${RED}║    Please review logs and fix failing modules               ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
        EXIT_CODE=1
    fi
    
    echo ""
    echo -e "${YELLOW}Results saved to: $MASTER_RESULTS${NC}"
    echo ""
    
    # Append summary to master results file
    echo "" >> "$MASTER_RESULTS"
    echo "════════════════════════════════════════════════════════════" >> "$MASTER_RESULTS"
    echo "SUMMARY" >> "$MASTER_RESULTS"
    echo "════════════════════════════════════════════════════════════" >> "$MASTER_RESULTS"
    echo "Passed:  $pass_count" >> "$MASTER_RESULTS"
    echo "Failed:  $fail_count" >> "$MASTER_RESULTS"
    if [ "$missing_count" -gt 0 ]; then
        echo "Missing: $missing_count" >> "$MASTER_RESULTS"
    fi
    echo "Total:   $((pass_count + fail_count + missing_count))" >> "$MASTER_RESULTS"
    echo "" >> "$MASTER_RESULTS"
    
    if [ "$EXIT_CODE" -eq 0 ]; then
        echo "Status: ALL TESTS PASSED ✓" >> "$MASTER_RESULTS"
    else
        echo "Status: SOME TESTS FAILED ✗" >> "$MASTER_RESULTS"
    fi
    
    echo "Generated: $(date)" >> "$MASTER_RESULTS"
    
    exit $EXIT_CODE
}

main "$@"
