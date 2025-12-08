# PPTX Reader Extension

An integrated PPTX presentation reader for VS Code that allows you to view and navigate through PowerPoint files directly in the editor.

## Features

- 🎯 **Open PPTX Files**: View presentations right in VS Code
- ⬅️➡️ **Navigation**: Previous/Next slide buttons and direct slide jumping
- 📊 **Content Display**: Full text and bullet point display with proper indentation
- 🎨 **VS Code Theming**: Adapts to your VS Code color scheme
- 🖱️ **Context Menu**: Right-click PPTX files to open with reader

## Installation

1. Copy this folder to your VS Code extensions directory or install via extension marketplace
2. Install dependencies: `npm install`
3. Build: `npm run compile`

## Usage

### Open Reader
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Open PPTX Reader"
3. Click on "Choose File" to select a PPTX file

### Open from File Explorer
1. Right-click any `.pptx` file in the explorer
2. Select "Open PPTX File"

### Navigation
- Use **Previous** / **Next** buttons to navigate slides
- Enter a slide number in the "Go to" field and press Enter
- Use arrow keys for quick navigation

## Requirements

- VS Code 1.90 or later
- Python 3.6+ with `python-pptx` library installed

Install python-pptx:
```bash
pip install python-pptx
```

## Architecture

- **extension.ts**: Main extension entry point and command handlers
- **panel.ts**: Webview panel implementation with PPTX parsing logic

## How It Works

1. Extracts slide data using Python's `python-pptx` library
2. Converts PPTX content to JSON format
3. Renders slides in a VS Code webview with navigation controls
4. Supports text formatting with bullet point hierarchy

---

Made with ❤️ for VS Code
