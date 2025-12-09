#!/usr/bin/env python3
"""
Continuous UI change detector and auto-capturer
Monitors for UI changes and automatically captures new screenshots
"""

import asyncio
import os
import json
import time
import hashlib
from pathlib import Path
from datetime import datetime
import logging
import subprocess

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

BASE_URL = os.getenv("BASE_URL", "https://localhost")
SCREENSHOTS_DIR = Path("./documentation/project-report/figures")
CACHE_FILE = SCREENSHOTS_DIR.parent / ".ui_cache.json"
CHECK_INTERVAL = 300  # Check every 5 minutes
BATCH_UPDATE_SCRIPT = Path(__file__).parent / "batch_update_figures.sh"


class UIChangeDetector:
    def __init__(self):
        self.cache = self.load_cache()
        self.changes_detected = {}
    
    def load_cache(self):
        """Load cached UI hashes"""
        if CACHE_FILE.exists():
            with open(CACHE_FILE) as f:
                return json.load(f)
        return {}
    
    def save_cache(self):
        """Save UI hashes to cache"""
        with open(CACHE_FILE, 'w') as f:
            json.dump(self.cache, f, indent=2)
    
    async def check_ui_health(self):
        """Check if UI is responsive"""
        try:
            result = subprocess.run(
                ["curl", "-s", "-k", "-o", "/dev/null", "-w", "%{http_code}", BASE_URL],
                capture_output=True,
                timeout=10,
                text=True
            )
            return result.stdout.strip() in ["200", "301", "302"]
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    async def check_ui_changes(self):
        """Check for UI changes by comparing key endpoints"""
        from playwright.async_api import async_playwright
        
        check_urls = [
            ("/", "home"),
            ("/login", "login"),
            ("/menu", "menu"),
            ("/profile", "profile"),
        ]
        
        changes = {}
        
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                for url, name in check_urls:
                    try:
                        full_url = f"{BASE_URL}{url}"
                        await page.goto(full_url, timeout=15000)
                        
                        # Get page content hash
                        content = await page.content()
                        current_hash = hashlib.md5(content.encode()).hexdigest()
                        
                        cached_hash = self.cache.get(name, {}).get("hash")
                        
                        if cached_hash and cached_hash != current_hash:
                            changes[name] = {
                                "url": url,
                                "old_hash": cached_hash,
                                "new_hash": current_hash,
                                "timestamp": datetime.now().isoformat()
                            }
                            logger.info(f"Change detected in {name}")
                        
                        # Update cache
                        self.cache[name] = {
                            "hash": current_hash,
                            "last_checked": datetime.now().isoformat(),
                            "url": url
                        }
                    
                    except Exception as e:
                        logger.warning(f"Could not check {name}: {e}")
                
                await browser.close()
        
        except Exception as e:
            logger.error(f"Change detection failed: {e}")
        
        self.save_cache()
        return changes


async def auto_capture_on_change():
    """Monitor UI and capture on changes"""
    detector = UIChangeDetector()
    consecutive_failures = 0
    max_failures = 3
    
    logger.info(f"Starting UI change detector")
    logger.info(f"Check interval: {CHECK_INTERVAL}s")
    logger.info(f"Base URL: {BASE_URL}")
    logger.info("-" * 60)
    
    while True:
        try:
            # Check if UI is healthy
            is_healthy = await detector.check_ui_health()
            
            if not is_healthy:
                consecutive_failures += 1
                if consecutive_failures >= max_failures:
                    logger.error(f"UI unhealthy for {consecutive_failures} checks. Stopping.")
                    break
                logger.warning(f"UI unhealthy ({consecutive_failures}/{max_failures})")
                await asyncio.sleep(CHECK_INTERVAL)
                continue
            
            consecutive_failures = 0
            
            # Check for changes
            logger.info("Checking for UI changes...")
            changes = await detector.check_ui_changes()
            
            if changes:
                logger.info(f"📊 Changes detected in {len(changes)} page(s):")
                for page, change_info in changes.items():
                    logger.info(f"  - {page} ({change_info['timestamp']})")
                
                # Auto-capture on changes
                logger.info("🎬 Starting auto-capture...")
                try:
                    # Run batch capture for changed areas
                    for page in changes.keys():
                        logger.info(f"Capturing {page}...")
                        # Could map page name to category for selective capture
                    
                    # Run full batch update
                    result = subprocess.run(
                        [
                            "bash",
                            str(BATCH_UPDATE_SCRIPT),
                            "all",
                            "--no-optimize"  # Optimize separately for speed
                        ],
                        capture_output=True,
                        text=True
                    )
                    
                    if result.returncode == 0:
                        logger.info("✅ Auto-capture successful")
                        # Git commit
                        subprocess.run(
                            ["git", "add", "documentation/project-report/figures/"],
                            cwd=Path(__file__).parent.parent.parent
                        )
                        subprocess.run(
                            [
                                "git", "commit", "-m",
                                f"Auto-capture: UI changes detected ({datetime.now().strftime('%Y-%m-%d %H:%M')})"
                            ],
                            cwd=Path(__file__).parent.parent.parent
                        )
                    else:
                        logger.error(f"Auto-capture failed:\n{result.stderr}")
                
                except Exception as e:
                    logger.error(f"Error during auto-capture: {e}")
            else:
                logger.info("✓ No changes detected")
            
            # Wait for next check
            logger.info(f"Next check in {CHECK_INTERVAL}s\n")
            await asyncio.sleep(CHECK_INTERVAL)
        
        except KeyboardInterrupt:
            logger.info("Stopping detector (Ctrl+C)")
            break
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            await asyncio.sleep(CHECK_INTERVAL)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="UI change detector and auto-capturer")
    parser.add_argument(
        "--interval",
        type=int,
        default=CHECK_INTERVAL,
        help=f"Check interval in seconds (default: {CHECK_INTERVAL})"
    )
    parser.add_argument(
        "--check-once",
        action="store_true",
        help="Check once and exit"
    )
    
    args = parser.parse_args()
    
    # Set check interval from args
    global CHECK_INTERVAL
    CHECK_INTERVAL = args.interval
    
    try:
        if args.check_once:
            # Single check
            detector = UIChangeDetector()
            asyncio.run(detector.check_ui_changes())
        else:
            # Continuous monitoring
            asyncio.run(auto_capture_on_change())
    
    except KeyboardInterrupt:
        logger.info("Stopped")


if __name__ == "__main__":
    main()
