# 🚀 PPTX Reader Extension - Installation & Launch Guide

## ⚡ 30-Second Quick Start

```bash
# 1. Navigate to extension directory
cd /home/honguyen/ft_transcendence/pptx-reader-extension

# 2. Run installer (handles everything)
bash install.sh

# 3. Open VS Code and load extension
code .

# 4. Press Ctrl+Shift+P and type "Open PPTX Reader"
```

✅ **Done!** Your extension is now installed and ready to use.

---

## 📋 Prerequisites Check

Before installing, verify you have:

```bash
# Check Python (need 3.6+)
python3 --version

# Check Node.js (need 18+)
node --version

# Check npm (need 9+)
npm --version
```

If any are missing:
```bash
# Ubuntu/Debian
sudo apt-get install python3 nodejs npm

# macOS (with Homebrew)
brew install python3 node

# Windows (with chocolatey)
choco install python nodejs
```

---

## 📦 Installation Options

### Option A: Automated (Recommended)
```bash
cd /home/honguyen/ft_transcendence/pptx-reader-extension
bash install.sh
```

**What this does:**
- ✅ Verifies Python 3 and python-pptx
- ✅ Installs npm dependencies
- ✅ Compiles TypeScript
- ✅ Registers extension in VS Code

**Time**: ~30 seconds

### Option B: Manual Installation
```bash
# Step 1: Navigate to extension folder
cd /home/honguyen/ft_transcendence/pptx-reader-extension

# Step 2: Install npm dependencies
npm install

# Step 3: Compile TypeScript
npm run compile

# Step 4: Install python-pptx (if not already installed)
pip install python-pptx

# Step 5: Load in VS Code (in extension folder)
code .
# Then press F5 to launch in debug mode
# Or install the VSIX file (see below)
```

### Option C: Build VSIX Package
```bash
# Install vsce package manager
npm install -g vsce

# Build VSIX file
cd /home/honguyen/ft_transcendence/pptx-reader-extension
vsce package

# Install in VS Code
code --install-extension pptx-reader-1.0.0.vsix
```

---

## ✅ Verify Installation

### Test 1: Quick Test Script
```bash
cd /home/honguyen/ft_transcendence/pptx-reader-extension
bash test.sh
```

Expected output:
```
✅ All tests passed!
```

### Test 2: Launch Extension
1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
3. Type "Open PPTX Reader"
4. You should see the command in the palette

### Test 3: Open Sample File
1. Right-click `Transcendence_Enhanced.pptx` in file explorer
2. Select "Open PPTX File"
3. Should see slide content in a new panel

---

## 🎮 Using the Extension

### Method 1: Command Palette
```
Ctrl+Shift+P  (Windows/Linux)
Cmd+Shift+P   (macOS)

Type: "Open PPTX Reader"
Press: Enter
Select: Your PPTX file
```

### Method 2: Context Menu
1. Right-click any `.pptx` file in explorer
2. Click "Open PPTX File"
3. File opens in reader

### Method 3: Command Line
```bash
# Open presentation directly
code --open-file /path/to/presentation.pptx
```

### Navigation in Reader
| Action | How |
|--------|-----|
| Next Slide | Click "Next →" button |
| Previous Slide | Click "← Previous" button |
| Jump to Slide | Enter number in "Go to:" field |
| Open Different File | Click "📂 Open File" button |

---

## 🔧 Configuration

No configuration needed! The extension works out-of-the-box.

**Optional**: Configure Python path in settings
```json
{
  "python.pythonPath": "/usr/bin/python3"
}
```

---

## 🐛 Troubleshooting

### Problem: "python-pptx module not found"
```bash
# Solution: Install the module
pip install python-pptx

# Or upgrade if outdated
pip install --upgrade python-pptx
```

### Problem: "Command not found: code"
VS Code command-line tools not installed.
```bash
# Ubuntu/Debian
sudo apt install code

# Or open VS Code, then:
# 1. Press Ctrl+Shift+P
# 2. Type "Shell Command: Install 'code' command"
# 3. Click when it appears
```

### Problem: Extension doesn't appear in palette
```bash
# 1. Reload VS Code window
Ctrl+R  (Windows/Linux)
Cmd+R   (macOS)

# 2. Or restart VS Code completely

# 3. Check if extension is enabled
# Click Extensions (Ctrl+Shift+X)
# Search for "PPTX Reader"
# Ensure it's enabled
```

### Problem: Slow loading
```bash
# Check system resources
# If sluggish, try:
# 1. Close other extensions temporarily
# 2. Disable heavy extensions
# 3. Restart VS Code
# 4. Check disk space (need ~100MB free)
```

### Problem: PPTX won't open
```bash
# 1. Verify file is valid PPTX format
file your-file.pptx  # Should show "Zip archive"

# 2. Try with different PPTX file

# 3. Check error in VS Code output
# View > Output > Look for error messages

# 4. Test with sample
python3 -c "from pptx import Presentation; Presentation('your-file.pptx')"
```

---

## 📊 What to Expect

After installation and launch with `Transcendence_Enhanced.pptx`:

**You will see:**
- ✅ All 36 slides with complete content
- ✅ Bullet points with proper indentation
- ✅ Clean, readable slide layout
- ✅ Smooth navigation between slides
- ✅ Slide counter (e.g., "5 / 36")

**Technical Details Visible:**
- ✅ 125/125 requirements compliance
- ✅ 180 automated tests summary
- ✅ 18 modules documentation
- ✅ Security architecture (7 layers)
- ✅ Microservices topology
- ✅ Database design
- ✅ SDLC phases
- ✅ And more!

---

## 🎯 Next Steps After Installation

### 1. First Time Use
```bash
# Open your documentation folder
code /home/honguyen/ft_transcendence/documentation

# Right-click Transcendence_Enhanced.pptx
# Select "Open PPTX File"

# Navigate slides with Previous/Next buttons
```

### 2. Integration Tips
- Pin the PPTX Reader to sidebar for quick access
- Keep presentation open during development
- Use for presentations (full-screen ready)

### 3. Workflow Optimization
```bash
# Open project with presentation
code /home/honguyen/ft_transcendence

# Open extension
# Ctrl+Shift+P > "Open PPTX Reader"
# Navigate to Transcendence_Enhanced.pptx

# Now you can code and reference docs side-by-side!
```

---

## 📚 Documentation

All documentation is in the extension folder:

| File | Purpose |
|------|---------|
| `README.md` | User guide and features |
| `SETUP.md` | Detailed setup instructions |
| `USAGE.md` | Comprehensive usage guide |
| `install.sh` | Automated installation |
| `test.sh` | Test suite |
| `src/` | Source code (TypeScript) |
| `out/` | Compiled JavaScript |

---

## 🔍 File Locations

```
/home/honguyen/ft_transcendence/
├── pptx-reader-extension/    ← Extension folder
│   ├── src/                  ← Source code
│   ├── out/                  ← Compiled files
│   ├── package.json          ← Dependencies
│   ├── install.sh            ← Installation script
│   ├── test.sh               ← Test suite
│   └── README.md             ← Main documentation
│
└── documentation/
    └── Transcendence_Enhanced.pptx  ← Your presentation
```

---

## 💡 Tips & Tricks

### Keyboard Shortcuts
```
Ctrl+Shift+P    Open command palette
Ctrl+Shift+X    Open extensions view
Ctrl+B          Toggle sidebar
Ctrl+J          Toggle terminal
```

### Speed Tips
1. Keep extension window small while coding
2. Disable animations in VS Code settings
3. Use "Go to Slide" for large presentations
4. Close other heavy extensions

### Best Practices
1. Keep PPTX file in project folder
2. Use descriptive file names
3. Refresh if file is modified externally
4. Backup important presentations

---

## ✨ Extension Features Summary

| Feature | Availability |
|---------|--------------|
| Open PPTX files | ✅ Yes |
| Navigate slides | ✅ Yes |
| View text content | ✅ Yes |
| Bullet points | ✅ Yes |
| Text hierarchy | ✅ Yes |
| VS Code theme match | ✅ Yes |
| Read-only (safe) | ✅ Yes |
| Export to PDF | 🔄 Planned |
| Images/embedded | 🔄 Planned |
| Search slides | 🔄 Planned |
| Slide thumbnails | 🔄 Planned |

---

## 🎓 Learning Resources

1. **Getting Started**: Read `README.md`
2. **Setup Help**: See `SETUP.md`
3. **Usage Guide**: Check `USAGE.md`
4. **Troubleshooting**: See this file

---

## 🆘 Getting Help

1. **Quick Issue**: Check "Troubleshooting" above
2. **Installation**: Run `bash test.sh`
3. **Debug Mode**: Open extension in VS Code with F5
4. **Check Logs**: View > Output > Look for PPTX Reader

---

## ✅ Installation Checklist

Before you start, prepare:
- [ ] Python 3.6+ installed
- [ ] Node.js 18+ installed
- [ ] npm 9+ installed
- [ ] VS Code 1.90+ installed
- [ ] Internet connection (for npm install)
- [ ] ~100MB free disk space

After installation:
- [ ] Test suite passes (`bash test.sh`)
- [ ] Extension appears in command palette
- [ ] Can open PPTX files
- [ ] Can navigate slides
- [ ] Extension theme matches VS Code

---

## 🚀 Ready to Launch!

```bash
# Everything set up? Let's go!

# 1. Install (if not done)
cd /home/honguyen/ft_transcendence/pptx-reader-extension
bash install.sh

# 2. Verify installation
bash test.sh

# 3. Open in VS Code
code .

# 4. Press Ctrl+Shift+P and type "Open PPTX Reader"

# 5. Choose your presentation file

# Enjoy! 🎉
```

---

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: December 8, 2024

Need help? Check README.md or SETUP.md in the extension folder!
