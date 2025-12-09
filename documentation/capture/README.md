# UI Screenshot Capture & Report Generation

Automated tools to capture high-quality UI screenshots and integrate them into the project report.

## 🎯 Quick Start

### Option 1: Full Pipeline (Recommended)

```bash
cd /home/honguyen/ft_transcendence

# Capture all UI screens → Optimize → Generate PDF → Commit
bash documentation/capture/batch_update_figures.sh
```

**Time:** 5-10 minutes

### Option 2: Specific Category (Fast)

```bash
# Update only authentication screens
bash documentation/capture/batch_update_figures.sh auth

# Or gameplay
bash documentation/capture/batch_update_figures.sh gameplay
```

**Time:** 2-3 minutes per category

### Option 3: Continuous Auto-Capture

```bash
# Monitor for UI changes and auto-capture when detected
python3 documentation/capture/ui_change_detector.py
```

**Automatic:** Runs in background, captures on changes

---

## ✨ Features

- ✅ **Auto-Backup**: Saves previous captures before overwriting
- ✅ **Retry Logic**: Automatically retries failed captures (2 attempts)
- ✅ **Category Filtering**: Capture specific UI sections (auth, gameplay, tournament, etc.)
- ✅ **Change Detection**: Monitors UI for changes and auto-captures when needed
- ✅ **Selective Pipeline**: Skip optimization or PDF regeneration for speed
- ✅ **JSON Logging**: Records all capture results for post-processing
- ✅ **Git Integration**: Auto-commits updated figures
- ✅ **8 Categories**: Organized by UI section (security, auth, gameplay, profile, etc.)
- ✅ **High Quality**: 1920×1080 resolution with Playwright
- ✅ **Optimized**: 30-50% file size reduction without quality loss

---

## Directory Structure

```
documentation/capture/
├── README.md                          (This file)
├── QUICK_START.md                     (Quick reference guide)
├── DETAILED_GUIDE.md                  (Comprehensive guide with examples)
├── capture_screenshots.py             (Playwright-based capture tool)
├── optimize_screenshots.sh            (Image optimization script)
├── update_report_with_screenshots.sh  (Full pipeline orchestrator)
├── image_manager.py                   (Image analysis & management tool)
└── run_full_pipeline.sh              (Simple wrapper for full pipeline)

documentation/project-report/
├── figures/                           (Generated screenshots directory)
├── project_report.tex                 (LaTeX source)
└── project_report.pdf                 (Generated PDF report)
```

---

## 🛠️ Tools Overview

### 1. **batch_update_figures.sh** - Main Pipeline Orchestrator
Complete automation: capture → optimize → PDF update → git commit.

```bash
# Full pipeline (all categories)
bash documentation/capture/batch_update_figures.sh

# Specific category
bash documentation/capture/batch_update_figures.sh auth
bash documentation/capture/batch_update_figures.sh gameplay

# Fast mode (skip PDF regeneration)
bash documentation/capture/batch_update_figures.sh all --no-pdf

# List categories
bash documentation/capture/batch_update_figures.sh list
```

**Features:**
- Complete pipeline orchestration
- Category-based selective capture
- Flexible options (skip optimization, skip PDF)
- Detailed progress reporting
- Error handling and recovery

**Output:** Updated figures + optimized images + regenerated PDF

### 2. **capture_screenshots_enhanced.py** - Advanced Screenshot Capture
Intelligent Playwright-based capture with retry logic and categorization.

```bash
# Capture everything
python3 documentation/capture/capture_screenshots_enhanced.py

# Specific category
python3 documentation/capture/capture_screenshots_enhanced.py --category auth

# List all flows
python3 documentation/capture/capture_screenshots_enhanced.py --list-flows

# List categories
python3 documentation/capture/capture_screenshots_enhanced.py --list-categories
```

**Features:**
- Retry logic (up to 2 attempts)
- 8 UI categories (security, auth, gameplay, etc.)
- Auto-backup before overwriting
- JSON result logging
- Optional flows (skip non-critical captures)
- Detailed logging with progress

**Output:** PNG files in `documentation/project-report/figures/`

### 3. **ui_change_detector.py** - Continuous Auto-Capture
Monitors UI for changes and automatically captures when updates detected.

```bash
# Start continuous monitoring
python3 documentation/capture/ui_change_detector.py

# Custom check interval (30 seconds)
python3 documentation/capture/ui_change_detector.py --interval 30

# Single check and exit
python3 documentation/capture/ui_change_detector.py --check-once
```

**Features:**
- MD5 hash-based change detection
- Automatic capture on UI changes
- JSON cache of UI states
- Git integration (auto-commit)
- Configurable check intervals
- Health checking

**Output:** Auto-updated figures + git commits

### 4. **optimize_screenshots.sh** - Image Optimization
Batch compress PNG files (typically 30-50% size reduction).

```bash
bash documentation/capture/optimize_screenshots.sh
```

**Features:**
- PNG optimization
- Metadata stripping
- 85% quality preservation
- Detailed reporting
- Cross-platform compatible

**Output:** Optimized PNG files

### 5. **image_manager.py** - Image Analysis & Reporting
Analyze, validate, and report on captured figures.

```bash
# Analyze all images
python3 documentation/capture/image_manager.py --analyze

# Generate HTML gallery
python3 documentation/capture/image_manager.py --gallery

# Check LaTeX references
python3 documentation/capture/image_manager.py --check-latex

# Find duplicates
python3 documentation/capture/image_manager.py --find-duplicates

# All analyses
python3 documentation/capture/image_manager.py --all
```

**Features:**
- Image statistics and metadata
- HTML gallery generation
- LaTeX reference validation
- Duplicate detection
- JSON manifest generation

**Output:** Reports and HTML preview

---

## Installation

### First Time Setup

```bash
cd /home/honguyen/ft_transcendence

# Install Python dependencies
pip3 install playwright pillow

# Install Playwright browser
python3 -m playwright install chromium

# Install ImageMagick (for optimization)
# Linux:
sudo apt-get install imagemagick

# macOS:
brew install imagemagick
```

**Verify installation:**
```bash
python3 -c "from playwright.async_api import async_playwright; print('✅ OK')"
which convert && echo "✅ ImageMagick OK"
```

---

## Usage Examples

### Scenario 1: Update Report with Latest Screenshots

```bash
# Full automated pipeline
bash documentation/capture/update_report_with_screenshots.sh

# What it does:
# 1. Ensures services are running
# 2. Captures all UI screens
# 3. Optimizes images (saves 30-50% space)
# 4. Compiles LaTeX to PDF
# 5. Commits and pushes to git
```

### Scenario 2: Capture Only (Don't Regenerate Report)

```bash
python3 documentation/capture/capture_screenshots.py

# Output: New PNG files in documentation/project-report/figures/
# Then manually optimize and compile if needed
```

### Scenario 3: Optimize Existing Images

```bash
bash documentation/capture/optimize_screenshots.sh

# Reduces all PNG files by ~30-50% while maintaining quality
```

### Scenario 4: Analyze Current Figures

```bash
# View statistics
python3 documentation/capture/image_manager.py --analyze

# Generate HTML preview gallery
python3 documentation/capture/image_manager.py --gallery
# Then open: documentation/project-report/figures_gallery.html

# Check which figures are referenced in LaTeX
python3 documentation/capture/image_manager.py --check-latex
```

### Scenario 5: Custom Screenshot Capture

Edit `capture_screenshots.py` to add/modify URLs:

```python
UI_FLOWS = [
    {
        "name": "My Custom Page",
        "url": "https://localhost/my-page",
        "wait": "networkidle",
        "filename": "custom_screenshot.png",
        "full_page": True,
        "delay": 1000,
    },
    # Add more flows...
]
```

Then run:
```bash
python3 documentation/capture/capture_screenshots.py
```

---

## Configuration

### Change Screenshot Resolution

Edit `capture_screenshots.py`:
```python
RESOLUTION = {"width": 1280, "height": 720}  # Instead of 1920x1080
```

### Change Target Server URL

```bash
# Run with custom base URL
BASE_URL=https://your-server:8443 python3 documentation/capture/capture_screenshots.py
```

### Add More Capture Flows

Edit `UI_FLOWS` list in `capture_screenshots.py`:

```python
UI_FLOWS = [
    # ... existing flows ...
    {
        "name": "New Screen",
        "url": "https://localhost/new-page",
        "wait": "networkidle",
        "filename": "new_screenshot.png",
        "full_page": True,
        "delay": 1000,
    },
]
```

### Adjust Image Optimization Quality

Edit `optimize_screenshots.sh`, change the quality parameter:

```bash
convert "$img" \
    -quality 90 \  # Higher = larger files, better quality
    -strip \
    ...
```

---

## Troubleshooting

### Services Not Running

```bash
# Check status
docker ps | grep -E "frontend|game|auth|user"

# Start services
make restart

# Wait for initialization (30-60 seconds)
```

### Playwright/Chromium Issues

```bash
# Reinstall Playwright
pip3 install --upgrade --force-reinstall playwright
python3 -m playwright install chromium

# Test connection
curl -k https://localhost  # Should return HTML
```

### HTTPS Certificate Errors

Scripts ignore self-signed certificates by default. If still failing:

```bash
# Verify certificate exists
ls -la nginx/certs/

# Check Nginx logs
docker logs ft-nginx-1
```

### ImageMagick Permission Errors

```bash
# Ensure figures directory is writable
chmod -R 755 documentation/project-report/figures/

# Re-optimize
bash documentation/capture/optimize_screenshots.sh
```

### Screenshots Are Blank

```python
# In capture_screenshots.py, increase delays
DELAY = 2000  # 2 seconds instead of 1
# Or per-flow
"delay": 5000,  # 5 seconds for specific page
```

### Out of Disk Space

Check image sizes:
```bash
du -sh documentation/project-report/figures/
# If too large, optimize more aggressively:
# Change quality from 85 to 75 in optimize_screenshots.sh
```

---

## Automation & CI/CD

### GitHub Actions Workflow

Create `.github/workflows/auto-capture.yml`:

```yaml
name: Auto-Capture Screenshots

on:
  workflow_dispatch  # Manual trigger from GitHub UI
  # Uncomment for weekly automatic capture:
  # schedule:
  #   - cron: '0 2 * * 0'  # Weekly Sunday 2 AM

jobs:
  capture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y imagemagick
          pip3 install playwright pillow
          python3 -m playwright install chromium
      
      - name: Run full pipeline
        run: bash documentation/capture/update_report_with_screenshots.sh
      
      - name: Commit changes
        run: |
          git config user.email "bot@transcendence.dev"
          git config user.name "Screenshot Bot"
          git add -A
          git commit -m "Auto-update: UI screenshots" || true
          git push
```

### Manual Trigger from Command Line

```bash
# Using GitHub CLI
gh workflow run auto-capture.yml

# Then check progress
gh run list --workflow=auto-capture.yml
```

---

## File Management

### Current Figures

List all captured figures:
```bash
ls -lh documentation/project-report/figures/
```

Expected structure:
```
1_https_evidence.png
2_login_UI.png
3_create_new_account_UI.png
2_Oauth_2Step_verification.png
3_Forget_Password.png
3_Main_Menu.png
game_modes.png
4_playemode_game_settings.png
multiplayer_arcade.png
Campaign_game_running.png
coop_game_level_up.png
gamemode_tournament.png
tournament_bracket_matches.png
13_dashboard_profile.png
14_game_statistics.png
15_history_matches.png
```

### Backup Old Figures

```bash
# Before capturing new ones
tar -czf figures_backup_$(date +%Y%m%d).tar.gz \
    documentation/project-report/figures/

# Restore if needed
tar -xzf figures_backup_20231209.tar.gz
```

---

## Best Practices

✅ **Do:**
- Run full pipeline weekly to keep figures current
- Optimize images before committing (saves 30-50% space)
- Review generated PDF before pushing
- Test on staging environment first
- Use descriptive filenames with numbers for ordering
- Commit figures alongside report PDF

❌ **Don't:**
- Manually edit figures (use automation)
- Commit unoptimized images (increases repo size)
- Capture with 4K resolution (unnecessary, uses 10x space)
- Forget to wait for services before capturing
- Skip optimization step (wasteful of bandwidth)

---

## Documentation

| File | Purpose | Audience |
|------|---------|----------|
| **README.md** | Overview & quick start | Everyone |
| **QUICK_START.md** | Command reference & examples | Developers |
| **DETAILED_GUIDE.md** | Complete technical guide | Technical staff |

---

## Scripts at a Glance

| Script | Purpose | Usage |
|--------|---------|-------|
| `capture_screenshots.py` | Capture UI screenshots | `python3 ... capture_screenshots.py` |
| `optimize_screenshots.sh` | Compress images | `bash ... optimize_screenshots.sh` |
| `update_report_with_screenshots.sh` | Full pipeline | `bash ... update_report_with_screenshots.sh` |
| `image_manager.py` | Analyze figures | `python3 ... image_manager.py --analyze` |

---

## Common Tasks

### Update report with current UI state
```bash
bash documentation/capture/update_report_with_screenshots.sh
```

### Just capture new screenshots (keep existing optimizations)
```bash
python3 documentation/capture/capture_screenshots.py
```

### Re-optimize existing images to save space
```bash
bash documentation/capture/optimize_screenshots.sh
```

### Generate preview gallery of all figures
```bash
python3 documentation/capture/image_manager.py --gallery
# Then open: documentation/project-report/figures_gallery.html
```

### Check if all figures are referenced in LaTeX
```bash
python3 documentation/capture/image_manager.py --check-latex
```

### Print size statistics
```bash
python3 documentation/capture/image_manager.py --analyze
```

---

## Support

**Having issues?** Check these first:

1. **Blank screenshots?**
   - Services not running: `make restart`
   - Need more delay: Edit `DELAY = 2000` in capture_screenshots.py

2. **Connection refused?**
   - HTTPS error: Already handled, run with `-k` flag
   - Services down: `docker ps` and `docker logs <container>`

3. **Out of space?**
   - Check size: `du -sh documentation/project-report/figures/`
   - More aggressive optimization: Lower quality to 75

4. **Need help?**
   - Read DETAILED_GUIDE.md for comprehensive documentation
   - Check script headers for detailed comments
   - Review GitHub Actions workflow for CI/CD example

---

## Project Structure

All screenshot/report tools are organized under `documentation/capture/`:
- Python scripts for automation
- Shell scripts for pipeline orchestration
- Documentation guides for usage
- All outputs go to `documentation/project-report/`

This keeps the root project directory clean and screenshot tools self-contained.

---

**Last updated:** December 9, 2025
