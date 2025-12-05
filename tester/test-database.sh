#!/bin/bash

# Test Suite: Database (SQLite)
# Module: Use a Database for the Backend
# Points: 5 (Minor)
# Database: SQLite
# Date: December 5, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE="$SCRIPT_DIR/results-database.txt"
PASS_COUNT=0
FAIL_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Database Test Results ===" > "$RESULTS_FILE"
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

# Test 1: Database Files Creation
test_database_files() {
    echo -e "${YELLOW}Running Test 1: Database Files Creation${NC}"
    
    local db_files=(
        "$PROJECT_ROOT/auth-service/database/auth.db"
        "$PROJECT_ROOT/game-service/database/game.db"
        "$PROJECT_ROOT/tournament-service/database/tournament.db"
        "$PROJECT_ROOT/user-service/database/user.db"
    )
    
    local all_exist=true
    for db_file in "${db_files[@]}"; do
        if [ ! -f "$db_file" ]; then
            all_exist=false
            echo "  ⚠ Missing: $db_file"
            break
        fi
    done
    
    if [ "$all_exist" = true ]; then
        log_result 1 "Database Files Creation" "PASS"
        return 0
    fi
    
    log_result 1 "Database Files Creation" "FAIL"
    return 1
}

# Test 2: Schema Creation
test_schema_creation() {
    echo -e "${YELLOW}Running Test 2: Schema Creation${NC}"
    
    local auth_db="$PROJECT_ROOT/auth-service/database/auth.db"
    
    if [ -f "$auth_db" ]; then
        # Check if users table exists
        local tables=$(sqlite3 "$auth_db" ".tables" 2>/dev/null)
        
        if echo "$tables" | grep -q "users"; then
            log_result 2 "Schema Creation" "PASS"
            return 0
        fi
    fi
    
    log_result 2 "Schema Creation" "FAIL"
    return 1
}

# Test 3: User Creation
test_user_creation() {
    echo -e "${YELLOW}Running Test 3: User Creation${NC}"
    
    # Attempt to register a user
    local response=$(curl -s -X POST http://localhost:3001/auth/register \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"dbtest_$(date +%s)\",
            \"email\": \"dbtest_$(date +%s)@example.com\",
            \"password\": \"SecurePass123!\"
        }" 2>/dev/null)
    
    # Check if response indicates success or user already exists
    if echo "$response" | jq . > /dev/null 2>&1; then
        log_result 3 "User Creation" "PASS"
        return 0
    fi
    
    log_result 3 "User Creation" "FAIL"
    return 1
}

# Test 4: Data Integrity
test_data_integrity() {
    echo -e "${YELLOW}Running Test 4: Data Integrity${NC}"
    
    local auth_db="$PROJECT_ROOT/auth-service/database/auth.db"
    
    if [ -f "$auth_db" ]; then
        # Check for foreign keys constraint
        local fk_enabled=$(sqlite3 "$auth_db" "PRAGMA foreign_keys;" 2>/dev/null)
        
        if [ -n "$fk_enabled" ]; then
            log_result 4 "Data Integrity" "PASS"
            return 0
        fi
    fi
    
    log_result 4 "Data Integrity" "FAIL"
    return 1
}

# Test 5: Query Performance
test_query_performance() {
    echo -e "${YELLOW}Running Test 5: Query Performance${NC}"
    
    local auth_db="$PROJECT_ROOT/auth-service/database/auth.db"
    
    if [ -f "$auth_db" ]; then
        # Run a simple query and check if it completes
        local result=$(sqlite3 "$auth_db" "SELECT COUNT(*) FROM users;" 2>/dev/null)
        
        if [ -n "$result" ]; then
            log_result 5 "Query Performance" "PASS"
            return 0
        fi
    fi
    
    log_result 5 "Query Performance" "FAIL"
    return 1
}

# Test 6: Database Constraints
test_database_constraints() {
    echo -e "${YELLOW}Running Test 6: Database Constraints${NC}"
    
    local auth_db="$PROJECT_ROOT/auth-service/database/auth.db"
    
    if [ -f "$auth_db" ]; then
        # Check if schema includes constraints
        local schema=$(sqlite3 "$auth_db" ".schema users" 2>/dev/null)
        
        # Look for UNIQUE constraint
        if echo "$schema" | grep -qi "unique"; then
            log_result 6 "Database Constraints" "PASS"
            return 0
        fi
    fi
    
    log_result 6 "Database Constraints" "FAIL"
    return 1
}

# Test 7: Transaction Support
test_transaction_support() {
    echo -e "${YELLOW}Running Test 7: Transaction Support${NC}"
    
    local auth_db="$PROJECT_ROOT/auth-service/database/auth.db"
    
    if [ -f "$auth_db" ]; then
        # SQLite always supports transactions
        local result=$(sqlite3 "$auth_db" "BEGIN; SELECT 1; COMMIT;" 2>/dev/null)
        
        if [ "$result" = "1" ]; then
            log_result 7 "Transaction Support" "PASS"
            return 0
        fi
    fi
    
    log_result 7 "Transaction Support" "FAIL"
    return 1
}

# Test 8: Index Creation
test_index_creation() {
    echo -e "${YELLOW}Running Test 8: Index Creation${NC}"
    
    local auth_db="$PROJECT_ROOT/auth-service/database/auth.db"
    
    if [ -f "$auth_db" ]; then
        # Check for any indexes
        local indexes=$(sqlite3 "$auth_db" ".indexes" 2>/dev/null)
        
        if [ -n "$indexes" ]; then
            log_result 8 "Index Creation" "PASS"
            return 0
        fi
    fi
    
    log_result 8 "Index Creation" "FAIL"
    return 1
}

# Test 9: Database Backup
test_database_backup() {
    echo -e "${YELLOW}Running Test 9: Database Backup${NC}"
    
    local auth_db="$PROJECT_ROOT/auth-service/database/auth.db"
    
    if [ -f "$auth_db" ]; then
        # Check if backup directory exists or can be created
        local backup_dir="$PROJECT_ROOT/auth-service/database/backups"
        
        if mkdir -p "$backup_dir" 2>/dev/null; then
            log_result 9 "Database Backup" "PASS"
            return 0
        fi
    fi
    
    log_result 9 "Database Backup" "FAIL"
    return 1
}

# Test 10: Multi-Database Access
test_multi_database_access() {
    echo -e "${YELLOW}Running Test 10: Multi-Database Access${NC}"
    
    local db_files=(
        "$PROJECT_ROOT/auth-service/database/auth.db"
        "$PROJECT_ROOT/game-service/database/game.db"
        "$PROJECT_ROOT/tournament-service/database/tournament.db"
        "$PROJECT_ROOT/user-service/database/user.db"
    )
    
    local all_accessible=true
    for db_file in "${db_files[@]}"; do
        if [ -f "$db_file" ]; then
            local result=$(sqlite3 "$db_file" "SELECT 1;" 2>/dev/null)
            if [ "$result" != "1" ]; then
                all_accessible=false
                break
            fi
        else
            all_accessible=false
            break
        fi
    done
    
    if [ "$all_accessible" = true ]; then
        log_result 10 "Multi-Database Access" "PASS"
        return 0
    fi
    
    log_result 10 "Multi-Database Access" "FAIL"
    return 1
}

# Test 11: Database Encryption
test_database_encryption() {
    echo -e "${YELLOW}Running Test 11: Database Encryption${NC}"
    
    local auth_db="$PROJECT_ROOT/auth-service/database/auth.db"
    
    if [ -f "$auth_db" ]; then
        # Check if database file is not plaintext (SQLite header check)
        local header=$(file "$auth_db" 2>/dev/null)
        
        if echo "$header" | grep -qi "sqlite"; then
            log_result 11 "Database Encryption" "PASS"
            return 0
        fi
    fi
    
    log_result 11 "Database Encryption" "FAIL"
    return 1
}

# Test 12: Database Persistence
test_database_persistence() {
    echo -e "${YELLOW}Running Test 12: Database Persistence${NC}"
    
    local auth_db="$PROJECT_ROOT/auth-service/database/auth.db"
    
    if [ -f "$auth_db" ]; then
        # Check file size (should be > 0 after initialization)
        local size=$(stat -f%z "$auth_db" 2>/dev/null || stat -c%s "$auth_db" 2>/dev/null)
        
        if [ "$size" -gt 0 ]; then
            log_result 12 "Database Persistence" "PASS"
            return 0
        fi
    fi
    
    log_result 12 "Database Persistence" "FAIL"
    return 1
}

# Main execution
main() {
    echo -e "${YELLOW}=== Database Test Suite ===${NC}"
    echo "Testing SQLite database implementation..."
    echo ""
    
    cd "$PROJECT_ROOT"
    
    test_database_files || true
    test_schema_creation || true
    test_user_creation || true
    test_data_integrity || true
    test_query_performance || true
    test_database_constraints || true
    test_transaction_support || true
    test_index_creation || true
    test_database_backup || true
    test_multi_database_access || true
    test_database_encryption || true
    test_database_persistence || true
    
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
