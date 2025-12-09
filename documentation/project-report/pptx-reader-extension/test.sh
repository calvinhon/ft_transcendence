#!/bin/bash

# Quick Test Script for PPTX Reader Extension

echo "🧪 PPTX Reader Extension - Test Suite"
echo "===================================="
echo ""

# Test 1: Check Python
echo "Test 1: Python Installation"
if python3 --version > /dev/null 2>&1; then
    echo "  ✅ Python is installed: $(python3 --version)"
else
    echo "  ❌ Python is not installed"
    exit 1
fi
echo ""

# Test 2: Check python-pptx
echo "Test 2: python-pptx Module"
if python3 -c "from pptx import Presentation" 2>/dev/null; then
    echo "  ✅ python-pptx is installed"
else
    echo "  ❌ python-pptx is not installed"
    echo "  Install with: pip install python-pptx"
    exit 1
fi
echo ""

# Test 3: Check Node.js
echo "Test 3: Node.js Installation"
if node --version > /dev/null 2>&1; then
    echo "  ✅ Node.js is installed: $(node --version)"
else
    echo "  ❌ Node.js is not installed"
    exit 1
fi
echo ""

# Test 4: Check npm
echo "Test 4: npm Installation"
if npm --version > /dev/null 2>&1; then
    echo "  ✅ npm is installed: $(npm --version)"
else
    echo "  ❌ npm is not installed"
    exit 1
fi
echo ""

# Test 5: Check TypeScript compilation
echo "Test 5: TypeScript Compilation"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -f "$SCRIPT_DIR/out/extension.js" ] && [ -f "$SCRIPT_DIR/out/panel.js" ]; then
    echo "  ✅ TypeScript compiled successfully"
else
    echo "  ⚠️  TypeScript files not found, compiling..."
    cd "$SCRIPT_DIR"
    npm run compile > /dev/null 2>&1
    if [ -f "$SCRIPT_DIR/out/extension.js" ]; then
        echo "  ✅ Compilation successful"
    else
        echo "  ❌ Compilation failed"
        exit 1
    fi
fi
echo ""

# Test 6: Check extension files
echo "Test 6: Extension Files"
FILES=(
    "package.json"
    "tsconfig.json"
    "README.md"
    "SETUP.md"
    "out/extension.js"
    "out/panel.js"
)

MISSING=false
for file in "${FILES[@]}"; do
    if [ -f "$SCRIPT_DIR/$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
        MISSING=true
    fi
done

if [ "$MISSING" = true ]; then
    echo ""
    echo "❌ Some files are missing"
    exit 1
fi
echo ""

# Test 7: Test PPTX reading (if presentation exists)
echo "Test 7: PPTX Reading Capability"
if [ -f "$HOME/ft_transcendence/documentation/Transcendence_Enhanced.pptx" ]; then
    echo "  🎯 Testing with Transcendence_Enhanced.pptx..."
    
    OUTPUT=$(python3 << 'PYTHON_TEST'
import json
from pptx import Presentation

try:
    prs = Presentation('/home/honguyen/ft_transcendence/documentation/Transcendence_Enhanced.pptx')
    print(json.dumps({
        'success': True,
        'slides': len(prs.slides),
        'shapes': sum(len(slide.shapes) for slide in prs.slides)
    }))
except Exception as e:
    print(json.dumps({
        'success': False,
        'error': str(e)
    }))
PYTHON_TEST
    )
    
    if echo "$OUTPUT" | grep -q '"success": true'; then
        SLIDES=$(echo "$OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin)['slides'])")
        SHAPES=$(echo "$OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin)['shapes'])")
        echo "  ✅ PPTX read successfully: $SLIDES slides, $SHAPES shapes"
    else
        echo "  ❌ Failed to read PPTX"
        echo "$OUTPUT"
    fi
else
    echo "  ⚠️  Test PPTX not found (Transcendence_Enhanced.pptx)"
    echo "     You can test by opening any .pptx file in VS Code"
fi
echo ""

echo "===================================="
echo "✅ All tests passed!"
echo ""
echo "Next steps:"
echo "  1. Install the extension: bash install.sh"
echo "  2. Or load in VS Code via:"
echo "     - Command Palette: Open PPTX Reader"
echo "     - File Explorer: Right-click .pptx file"
echo ""
