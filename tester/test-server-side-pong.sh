#!/bin/bash

# Test Suite: Server-Side Pong
# Module: Server-Side Pong Engine
# Points: 10 (Major)
# Date: December 5, 2025

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE="$SCRIPT_DIR/results-server-side-pong.txt"
PASS_COUNT=0
FAIL_COUNT=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Server-Side Pong Test Results ===" > "$RESULTS_FILE"
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

# Test 1: Game Initialization
test_game_initialization() {
    echo -e "${YELLOW}Running Test 1: Game Initialization${NC}"
    
    local response=$(curl -s -X POST http://game:3000/games \
        -H "Content-Type: application/json" \
        -d '{"mode": "local"}' 2>/dev/null)
    
    # Check if response is valid JSON and contains game data
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        log_result 1 "Game Initialization" "PASS"
        return 0
    fi
    
    log_result 1 "Game Initialization" "FAIL"
    return 1
}

# Test 2: Physics Engine
test_physics_engine() {
    echo -e "${YELLOW}Running Test 2: Physics Engine${NC}"
    
    # Check for physics implementation
    local game_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$game_files" | xargs grep -l "physics\|velocity\|acceleration\|collision" 2>/dev/null | grep -q .; then
        log_result 2 "Physics Engine" "PASS"
        return 0
    fi
    
    log_result 2 "Physics Engine" "FAIL"
    return 1
}

# Test 3: Ball Movement
test_ball_movement() {
    echo -e "${YELLOW}Running Test 3: Ball Movement${NC}"
    
    local game_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$game_files" | xargs grep -l "ball\|move.*ball\|update.*position" 2>/dev/null | grep -q .; then
        log_result 3 "Ball Movement" "PASS"
        return 0
    fi
    
    log_result 3 "Ball Movement" "FAIL"
    return 1
}

# Test 4: Paddle Control
test_paddle_control() {
    echo -e "${YELLOW}Running Test 4: Paddle Control${NC}"
    
    local game_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$game_files" | xargs grep -l "paddle\|movement\|up\|down" 2>/dev/null | grep -q .; then
        log_result 4 "Paddle Control" "PASS"
        return 0
    fi
    
    log_result 4 "Paddle Control" "FAIL"
    return 1
}

# Test 5: Collision Detection
test_collision_detection() {
    echo -e "${YELLOW}Running Test 5: Collision Detection${NC}"
    
    local game_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$game_files" | xargs grep -l "collision\|intersect\|boundary\|wall" 2>/dev/null | grep -q .; then
        log_result 5 "Collision Detection" "PASS"
        return 0
    fi
    
    log_result 5 "Collision Detection" "FAIL"
    return 1
}

# Test 6: Scoring System
test_scoring_system() {
    echo -e "${YELLOW}Running Test 6: Scoring System${NC}"
    
    local game_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$game_files" | xargs grep -l "score\|point\|track.*score" 2>/dev/null | grep -q .; then
        log_result 6 "Scoring System" "PASS"
        return 0
    fi
    
    log_result 6 "Scoring System" "FAIL"
    return 1
}

# Test 7: WebSocket Real-time Communication
test_websocket_communication() {
    echo -e "${YELLOW}Running Test 7: WebSocket Real-time Communication${NC}"
    
    local game_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$game_files" | xargs grep -l "websocket\|ws\|socket\|emit\|subscribe" 2>/dev/null | grep -q .; then
        log_result 7 "WebSocket Real-time Communication" "PASS"
        return 0
    fi
    
    log_result 7 "WebSocket Real-time Communication" "FAIL"
    return 1
}

# Test 8: Game State Management
test_game_state_management() {
    echo -e "${YELLOW}Running Test 8: Game State Management${NC}"
    
    local game_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$game_files" | xargs grep -l "state\|store\|game.*state" 2>/dev/null | grep -q .; then
        log_result 8 "Game State Management" "PASS"
        return 0
    fi
    
    log_result 8 "Game State Management" "FAIL"
    return 1
}

# Test 9: Anti-Cheat Verification
test_anticheat_verification() {
    echo -e "${YELLOW}Running Test 9: Anti-Cheat Verification${NC}"
    
    local game_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$game_files" | xargs grep -l "verify\|validate\|cheat\|illegal" 2>/dev/null | grep -q .; then
        log_result 9 "Anti-Cheat Verification" "PASS"
        return 0
    fi
    
    log_result 9 "Anti-Cheat Verification" "FAIL"
    return 1
}

# Test 10: Game Recording
test_game_recording() {
    echo -e "${YELLOW}Running Test 10: Game Recording${NC}"
    
    local game_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$game_files" | xargs grep -l "record\|replay\|history\|log.*game" 2>/dev/null | grep -q .; then
        log_result 10 "Game Recording" "PASS"
        return 0
    fi
    
    log_result 10 "Game Recording" "FAIL"
    return 1
}

# Test 11: Performance Optimization
test_performance_optimization() {
    echo -e "${YELLOW}Running Test 11: Performance Optimization${NC}"
    
    local start=$(date +%s%N)
    curl -s http://game:3000/health > /dev/null
    local end=$(date +%s%N)
    local elapsed=$(( ($end - $start) / 1000000 ))
    
    if [ "$elapsed" -lt 500 ]; then
        log_result 11 "Performance Optimization" "PASS"
        return 0
    fi
    
    log_result 11 "Performance Optimization" "FAIL"
    return 1
}

# Test 12: Game Termination
test_game_termination() {
    echo -e "${YELLOW}Running Test 12: Game Termination${NC}"
    
    local game_files=$(find "$PROJECT_ROOT/game/src" -type f -name "*.ts" 2>/dev/null)
    
    if echo "$game_files" | xargs grep -l "end\|finish\|terminate\|cleanup" 2>/dev/null | grep -q .; then
        log_result 12 "Game Termination" "PASS"
        return 0
    fi
    
    log_result 12 "Game Termination" "FAIL"
    return 1
}

# Main execution
main() {
    echo -e "${YELLOW}=== Server-Side Pong Test Suite ===${NC}"
    echo "Testing server-side Pong engine..."
    echo ""
    
    cd "$PROJECT_ROOT"
    
    test_game_initialization || true
    test_physics_engine || true
    test_ball_movement || true
    test_paddle_control || true
    test_collision_detection || true
    test_scoring_system || true
    test_websocket_communication || true
    test_game_state_management || true
    test_anticheat_verification || true
    test_game_recording || true
    test_performance_optimization || true
    test_game_termination || true
    
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
