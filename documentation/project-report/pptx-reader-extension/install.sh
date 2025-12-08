#!/bin/bash

# PPTX Reader Extension - Quick Install Script

set -e

EXTENSION_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
EXTENSION_NAME="pptx-reader"

echo "📦 PPTX Reader VS Code Extension Installer"
echo "==========================================="
echo ""

# Check Python
echo "🔍 Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.6 or later."
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✅ Python $PYTHON_VERSION found"
echo ""

# Check python-pptx
echo "🔍 Checking python-pptx module..."
if ! python3 -c "import pptx" 2>/dev/null; then
    echo "📥 Installing python-pptx..."
    pip install python-pptx
else
    echo "✅ python-pptx is already installed"
fi
echo ""

# Install npm dependencies
echo "📥 Installing npm dependencies..."
cd "$EXTENSION_DIR"
npm install --quiet
echo "✅ Dependencies installed"
echo ""

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile
echo "✅ Compilation successful"
echo ""

# Create symlink for easy loading
if command -v code &> /dev/null; then
    echo "🔗 Installing extension into VS Code..."
    
    # Get VS Code extensions directory
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        VSCODE_EXT_DIR="$HOME/.vscode/extensions"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        VSCODE_EXT_DIR="$HOME/.vscode/extensions"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        VSCODE_EXT_DIR="$USERPROFILE/.vscode/extensions"
    fi
    
    if [ -d "$VSCODE_EXT_DIR" ]; then
        # Create a symlink to the extension
        LINK_PATH="$VSCODE_EXT_DIR/$EXTENSION_NAME"
        
        if [ -L "$LINK_PATH" ]; then
            rm "$LINK_PATH"
        fi
        
        ln -s "$EXTENSION_DIR" "$LINK_PATH"
        echo "✅ Extension linked to VS Code"
    else
        echo "⚠️  VS Code extensions directory not found"
        echo "   You can manually load the extension:"
        echo "   1. Open VS Code"
        echo "   2. Go to Extensions (Ctrl+Shift+X)"
        echo "   3. Click '...' menu and select 'Install from VSIX'"
        echo "   4. Select: $EXTENSION_DIR/pptx-reader-*.vsix"
    fi
else
    echo "⚠️  VS Code command-line tool 'code' not found"
    echo "   To use the extension, install it manually through VS Code"
fi
echo ""

echo "==========================================="
echo "✅ Installation Complete!"
echo ""
echo "📖 Usage:"
echo "   1. Open VS Code"
echo "   2. Press Ctrl+Shift+P"
echo "   3. Type 'Open PPTX Reader'"
echo "   4. Or right-click any .pptx file in explorer"
echo ""
echo "📚 Documentation: $EXTENSION_DIR/README.md"
echo "⚙️  Setup Guide: $EXTENSION_DIR/SETUP.md"
echo ""
