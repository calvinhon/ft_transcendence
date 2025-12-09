# Auto Capture Implementation Guide

Complete implementation of automated UI screenshot capture and figure updates.

## 📋 What's Implemented

### 1. Enhanced Screenshot Capture (`capture_screenshots_enhanced.py`)

Advanced Playwright-based capture with:
- **Retry logic**: Automatic retry on failure (up to 2 attempts)
- **Batch processing**: Capture multiple flows efficiently
- **Category filtering**: Capture specific UI sections (auth, gameplay, profile, etc.)
- **Backup system**: Automatic backup before overwriting
- **Detailed logging**: Track capture progress and results
- **JSON logging**: Store results for post-processing
- **Optional flows**: Skip non-critical captures if pages don't exist

**Features**:
```bash
# Capture everything
python3 capture_screenshots_enhanced.py

# Capture specific category
python3 capture_screenshots_enhanced.py --category auth
python3 capture_screenshots_enhanced.py --category gameplay
python3 capture_screenshots_enhanced.py --category tournament
python3 capture_screenshots_enhanced.py --category profile

# List categories
python3 capture_screenshots_enhanced.py --list-categories

# List all capture flows
python3 capture_screenshots_enhanced.py --list-flows

# Adjust logging
python3 capture_screenshots_enhanced.py --log-level DEBUG
```

### 2. Batch Update Script (`batch_update_figures.sh`)

Orchestrates complete pipeline with selective options:
- Capture → Optimize → Generate PDF → Commit

**Usage**:
```bash
# Full pipeline (all categories)
bash batch_update_figures.sh

# Specific category
bash batch_update_figures.sh auth
bash batch_update_figures.sh gameplay

# Skip optimization
bash batch_update_figures.sh all --no-optimize

# Skip PDF regeneration
bash batch_update_figures.sh all --no-pdf

# List available categories
bash batch_update_figures.sh list

# Show all capture flows
bash batch_update_figures.sh list-flows
```

### 3. UI Change Detector (`ui_change_detector.py`)

Continuous monitoring system that:
- Polls specified UI endpoints at regular intervals
- Detects content changes using MD5 hashing
- Automatically triggers captures when changes detected
- Commits changes to git
- Maintains cache of UI states

**Usage**:
```bash
# Start continuous monitoring (checks every 5 minutes)
python3 ui_change_detector.py

# Custom check interval (30 seconds)
python3 ui_change_detector.py --interval 30

# Single check and exit
python3 ui_change_detector.py --check-once
```

---

## 🚀 Quick Start Examples

### Example 1: Update Authentication Screenshots

```bash
bash documentation/capture/batch_update_figures.sh auth
```

This will:
1. Capture login, registration, 2FA, password reset screens
2. Optimize the PNG files
3. Regenerate the PDF report
4. Show summary

### Example 2: Update Gameplay Screens Only (Fast)

```bash
bash documentation/capture/batch_update_figures.sh gameplay --no-optimize
```

Captures faster by skipping optimization. Run separately:
```bash
bash documentation/capture/optimize_screenshots.sh
```

### Example 3: Full Update Without Report Regeneration

```bash
bash documentation/capture/batch_update_figures.sh all --no-pdf
```

Useful when you want to update figures but regenerate the report separately:
```bash
cd documentation/project-report
pdflatex -interaction=nonstopmode project_report.tex
```

### Example 4: Continuous Auto-Capture

Start monitoring in a terminal:
```bash
python3 documentation/capture/ui_change_detector.py --interval 60
```

Then continue working. The detector will:
- Check UI every 60 seconds
- Automatically capture when changes detected
- Commit changes with timestamp
- Log all activity

### Example 5: Check What's Available

```bash
# See available categories
bash documentation/capture/batch_update_figures.sh list

# See all capture flows
bash documentation/capture/batch_update_figures.sh list-flows
```

---

## 📊 Available Categories

| Category | Captures | Purpose |
|----------|----------|---------|
| **security** | HTTPS evidence, certificates | Security & SSL verification |
| **auth** | Login, register, 2FA, password reset | Authentication flows |
| **gameplay** | Menu, game modes, settings | Core game UI |
| **arcade** | Arcade mode gameplay | Arcade mode specific |
| **campaign** | Campaign mode, levels, progression | Campaign mode flows |
| **tournament** | Tournament UI, brackets, matches | Tournament system |
| **profile** | Dashboard, stats, history | User profile & stats |
| **blockchain** | Blockchain records | Blockchain integration |

---

## 🔄 Workflows

### Workflow A: Daily UI Updates

```bash
# Morning check and capture
bash documentation/capture/batch_update_figures.sh all
```

Full pipeline: capture → optimize → PDF update → commit

**Time**: 5-10 minutes

### Workflow B: Quick Screenshot Refresh

```bash
# Capture only
python3 documentation/capture/capture_screenshots_enhanced.py

# Later, optimize and regenerate
bash documentation/capture/optimize_screenshots.sh
cd documentation/project-report && pdflatex project_report.tex
```

**Time**: 2-3 minutes for capture

### Workflow C: Targeted Updates

```bash
# Update only auth-related screens
bash documentation/capture/batch_update_figures.sh auth

# Then update gameplay
bash documentation/capture/batch_update_figures.sh gameplay

# Finally generate report once
bash documentation/capture/optimize_screenshots.sh
cd documentation/project-report && pdflatex project_report.tex
```

### Workflow D: Continuous Monitoring

```bash
# Terminal 1: Start detector
python3 documentation/capture/ui_change_detector.py --interval 300

# Terminal 2: Continue developing
# Detector will auto-capture on UI changes
```

---

## 📁 Generated Files

### Backups
```
documentation/project-report/figures_backup/
├── figures_20231209_130000/     (auto-created before each capture)
│   ├── 2_login_UI.png
│   ├── 3_Main_Menu.png
│   └── ... (all figures)
```

### Logs
```
documentation/project-report/
├── capture_log.json             (Last capture results)
├── .ui_cache.json              (Change detector cache)
```

### Figures
```
documentation/project-report/figures/
├── 1_https_evidence.png
├── 2_login_UI.png
├── 3_Main_Menu.png
├── ... (36 total)
```

---

## ⚙️ Configuration

### Change Capture Resolution

Edit `capture_screenshots_enhanced.py`:
```python
RESOLUTION = {"width": 1280, "height": 720}  # Default 1920x1080
```

### Change Base URL

```bash
# Run with custom URL
BASE_URL=https://prod-server:8443 python3 capture_screenshots_enhanced.py
```

### Add New Capture Flow

Edit `UI_FLOWS` in `capture_screenshots_enhanced.py`:

```python
UI_FLOWS = [
    # ... existing flows ...
    {
        "name": "New Feature Page",
        "url": f"{BASE_URL}/new-feature",
        "wait": "networkidle",
        "filename": "new_feature_screenshot.png",
        "full_page": True,
        "delay": 1000,
        "category": "gameplay",
        "optional": False,  # Required or optional
    },
]
```

Then it's automatically available:
```bash
python3 capture_screenshots_enhanced.py
bash batch_update_figures.sh
```

### Change Detection Interval

```bash
# Check for changes every 2 minutes (120 seconds)
python3 ui_change_detector.py --interval 120
```

---

## 🔍 Monitoring & Logs

### View Capture Results

```bash
# Pretty-print capture log
cat documentation/project-report/capture_log.json | python3 -m json.tool

# Or with jq (if installed)
jq . documentation/project-report/capture_log.json
```

Sample output:
```json
{
  "timestamp": "2023-12-09T13:30:45.123456",
  "base_url": "https://localhost",
  "total": 28,
  "succeeded": 26,
  "failed": 0,
  "skipped": 2,
  "captures": [
    {
      "name": "Login Page",
      "filename": "2_login_UI.png",
      "category": "auth",
      "status": "success"
    },
    ...
  ]
}
```

### Check Backup Directory

```bash
ls -lh documentation/project-report/figures_backup/
```

### View Change Detection Cache

```bash
cat documentation/project-report/.ui_cache.json | python3 -m json.tool
```

---

## 🐛 Troubleshooting

### Screenshots are blank

```bash
# Increase delay
python3 capture_screenshots_enhanced.py --log-level DEBUG

# Or edit capture_screenshots_enhanced.py
DELAY = 2000  # 2 seconds
```

### Services not responding

```bash
# Check status
curl -k https://localhost

# Start services
make restart
```

### Playwright issues

```bash
# Reinstall
pip3 install --upgrade --force-reinstall playwright
python3 -m playwright install chromium
```

### Out of backups

```bash
# Clean old backups (keep last 5)
cd documentation/project-report/figures_backup
ls -dt */ | tail -n +6 | xargs rm -rf
```

### Git commit fails in detector

```bash
# Configure git
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Then restart detector
python3 ui_change_detector.py
```

---

## 📊 Performance Tips

### Speed up captures

```bash
# Skip optimization
bash batch_update_figures.sh all --no-optimize

# Optimize separately, in parallel
bash optimize_screenshots.sh &

# Capture specific categories instead of all
bash batch_update_figures.sh auth
```

### Reduce file sizes

```bash
# More aggressive optimization
# Edit optimize_screenshots.sh
-quality 75  # Instead of 85

bash optimize_screenshots.sh
```

### Faster CI/CD

```yaml
# GitHub Actions - don't regenerate PDF every time
- name: Update figures only
  run: bash documentation/capture/batch_update_figures.sh all --no-pdf

- name: Regenerate report weekly
  if: github.event.schedule == '0 2 * * 0'
  run: pdflatex -interaction=nonstopmode project_report.tex
```

---

## 🔐 Security Notes

- HTTPS certificate verification is disabled for localhost (unsafe=true)
- Change detector stores MD5 hashes, not sensitive data
- All operations are local unless using CI/CD
- Backups are kept for 5 previous captures

---

## 📈 Scaling

### High-volume captures

For capturing 100+ screens:

```bash
# Split into batches
for category in security auth gameplay tournament profile; do
    python3 capture_screenshots_enhanced.py --category $category &
done

# Wait for all to complete
wait

# Then optimize and compile
bash optimize_screenshots.sh
cd documentation/project-report && pdflatex project_report.tex
```

### Distributed capture

Run captures on different machines:
```bash
# Machine 1
BASE_URL=https://prod1:8443 python3 capture_screenshots_enhanced.py --category auth

# Machine 2
BASE_URL=https://prod2:8443 python3 capture_screenshots_enhanced.py --category gameplay

# Merge results locally
```

---

## 📚 Reference

| Command | Purpose |
|---------|---------|
| `capture_screenshots_enhanced.py` | Core capture tool with advanced features |
| `batch_update_figures.sh` | Complete pipeline orchestrator |
| `ui_change_detector.py` | Continuous monitoring & auto-capture |
| `optimize_screenshots.sh` | Image compression |
| `image_manager.py` | Analysis & reporting |

---

## Next Steps

1. **Test individual scripts**:
   ```bash
   python3 capture_screenshots_enhanced.py --list-flows
   bash batch_update_figures.sh list
   ```

2. **Run first capture**:
   ```bash
   bash batch_update_figures.sh auth
   ```

3. **Set up continuous monitoring** (optional):
   ```bash
   python3 ui_change_detector.py --interval 300 &
   ```

4. **Integrate with CI/CD** (optional):
   - See `.github/workflows/` examples in DETAILED_GUIDE.md
   - Schedule weekly auto-captures
   - Auto-commit on changes

---

**Last updated**: December 9, 2025
