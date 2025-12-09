# Quick Start: Auto-Capture UI Screenshots

## One-Line Quick Start

```bash
# Full pipeline: capture → optimize → regenerate report
cd /home/honguyen/ft_transcendence && ./update_report_with_screenshots.sh
```

This will:
1. ✅ Verify all prerequisites (Python, Playwright, ImageMagick)
2. ✅ Check services are running
3. ✅ Capture high-quality screenshots (1920×1080)
4. ✅ Optimize images for document embedding
5. ✅ Regenerate PDF report with new figures
6. ✅ Commit and push changes to git

**Time estimate:** 5-10 minutes

---

## Step-by-Step Guide

### Step 1: Install Dependencies (First Time Only)

```bash
# Python + Playwright
pip3 install playwright
python3 -m playwright install chromium

# Image optimization (Linux)
sudo apt-get install imagemagick

# Image optimization (macOS)
brew install imagemagick
```

**Verify installation:**
```bash
python3 -c "from playwright.async_api import async_playwright; print('✅ Playwright OK')"
which convert && echo "✅ ImageMagick OK"
```

### Step 2: Ensure Services Are Running

```bash
cd /home/honguyen/ft_transcendence

# Start all services
make restart

# Wait for services to be ready (should see green ✅ indicators)
# Takes about 30-60 seconds
```

### Step 3: Capture Screenshots Only

```bash
cd /home/honguyen/ft_transcendence

# Capture only (don't regenerate report)
python3 capture_screenshots.py

# Output: screenshots saved to documentation/project-report/figures/
```

### Step 4: Optimize Images Only

```bash
cd /home/honguyen/ft_transcendence

# Compress and optimize all PNG files
bash optimize_screenshots.sh

# Result: All files optimized, typically 30-50% size reduction
```

### Step 5: Regenerate Report with New Figures

```bash
cd /home/honguyen/ft_transcendence/documentation/project-report

# Compile LaTeX report (figures must already be in place)
pdflatex -interaction=nonstopmode project_report.tex

# View result
open project_report.pdf  # macOS
xdg-open project_report.pdf  # Linux
```

### Step 6: Commit Changes

```bash
cd /home/honguyen/ft_transcendence

# Stage new figures
git add documentation/project-report/figures/

# Commit and push
git commit -m "Update UI screenshots - $(date +'%Y-%m-%d')"
git push
```

---

## Individual Capture Scripts

### Capture Everything (Default)

```bash
python3 /home/honguyen/ft_transcendence/capture_screenshots.py
```

Captures all UI flows with delays and waits.

### Capture Custom URLs

Edit the `UI_FLOWS` list in `capture_screenshots.py`:

```python
UI_FLOWS = [
    {
        "name": "My Custom Screen",
        "url": "https://localhost/my-custom-page",
        "wait": "networkidle",
        "filename": "my_screen.png",
        "full_page": True,
        "delay": 1000,
    },
    # Add more flows...
]
```

Then run: `python3 capture_screenshots.py`

### Capture with Different Resolution

```bash
# Edit capture_screenshots.py:
RESOLUTION = {"width": 1280, "height": 720}  # HD instead of Full HD

# Or set environment variable:
export RESOLUTION_W=1280
export RESOLUTION_H=720
python3 capture_screenshots.py
```

### Capture Without HTTPS Verification

```python
# In capture_screenshots.py, change:
IGNORE_HTTPS = True  # Already enabled by default
```

This allows capturing from localhost with self-signed certificates.

---

## Image Optimization Examples

### Reduce All Images to Specific Size

```bash
# Resize all PNG to 1280×720
for img in documentation/project-report/figures/*.png; do
    convert "$img" -resize 1280x720 "$img"
done
```

### Convert JPG to PNG

```bash
# Convert all JPG to PNG and optimize
for img in documentation/project-report/figures/*.jpg; do
    png="${img%.*}.png"
    convert "$img" -quality 90 -strip "$png"
    rm "$img"
done
```

### Batch Rename Files

```bash
# Rename all figures with prefix
cd documentation/project-report/figures
for file in *.png; do
    mv "$file" "screenshot_$file"
done
```

### Add Borders to Screenshots

```bash
# Add white border to all images
for img in documentation/project-report/figures/*.png; do
    convert "$img" -bordercolor white -border 5 "$img"
done
```

---

## Troubleshooting

### Issue: "Services not responding"

```bash
# Check if services are running
docker ps

# If not running, start them
make restart

# Wait 30-60 seconds for initialization
```

### Issue: "Playwright/Chromium not found"

```bash
# Reinstall Playwright
pip3 install --upgrade --force-reinstall playwright
python3 -m playwright install chromium
```

### Issue: "HTTPS certificate error"

The script automatically ignores self-signed certificates (`ignore_https_errors=True`). If still failing:

```bash
# Check your certificate
curl -k https://localhost  # Should show HTML response

# If that fails, check Nginx config
docker logs ft-nginx-1
```

### Issue: "Screenshots are blank or timeout"

Add more delay in `capture_screenshots.py`:

```python
# Increase global delay
DELAY = 2000  # 2 seconds instead of 1

# Or per-flow
{
    "name": "Slow Page",
    "delay": 5000,  # 5 seconds for this page
    ...
}
```

### Issue: "Permission denied" on shell scripts

```bash
chmod +x capture_screenshots.py
chmod +x optimize_screenshots.sh
chmod +x update_report_with_screenshots.sh
```

---

## Integration with CI/CD

### GitHub Actions Automated Capture

Create `.github/workflows/capture-ui.yml`:

```yaml
name: Auto-Capture Screenshots

on:
  workflow_dispatch  # Manual trigger
  # Uncomment for weekly automatic capture:
  # schedule:
  #   - cron: '0 2 * * 0'

jobs:
  capture:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y imagemagick
          pip3 install playwright
          python3 -m playwright install chromium
      
      - name: Start services
        run: |
          docker-compose -f docker-compose.yml up -d
          sleep 60
      
      - name: Capture and optimize
        run: |
          python3 capture_screenshots.py
          bash optimize_screenshots.sh
      
      - name: Regenerate report
        run: |
          cd documentation/project-report
          pdflatex -interaction=nonstopmode project_report.tex
      
      - name: Commit and push
        run: |
          git config --global user.email "bot@transcendence.dev"
          git config --global user.name "Screenshot Bot"
          git add documentation/project-report/figures/
          git add documentation/project-report/project_report.pdf
          git commit -m "Auto-update: UI screenshots [skip ci]" || true
          git push
```

Then trigger manually from GitHub Actions UI.

---

## File Organization

After running the capture pipeline:

```
documentation/project-report/
├── figures/
│   ├── 1_https_evidence.png
│   ├── 2_login_UI.png
│   ├── 3_create_new_account_UI.png
│   ├── 2_Oauth_2Step_verification.png
│   ├── 3_Forget_Password.png
│   ├── 3_Main_Menu.png
│   ├── game_modes.png
│   ├── 4_playemode_game_settings.png
│   ├── multiplayer_arcade.png
│   ├── Campaign_game_running.png
│   ├── coop_game_level_up.png
│   ├── gamemode_tournament.png
│   ├── tournament_bracket_matches.png
│   ├── 13_dashboard_profile.png
│   ├── 14_game_statistics.png
│   └── 15_history_matches.png
├── project_report.tex     (references all figures)
└── project_report.pdf     (generated from LaTeX)
```

All figures are automatically referenced in `project_report.tex` via:
```latex
\graphicspath{{figures/}}
\includegraphics[width=0.60\textwidth]{2_login_UI.png}
```

---

## Best Practices

✅ **Do:**
- Run full pipeline weekly to keep figures current
- Optimize images before committing (saves 30-50% size)
- Use descriptive filenames with numbers for ordering
- Test on staging environment before production changes
- Review generated PDF before pushing to git

❌ **Don't:**
- Manually edit figures directory (use automation scripts)
- Commit unoptimized images (increases repo size)
- Use screenshots at full screen resolution (1920×1080 is maximum)
- Forget to wait for services before capturing (will get blank screenshots)
- Capture in backgrounds with active windows (distracting)

---

## Quick Reference

| Task | Command |
|------|---------|
| **Full pipeline** | `./update_report_with_screenshots.sh` |
| **Capture only** | `python3 capture_screenshots.py` |
| **Optimize only** | `bash optimize_screenshots.sh` |
| **Generate PDF** | `cd docs/project-report && pdflatex project_report.tex` |
| **View figures** | `ls -lh documentation/project-report/figures/` |
| **Check service** | `curl -k https://localhost` |

---

## Support

For issues or enhancements:

1. Check logs: `/tmp/capture-and-report-*.log`
2. Run with verbose output: `bash -x update_report_with_screenshots.sh`
3. Test services: `docker ps`, `docker logs <container>`
4. Update script URLs if your routing changes

---

**Last updated:** December 9, 2025
