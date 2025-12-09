# UI Screenshot Automation Guide for ft_transcendence

## Overview
This guide explains how to automatically capture high-quality UI screenshots from the running ft_transcendence application and integrate them into the project report.

## Prerequisites

### 1. Install Required Tools

#### For Linux (Ubuntu/Debian):
```bash
# Screenshot capture tools
sudo apt-get install -y scrot imagemagick ffmpeg

# For headless browser automation
sudo apt-get install -y chromium-browser chromium-chromedriver

# For Python automation
sudo apt-get install -y python3 python3-pip python3-venv

# Install Python dependencies
pip3 install selenium pillow playwright pytest pyscreenshot
```

#### For macOS:
```bash
brew install imagemagick ffmpeg
brew install chromium
pip3 install selenium pillow playwright pytest
```

#### For Windows (PowerShell):
```powershell
# Using chocolatey
choco install imagemagick ffmpeg chromium python
pip install selenium pillow playwright pytest
```

## Method 1: Playwright Automation (RECOMMENDED)

Playwright is excellent for automated browser testing and screenshot capture.

### Setup Playwright

```bash
cd /home/honguyen/ft_transcendence
pip3 install playwright
playwright install chromium
```

### Create Capture Script: `capture_screenshots.py`

```python
#!/usr/bin/env python3
"""
Automated UI screenshot capture for ft_transcendence
Captures high-quality screenshots at 1920x1080 resolution
"""

import asyncio
import os
from pathlib import Path
from datetime import datetime
from playwright.async_api import async_playwright

# Configuration
BASE_URL = "https://localhost"
SCREENSHOTS_DIR = "./documentation/project-report/figures"
RESOLUTION = {"width": 1920, "height": 1080}
DELAY = 1000  # ms between actions

# Ensure figures directory exists
Path(SCREENSHOTS_DIR).mkdir(parents=True, exist_ok=True)

async def capture_ui_flows():
    """Capture all major UI flows and screens"""
    
    async with async_playwright() as p:
        # Launch browser with high DPI scaling
        browser = await p.chromium.launch(
            args=["--start-maximized", "--force-device-scale-factor=2"]
        )
        
        context = await browser.new_context(
            viewport=RESOLUTION,
            ignore_https_errors=True  # For self-signed certificates
        )
        
        page = await context.new_page()
        
        try:
            print("🎬 Starting UI capture sequence...")
            
            # 1. HTTPS/Security Evidence
            print("📸 Capturing HTTPS evidence...")
            await page.goto(BASE_URL, wait_until="networkidle")
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/1_https_evidence.png",
                full_page=False
            )
            
            # 2. Login Page
            print("📸 Capturing login UI...")
            await page.goto(f"{BASE_URL}/login", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/2_login_UI.png",
                full_page=True
            )
            
            # 3. Registration Page
            print("📸 Capturing registration UI...")
            await page.goto(f"{BASE_URL}/register", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/3_create_new_account_UI.png",
                full_page=True
            )
            
            # 4. 2FA Setup
            print("📸 Capturing 2FA verification UI...")
            # Navigate to 2FA page (adjust URL based on your routing)
            await page.goto(f"{BASE_URL}/auth/2fa", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/2_Oauth_2Step_verification.png",
                full_page=True
            )
            
            # 5. Password Reset
            print("📸 Capturing password recovery UI...")
            await page.goto(f"{BASE_URL}/forgot-password", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/3_Forget_Password.png",
                full_page=True
            )
            
            # 6. Main Menu
            print("📸 Capturing main menu...")
            await page.goto(f"{BASE_URL}/menu", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/3_Main_Menu.png",
                full_page=True
            )
            
            # 7. Game Modes
            print("📸 Capturing game modes screen...")
            await page.goto(f"{BASE_URL}/game-modes", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/game_modes.png",
                full_page=True
            )
            
            # 8. Game Settings
            print("📸 Capturing game settings...")
            await page.goto(f"{BASE_URL}/game/settings", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/4_playemode_game_settings.png",
                full_page=True
            )
            
            # 9. Arcade Mode
            print("📸 Capturing arcade gameplay...")
            await page.goto(f"{BASE_URL}/game/arcade", wait_until="networkidle")
            await page.wait_for_timeout(2000)  # Wait for game to load
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/multiplayer_arcade.png",
                full_page=False
            )
            
            # 10. Campaign Mode
            print("📸 Capturing campaign gameplay...")
            await page.goto(f"{BASE_URL}/game/campaign", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/Campaign_game_running.png",
                full_page=False
            )
            
            # 11. Campaign Level Up
            print("📸 Capturing campaign level progression...")
            await page.goto(f"{BASE_URL}/game/campaign/level-up", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/coop_game_level_up.png",
                full_page=True
            )
            
            # 12. Tournament Mode
            print("📸 Capturing tournament mode...")
            await page.goto(f"{BASE_URL}/game/tournament", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/gamemode_tournament.png",
                full_page=True
            )
            
            # 13. Tournament Bracket
            print("📸 Capturing tournament bracket...")
            await page.goto(f"{BASE_URL}/tournament/bracket", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/tournament_bracket_matches.png",
                full_page=True
            )
            
            # 14. User Dashboard
            print("📸 Capturing user dashboard...")
            await page.goto(f"{BASE_URL}/profile", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/13_dashboard_profile.png",
                full_page=True
            )
            
            # 15. Game Statistics
            print("📸 Capturing game statistics...")
            await page.goto(f"{BASE_URL}/stats", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/14_game_statistics.png",
                full_page=True
            )
            
            # 16. Match History
            print("📸 Capturing match history...")
            await page.goto(f"{BASE_URL}/history", wait_until="networkidle")
            await page.wait_for_timeout(DELAY)
            await page.screenshot(
                path=f"{SCREENSHOTS_DIR}/15_history_matches.png",
                full_page=True
            )
            
            print("\n✅ All screenshots captured successfully!")
            print(f"📁 Figures saved to: {SCREENSHOTS_DIR}")
            
        finally:
            await context.close()
            await browser.close()

# Run capture
if __name__ == "__main__":
    asyncio.run(capture_ui_flows())
```

### Run Playwright Capture

```bash
cd /home/honguyen/ft_transcendence
python3 capture_screenshots.py
```

## Method 2: Selenium WebDriver

Alternative using Selenium (more compatible with legacy systems):

```python
#!/usr/bin/env python3
"""Selenium-based UI screenshot capture"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pathlib import Path
import time

BASE_URL = "https://localhost"
SCREENSHOTS_DIR = "./documentation/project-report/figures"

Path(SCREENSHOTS_DIR).mkdir(parents=True, exist_ok=True)

# Chrome options for high resolution
chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--window-size=1920,1080")
chrome_options.add_argument("--force-device-scale-factor=2")
chrome_options.add_argument("--disable-blink-features=AutomationControlled")
chrome_options.add_argument("--ignore-certificate-errors")

driver = webdriver.Chrome(options=chrome_options)

try:
    # Capture login screen
    print("📸 Capturing login screen...")
    driver.get(f"{BASE_URL}/login")
    driver.implicitly_wait(3)
    driver.save_screenshot(f"{SCREENSHOTS_DIR}/2_login_UI.png")
    
    # Capture registration
    print("📸 Capturing registration...")
    driver.get(f"{BASE_URL}/register")
    driver.implicitly_wait(3)
    driver.save_screenshot(f"{SCREENSHOTS_DIR}/3_create_new_account_UI.png")
    
    # ... more captures
    
    print("✅ Screenshots captured!")
    
finally:
    driver.quit()
```

## Method 3: Manual Screen Recording + Frame Extraction

Capture video of gameplay, then extract key frames:

```bash
# Record screen for 30 seconds
ffmpeg -f x11grab -s 1920x1080 -r 30 -i :0 -t 30 output_video.mp4

# Extract specific frame at timestamp
ffmpeg -i output_video.mp4 -ss 00:00:10 -vframes 1 frame_10sec.png

# Extract multiple frames at intervals
ffmpeg -i output_video.mp4 -vf fps=0.25 frame_%04d.png
```

## Method 4: Docker Container Screenshots

If running in Docker, capture from container:

```bash
# Get container ID
CONTAINER_ID=$(docker ps --filter "name=frontend" -q)

# Capture display
docker exec -e DISPLAY=:99 $CONTAINER_ID \
  import -window root /tmp/screenshot.png

# Copy from container
docker cp $CONTAINER_ID:/tmp/screenshot.png ./figures/
```

## Image Optimization & Conversion

### Resize Images to Standard Resolution

```bash
#!/bin/bash
# optimize_screenshots.sh

FIGURES_DIR="./documentation/project-report/figures"

# Resize to 1280x720 (standard HD)
for img in $FIGURES_DIR/*.png; do
    echo "Optimizing $(basename $img)..."
    convert "$img" -resize 1280x720 -quality 95 "$img"
done

# Reduce file size while maintaining quality
mogrify -quality 85 -strip $FIGURES_DIR/*.png
```

Run optimization:
```bash
chmod +x optimize_screenshots.sh
./optimize_screenshots.sh
```

### Batch Convert to PNG from Other Formats

```bash
#!/bin/bash
# Convert all formats to PNG

for file in $FIGURES_DIR/*; do
    if [[ "$file" == *.jpg ]] || [[ "$file" == *.jpeg ]]; then
        echo "Converting $(basename $file)..."
        convert "$file" "${file%.*}.png"
        rm "$file"
    fi
done
```

### Add Watermark/Border (Optional)

```bash
#!/bin/bash
# add_borders.sh - Add frame to screenshots

for img in ./figures/*.png; do
    convert "$img" -bordercolor white -border 5 \
            -bordercolor grey -border 1 "$img"
done
```

## Automated CI/CD Screenshot Pipeline

### GitHub Actions Workflow

Create `.github/workflows/capture-screenshots.yml`:

```yaml
name: Capture UI Screenshots

on:
  workflow_dispatch:  # Manual trigger
  schedule:
    - cron: '0 2 * * 0'  # Weekly

jobs:
  capture:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y python3-pip chromium-chromedriver
          pip3 install playwright pillow
          playwright install chromium
      
      - name: Start services
        run: |
          docker-compose -f docker-compose.yml up -d
          sleep 30  # Wait for services
      
      - name: Capture screenshots
        run: python3 capture_screenshots.py
      
      - name: Optimize images
        run: ./optimize_screenshots.sh
      
      - name: Commit and push changes
        run: |
          git config --global user.email "bot@example.com"
          git config --global user.name "Screenshot Bot"
          git add documentation/project-report/figures/
          git commit -m "Update UI screenshots [ci skip]" || true
          git push
```

## Quick Script Template

Save as `capture_ui.sh`:

```bash
#!/bin/bash
set -e

FIGURES_DIR="./documentation/project-report/figures"
BASE_URL="https://localhost"

echo "🎬 Starting UI capture..."

# Create figures directory
mkdir -p $FIGURES_DIR

# Start services
echo "🚀 Starting services..."
docker-compose up -d
sleep 30

# Wait for services to be ready
echo "⏳ Waiting for services..."
while ! curl -s -k $BASE_URL > /dev/null; do
    echo "  Waiting..."
    sleep 5
done

# Run capture script
echo "📸 Capturing screenshots..."
python3 << 'EOF'
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1920, "height": 1080})
        
        # Capture login
        await page.goto("https://localhost/login", wait_until="networkidle")
        await page.screenshot(path="./documentation/project-report/figures/2_login_UI.png")
        
        print("✅ Screenshots captured!")
        await browser.close()

asyncio.run(main())
EOF

# Optimize images
echo "🖼️ Optimizing images..."
convert $FIGURES_DIR/*.png -quality 90 -strip $FIGURES_DIR/*.png 2>/dev/null || true

echo "✅ Complete! Figures updated in $FIGURES_DIR"
```

Run it:
```bash
chmod +x capture_ui.sh
./capture_ui.sh
```

## Best Practices

1. **Resolution Standards:**
   - Capture at 1920×1080 (Full HD)
   - Scale for docs: 1280×720 (720p)

2. **Image Quality:**
   - PNG format for crisp screenshots
   - JPEG for large gameplay videos
   - Quality: 85-95% for balance

3. **Naming Convention:**
   - Use descriptive names: `03_login_UI.png`
   - Number prefixes for ordering
   - Keep consistent naming

4. **Timing & Delays:**
   - Add 1-2s waits for page loads
   - 2-3s for animations
   - Use `wait_until="networkidle"` in Playwright

5. **Version Control:**
   - Commit figures to git
   - Use `.gitattributes` for large files:
     ```
     *.png filter=lfs diff=lfs merge=lfs -text
     *.jpg filter=lfs diff=lfs merge=lfs -text
     ```

## Troubleshooting

### Screenshots are blank
```bash
# Add wait time
await page.wait_for_timeout(2000)

# Or wait for specific element
await page.wait_for_selector('.game-canvas', timeout=5000)
```

### HTTPS certificate errors
```python
# Ignore self-signed certs in Playwright
context = await browser.new_context(ignore_https_errors=True)

# In Selenium
chrome_options.add_argument("--ignore-certificate-errors")
```

### Playwright/Selenium not found
```bash
# Reinstall with proper PATH
pip3 install --upgrade --force-reinstall playwright selenium
playwright install chromium
```

## Integration with Report

After capturing new figures:

```bash
# 1. Capture screenshots
python3 capture_screenshots.py

# 2. Optimize
./optimize_screenshots.sh

# 3. Regenerate PDF report
cd documentation/project-report
pdflatex -interaction=nonstopmode project_report.tex

# 4. Commit
git add figures/ project_report.pdf
git commit -m "Update UI figures with latest captures"
```

## Summary

| Method | Best For | Effort | Quality |
|--------|----------|--------|---------|
| Playwright | Automation, CI/CD | Low | Excellent |
| Selenium | Cross-browser, Testing | Medium | Good |
| Manual + FFmpeg | Video gameplay | Low | Good |
| Docker exec | Container apps | Medium | Good |

**Recommended:** Use **Playwright** for automated capture + **GitHub Actions** for continuous updates.
