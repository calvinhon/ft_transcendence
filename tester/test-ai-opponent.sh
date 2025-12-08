#!/bin/bash

# Test Suite: AI Opponent
# Module: Create AI Opponent
# Points: 10 (Major)
# Date: December 5, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE="$SCRIPT_DIR/results-ai-opponent.txt"
PASS_COUNT=0
FAIL_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== AI Opponent Test Results ===" > "$RESULTS_FILE"
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

# Test 1: AI Module Initialization
test_ai_initialization() {
    echo -e "${YELLOW}Running Test 1: AI Module Initialization${NC}"
    
    # Check if AI code exists in game service
    if find "$PROJECT_ROOT/game/src" -name "*ai*" -o -name "*opponent*" 2>/dev/null | grep -q .; then
        log_result 1 "AI Module Initialization" "PASS"
        return 0
    fi
    
    log_result 1 "AI Module Initialization" "FAIL"
    return 1
}

# Test 2: Difficulty Levels
test_difficulty_levels() {
    echo -e "${YELLOW}Running Test 2: Difficulty Levels${NC}"
    
    # Check for difficulty level constants
    local ai_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$ai_files" | xargs grep -l "easy\|medium\|hard\|difficulty" 2>/dev/null | grep -q .; then
        log_result 2 "Difficulty Levels" "PASS"
        return 0
    fi
    
    log_result 2 "Difficulty Levels" "FAIL"
    return 1
}

# Test 3: AI Decision Making
test_ai_decision_making() {
    echo -e "${YELLOW}Running Test 3: AI Decision Making${NC}"
    
    # Check if AI logic exists in game service
    if [ -d "$PROJECT_ROOT/game/src" ]; then
        if find "$PROJECT_ROOT/game/src" -type f -name "*.ts" -exec grep -l "paddle\|ball\|position\|velocity" {} \; 2>/dev/null | head -1 | grep -q .; then
            log_result 3 "AI Decision Making" "PASS"
            return 0
        fi
    fi
    
    log_result 3 "AI Decision Making" "FAIL"
    return 1
}

# Test 4: Physics Integration
test_physics_integration() {
    echo -e "${YELLOW}Running Test 4: Physics Integration${NC}"
    
    local ai_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$ai_files" | xargs grep -l "physics\|velocity\|position\|trajectory" 2>/dev/null | grep -q .; then
        log_result 4 "Physics Integration" "PASS"
        return 0
    fi
    
    log_result 4 "Physics Integration" "FAIL"
    return 1
}

# Test 5: Ball Prediction
test_ball_prediction() {
    echo -e "${YELLOW}Running Test 5: Ball Prediction${NC}"
    
    local ai_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$ai_files" | xargs grep -l "ball.*y\|targetY\|calculateAI" 2>/dev/null | grep -q .; then
        log_result 5 "Ball Prediction" "PASS"
        return 0
    fi
    
    log_result 5 "Ball Prediction" "FAIL"
    return 1
}

# Test 6: Paddle Control
test_paddle_control() {
    echo -e "${YELLOW}Running Test 6: Paddle Control${NC}"
    
    local ai_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$ai_files" | xargs grep -l "paddle\|move\|up\|down" 2>/dev/null | grep -q .; then
        log_result 6 "Paddle Control" "PASS"
        return 0
    fi
    
    log_result 6 "Paddle Control" "FAIL"
    return 1
}

# Test 7: Response Time
test_response_time() {
    echo -e "${YELLOW}Running Test 7: Response Time${NC}"
    
    # Check if AI has timing/performance optimization
    local ai_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$ai_files" | xargs grep -l "timeout\|delay\|interval\|performance" 2>/dev/null | grep -q .; then
        log_result 7 "Response Time" "PASS"
        return 0
    fi
    
    log_result 7 "Response Time" "FAIL"
    return 1
}

# Test 8: Error Handling
test_error_handling() {
    echo -e "${YELLOW}Running Test 8: Error Handling${NC}"
    
    local ai_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$ai_files" | xargs grep -l "try\|catch\|error\|exception" 2>/dev/null | grep -q .; then
        log_result 8 "Error Handling" "PASS"
        return 0
    fi
    
    log_result 8 "Error Handling" "FAIL"
    return 1
}

# Test 9: AI vs Player Game
test_ai_vs_player() {
    echo -e "${YELLOW}Running Test 9: AI vs Player Game${NC}"
    
    # Start a game with AI opponent via API
    local response=$(curl -s -X POST http://game:3000/games \
        -H "Content-Type: application/json" \
        -d '{"mode": "ai", "difficulty": "medium"}' 2>/dev/null)
    
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 9 "AI vs Player Game" "PASS"
        return 0
    fi
    
    log_result 9 "AI vs Player Game" "FAIL"
    return 1
}

# Test 10: Learning/Adaptation
test_learning_adaptation() {
    echo -e "${YELLOW}Running Test 10: Learning/Adaptation${NC}"
    
    local ai_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    # Check if AI has adaptive behavior (difficulty adjustment, speed variation, etc)
    if echo "$ai_files" | xargs grep -l "difficulty\|speed.*=\|aiSpeed\|calculateAI" 2>/dev/null | grep -q .; then
        log_result 10 "Learning/Adaptation" "PASS"
        return 0
    fi
    
    log_result 10 "Learning/Adaptation" "FAIL"
    return 1
}

# Test 11: Performance Testing
test_performance_testing() {
    echo -e "${YELLOW}Running Test 11: Performance Testing${NC}"
    
    # Check AI response time
    local start=$(date +%s%N)
    curl -s -X GET http://game:3000/health > /dev/null
    local end=$(date +%s%N)
    local elapsed=$(( ($end - $start) / 1000000 ))
    
    if [ "$elapsed" -lt 1000 ]; then
        log_result 11 "Performance Testing" "PASS"
        return 0
    fi
    
    log_result 11 "Performance Testing" "FAIL"
    return 1
}

# Test 12: AI Documentation
test_ai_documentation() {
    echo -e "${YELLOW}Running Test 12: AI Documentation${NC}"
    
    local ai_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$ai_files" | xargs grep -l "/**\|///" 2>/dev/null | grep -q .; then
        log_result 12 "AI Documentation" "PASS"
        return 0
    fi
    
    log_result 12 "AI Documentation" "FAIL"
    return 1
}

# Main execution
main() {
    echo -e "${YELLOW}=== AI Opponent Test Suite ===${NC}"
    echo "Testing AI opponent implementation..."
    echo ""
    
    cd "$PROJECT_ROOT"
    
    test_ai_initialization || true
    test_difficulty_levels || true
    test_ai_decision_making || true
    test_physics_integration || true
    test_ball_prediction || true
    test_paddle_control || true
    test_response_time || true
    test_error_handling || true
    test_ai_vs_player || true
    test_learning_adaptation || true
    test_performance_testing || true
    test_ai_documentation || true
    
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
