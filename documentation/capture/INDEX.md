# Screenshot Capture Tools - Index

## 📦 All Files Organized

Location: `documentation/capture/`

### 📚 Documentation

| File | Purpose | Audience |
|------|---------|----------|
| **README.md** | Overview, quick start, troubleshooting | Everyone |
| **QUICK_START.md** | Command reference & examples | Developers |
| **DETAILED_GUIDE.md** | Complete technical guide | Technical staff |

### 🛠️ Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| **run_full_pipeline.sh** | Simple wrapper for full pipeline | `bash run_full_pipeline.sh` |
| **capture_screenshots.py** | Capture UI screenshots (Playwright) | `python3 capture_screenshots.py` |
| **optimize_screenshots.sh** | Compress images | `bash optimize_screenshots.sh` |
| **update_report_with_screenshots.sh** | Full orchestrated pipeline | `bash update_report_with_screenshots.sh` |
| **image_manager.py** | Analyze & manage figures | `python3 image_manager.py --help` |

## 🚀 Quick Commands

```bash
# Full pipeline (recommended)
bash documentation/capture/run_full_pipeline.sh

# Capture only
python3 documentation/capture/capture_screenshots.py

# Optimize existing images
bash documentation/capture/optimize_screenshots.sh

# Analyze figures
python3 documentation/capture/image_manager.py --analyze

# Generate preview gallery
python3 documentation/capture/image_manager.py --gallery

# Check LaTeX references
python3 documentation/capture/image_manager.py --check-latex
```

## 📋 What Each Script Does

### run_full_pipeline.sh
Simple wrapper that runs the complete pipeline:
1. Captures screenshots
2. Optimizes images
3. Regenerates PDF report
4. Commits to git

**Time**: 5-10 minutes
**Output**: Updated `documentation/project-report/project_report.pdf`

### capture_screenshots.py
Uses Playwright to capture high-quality screenshots from running application.

**Features**:
- 1920×1080 resolution
- 16 pre-configured UI flows
- Automatic page load waiting
- HTTPS support (ignores self-signed certs)
- Customizable delays

**Output**: PNG files in `documentation/project-report/figures/`

### optimize_screenshots.sh
Compresses PNG files while preserving quality (typically 30-50% reduction).

**Features**:
- Automatic PNG optimization
- Quality preservation (85%)
- Metadata stripping
- Progressive compression

**Output**: Optimized PNG files in same location

### update_report_with_screenshots.sh
Orchestrated full pipeline with status updates.

**Steps**:
1. Verify prerequisites (Python, Playwright, ImageMagick)
2. Check services are running
3. Capture screenshots
4. Optimize images
5. Compile LaTeX PDF
6. Commit and push to git

**Output**: Updated PDF + git commit

### image_manager.py
Multi-purpose image analysis and management tool.

**Modes**:
- `--analyze`: Print statistics
- `--manifest`: Generate JSON manifest
- `--gallery`: Create HTML preview gallery
- `--check-latex`: Verify LaTeX references
- `--find-duplicates`: Detect duplicate images
- `--all`: Run all analyses

**Output**: Statistics, JSON, HTML, or console reports

## 🎯 Common Workflows

### Workflow 1: Update Report with Latest UI

```bash
bash documentation/capture/run_full_pipeline.sh
```

**What it does**:
- Captures current UI state
- Optimizes all images
- Regenerates PDF with new figures
- Commits to git

**Time**: 5-10 minutes

### Workflow 2: Just Capture (Don't Update Report)

```bash
python3 documentation/capture/capture_screenshots.py
```

**When to use**: Quick UI snapshot without full recompile

### Workflow 3: Verify Figure Integration

```bash
# Check which figures are referenced in LaTeX
python3 documentation/capture/image_manager.py --check-latex

# Generate preview gallery
python3 documentation/capture/image_manager.py --gallery
```

### Workflow 4: Save Space

```bash
# Optimize all existing images
bash documentation/capture/optimize_screenshots.sh

# See size reduction
python3 documentation/capture/image_manager.py --analyze
```

## 📂 File Organization

```
project-root/
├── documentation/
│   ├── capture/                          (← All tools here)
│   │   ├── README.md
│   │   ├── QUICK_START.md
│   │   ├── DETAILED_GUIDE.md
│   │   ├── run_full_pipeline.sh
│   │   ├── capture_screenshots.py
│   │   ├── optimize_screenshots.sh
│   │   ├── update_report_with_screenshots.sh
│   │   └── image_manager.py
│   │
│   └── project-report/                   (← Generated outputs)
│       ├── project_report.pdf
│       ├── project_report.tex
│       └── figures/
│           ├── 1_https_evidence.png
│           ├── 2_login_UI.png
│           └── ... (36 total)
```

## ✅ Prerequisites

**First time only**:
```bash
# Install Python packages
pip3 install playwright pillow

# Install Playwright browser
python3 -m playwright install chromium

# Install ImageMagick
# Linux
sudo apt-get install imagemagick

# macOS
brew install imagemagick
```

**Verify**:
```bash
python3 -c "from playwright.async_api import async_playwright; print('✅ OK')"
which convert && echo "✅ ImageMagick OK"
```

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| Services not running | `make restart` and wait 30-60s |
| Playwright not found | `pip3 install --upgrade --force-reinstall playwright` |
| ImageMagick missing | `sudo apt-get install imagemagick` or `brew install imagemagick` |
| Blank screenshots | Increase delay: `DELAY = 2000` in capture_screenshots.py |
| Permission denied | `chmod +x documentation/capture/*.{py,sh}` |

## 📖 Documentation Tree

```
Getting Started
├── README.md (start here)
│   ├── Quick start (30 seconds)
│   ├── Tools overview
│   ├── Installation
│   ├── Usage examples
│   ├── Troubleshooting
│   └── Automation/CI-CD
│
├── QUICK_START.md
│   ├── Step-by-step instructions
│   ├── Individual scripts
│   ├── Customization
│   └── Quick reference
│
└── DETAILED_GUIDE.md
    ├── Comprehensive setup
    ├── All four methods
    ├── Python automation
    ├── Image optimization
    ├── CI/CD integration
    └── Best practices
```

## 🎓 Learning Path

1. **First time**: Read `README.md`
2. **Quick reference**: Use `QUICK_START.md`
3. **Deep dive**: Study `DETAILED_GUIDE.md`
4. **Troubleshoot**: Check README's troubleshooting section
5. **Automate**: Set up GitHub Actions workflow from DETAILED_GUIDE.md

## 📊 Statistics

**Current setup**:
- 8 files (3 docs + 5 scripts)
- ~60 KB documentation
- 36 screenshot figures already captured
- 57-page project report generated
- 2.7 MB total report size

**Typical pipeline run**:
- Time: 5-10 minutes
- Screenshot capture: 2-3 minutes
- Image optimization: 1-2 minutes
- PDF compilation: 1-2 minutes
- Git operations: <1 minute

## 🔗 Related Resources

- **Root README.md**: Project overview (links to capture tools)
- **documentation/project-report/project_report.pdf**: Generated report
- **documentation/project-report/figures/**: All captured screenshots
- **.github/workflows/**: CI/CD workflows (if using GitHub Actions)

---

**Last updated**: December 9, 2025
