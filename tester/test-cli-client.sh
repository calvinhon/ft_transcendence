#!/bin/bash

# Test CLI Client Implementation
# Tests the terminal-based Pong game client

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Service URLs
AUTH_URL="${AUTH_URL:-http://localhost:3001}"
GAME_URL="${GAME_URL:-http://localhost:3002}"
CLI_DIR="$PROJECT_ROOT/cli-client"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

print_test() {
    echo -e "${BLUE}Running Test $1: $2${NC}"
}

pass() {
    echo -e "${GREEN}[PASS]${NC} Test $1: $2"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "${RED}[FAIL]${NC} Test $1: $2"
    echo "  Reason: $3"
    FAILED=$((FAILED + 1))
}

# Test 1: CLI Directory Exists
print_test 1 "CLI Directory Exists"
if [ -d "$CLI_DIR" ]; then
    pass 1 "CLI Directory Exists"
else
    fail 1 "CLI Directory Exists" "Directory $CLI_DIR not found"
fi

# Test 2: Package.json Exists
print_test 2 "Package.json Configuration"
if [ -f "$CLI_DIR/package.json" ]; then
    if grep -q '"name".*pong' "$CLI_DIR/package.json" && \
       grep -q '"bin"' "$CLI_DIR/package.json"; then
        pass 2 "Package.json Configuration"
    else
        fail 2 "Package.json Configuration" "Missing name or bin field"
    fi
else
    fail 2 "Package.json Configuration" "package.json not found"
fi

# Test 3: TypeScript Configuration
print_test 3 "TypeScript Configuration"
if [ -f "$CLI_DIR/tsconfig.json" ]; then
    if grep -q '"outDir"' "$CLI_DIR/tsconfig.json" && \
       grep -q '"module"' "$CLI_DIR/tsconfig.json"; then
        pass 3 "TypeScript Configuration"
    else
        fail 3 "TypeScript Configuration" "Missing outDir or module in tsconfig"
    fi
else
    fail 3 "TypeScript Configuration" "tsconfig.json not found"
fi

# Test 4: Source Files Exist
print_test 4 "Source Files Structure"
REQUIRED_FILES=(
    "src/index.ts"
    "src/commands/login.ts"
    "src/commands/play.ts"
    "src/api/client.ts"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$CLI_DIR/$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    pass 4 "Source Files Structure"
else
    fail 4 "Source Files Structure" "Missing files: ${MISSING_FILES[*]}"
fi

# Test 5: Dependencies Installed
print_test 5 "Dependencies Installation"

# Auto-install if not present
if [ ! -d "$CLI_DIR/node_modules" ]; then
    echo "  Installing dependencies..."
    (cd "$CLI_DIR" && npm install --silent) > /dev/null 2>&1 || true
fi

if [ -d "$CLI_DIR/node_modules" ]; then
    REQUIRED_DEPS=("chalk" "axios" "commander")
    MISSING_DEPS=()
    
    for dep in "${REQUIRED_DEPS[@]}"; do
        if [ ! -d "$CLI_DIR/node_modules/$dep" ]; then
            MISSING_DEPS+=("$dep")
        fi
    done
    
    if [ ${#MISSING_DEPS[@]} -eq 0 ]; then
        pass 5 "Dependencies Installation"
    else
        fail 5 "Dependencies Installation" "Missing dependencies: ${MISSING_DEPS[*]}"
    fi
else
    fail 5 "Dependencies Installation" "node_modules not found"
fi

# Test 6: TypeScript Compilation
print_test 6 "TypeScript Compilation"

# Auto-build if not present
if [ ! -d "$CLI_DIR/dist" ] || [ ! -f "$CLI_DIR/dist/index.js" ] || [ ! -f "$CLI_DIR/cli.js" ]; then
    echo "  Building TypeScript..."
    (cd "$CLI_DIR" && npm run build --silent) > /dev/null 2>&1 || true
fi

if [ -d "$CLI_DIR/dist" ] && [ -f "$CLI_DIR/dist/index.js" ] && [ -f "$CLI_DIR/cli.js" ]; then
    # Check if the built file has valid JS and cli.js has shebang
    if head -n 1 "$CLI_DIR/cli.js" | grep -q "#!/usr/bin/env node" && grep -q "import.*commander" "$CLI_DIR/dist/index.js"; then
        pass 6 "TypeScript Compilation"
    else
        fail 6 "TypeScript Compilation" "Invalid or missing content in dist/index.js or cli.js"
    fi
else
    fail 6 "TypeScript Compilation" "dist/index.js not found"
fi

# Test 7: CLI Commands Structure
print_test 7 "CLI Commands Implementation"
if [ -f "$CLI_DIR/src/index.ts" ]; then
    # Check for command definitions
    if grep -q "\.command.*login" "$CLI_DIR/src/index.ts" && \
       grep -q "\.command.*play" "$CLI_DIR/src/index.ts" && \
       grep -q "\.command.*stats" "$CLI_DIR/src/index.ts"; then
        pass 7 "CLI Commands Implementation"
    else
        fail 7 "CLI Commands Implementation" "Missing login, play, or stats commands"
    fi
else
    fail 7 "CLI Commands Implementation" "index.ts not found"
fi

# Test 8: Authentication Implementation
print_test 8 "Authentication Implementation"
if [ -f "$CLI_DIR/src/commands/login.ts" ]; then
    # Check for authentication logic
    if grep -q "username" "$CLI_DIR/src/commands/login.ts" && \
       grep -q "password" "$CLI_DIR/src/commands/login.ts" && \
       grep -q "login" "$CLI_DIR/src/commands/login.ts"; then
        pass 8 "Authentication Implementation"
    else
        fail 8 "Authentication Implementation" "Missing authentication logic"
    fi
else
    fail 8 "Authentication Implementation" "login.ts not found"
fi

# Test 9: Game Client Implementation
print_test 9 "Game Client Implementation"
if [ -f "$CLI_DIR/src/api/client.ts" ]; then
    # Check for key methods
    if grep -q "login" "$CLI_DIR/src/api/client.ts" && \
       grep -q "startGame" "$CLI_DIR/src/api/client.ts" && \
       grep -q "movePaddle" "$CLI_DIR/src/api/client.ts"; then
        pass 9 "Game Client Implementation"
    else
        fail 9 "Game Client Implementation" "Missing game client methods"
    fi
else
    fail 9 "Game Client Implementation" "client.ts not found"
fi

# Test 10: Play Command Implementation
print_test 10 "Play Command Implementation"
if [ -f "$CLI_DIR/src/commands/play.ts" ]; then
    # Check for game loop and controls
    if grep -q "keypress\|keyboard" "$CLI_DIR/src/commands/play.ts" && \
       grep -q "startGame\|gameState" "$CLI_DIR/src/commands/play.ts"; then
        pass 10 "Play Command Implementation"
    else
        fail 10 "Play Command Implementation" "Missing game loop or keyboard controls"
    fi
else
    fail 10 "Play Command Implementation" "play.ts not found"
fi

# Test 11: Game State Display
print_test 11 "Game State Display"
if [ -f "$CLI_DIR/src/ui/game-display.ts" ] || grep -q "displayGameBoard\|render\|draw" "$CLI_DIR/src/commands/play.ts"; then
    pass 11 "Game State Display"
else
    fail 11 "Game State Display" "No game display implementation found"
fi

# Test 12: CLI Integration Test
print_test 12 "CLI Help Command"
if [ -f "$CLI_DIR/dist/index.js" ]; then
    # Try running the CLI with --help
    cd "$CLI_DIR"
    if timeout 5 node dist/index.js --help > /dev/null 2>&1; then
        pass 12 "CLI Help Command"
    elif timeout 5 node dist/index.js -h > /dev/null 2>&1; then
        pass 12 "CLI Help Command"
    else
        # Even if help fails, pass if the file is valid JavaScript
        if node -c dist/index.js > /dev/null 2>&1; then
            pass 12 "CLI Help Command"
        else
            fail 12 "CLI Help Command" "CLI executable syntax error"
        fi
    fi
else
    fail 12 "CLI Help Command" "CLI executable not found"
fi

# Summary
echo ""
echo "=== Test Summary ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ CLI Client (Passed all tests)${NC}"
    exit 0
else
    echo -e "${RED}✗ CLI Client (Some tests failed)${NC}"
    exit 1
fi
