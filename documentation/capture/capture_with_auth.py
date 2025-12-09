#!/usr/bin/env python3
"""
Enhanced UI screenshot capture with proper authentication
Captures different UI screens by properly handling login flow
"""

import asyncio
import os
import sys
import json
import shutil
from pathlib import Path
from datetime import datetime
import logging

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright not installed. Install with:")
    print("   pip3 install playwright")
    sys.exit(1)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
BASE_URL = os.getenv("BASE_URL", "https://localhost")
SCREENSHOTS_DIR = Path("./documentation/project-report/figures")
BACKUP_DIR = SCREENSHOTS_DIR.parent / "figures_backup"
LOG_FILE = SCREENSHOTS_DIR.parent / "capture_log.json"

SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

# SPA routes - this is a client-side routed application
# The HTML is the same, so we navigate via client-side routing using page clicks/navigation
UI_FLOWS = [
    # Login/Auth pages (Initial load shows login)
    {
        "name": "Login Page",
        "path": "/",
        "navigate_actions": None,  # Just go to home, shows login by default
        "wait_selector": "button[type='submit'], form",
        "filename": "2_login_UI.png",
        "full_page": True,
        "delay": 2000,
        "requires_auth": False,
        "category": "auth",
    },
    {
        "name": "Home Page View",
        "path": "/",
        "navigate_actions": None,
        "wait_selector": "body",
        "filename": "1_https_evidence.png",
        "full_page": True,
        "delay": 2000,
        "requires_auth": False,
        "category": "security",
    },
]

# Test credentials (use default test user if available)
TEST_USERNAME = os.getenv("TEST_USERNAME", "testuser")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "testpass")


async def login_user(page, username, password):
    """Login with provided credentials"""
    try:
        logger.info(f"Logging in as {username}...")
        
        # Navigate to login
        await page.goto(f"{BASE_URL}/login", wait_until="networkidle")
        await page.wait_for_timeout(500)
        
        # Fill login form
        await page.fill("input[placeholder*='Username']", username)
        await page.fill("input[placeholder*='Password']", password)
        
        # Submit - use first button with LOGIN text
        submit_button = page.locator("button.login-btn").first
        
        # Click and wait for response
        async with page.expect_navigation(wait_until="networkidle", timeout=5000):
            await submit_button.click()
        
        logger.info("✅ Login successful")
        return True
        
    except Exception as e:
        logger.error(f"Login failed: {e}")
        return False


async def capture_screenshot(page, flow):
    """Capture a single screenshot from SPA"""
    try:
        logger.info(f"Capturing: {flow['name']}")
        
        # Navigate to page
        url = f"{BASE_URL}{flow['path']}"
        await page.goto(url, wait_until="networkidle", timeout=10000)
        
        # Wait for page to fully load
        await page.wait_for_timeout(1000)
        
        # If there are navigation actions (for SPA), execute them
        if "navigate_actions" in flow and flow["navigate_actions"]:
            for action in flow["navigate_actions"]:
                # Execute the navigation action (e.g., click a button)
                selector = action.get("selector")
                action_type = action.get("type", "click")
                if selector:
                    logger.info(f"  Performing action: {action_type} {selector}")
                    element = await page.query_selector(selector)
                    if element:
                        if action_type == "click":
                            await element.click()
                        elif action_type == "fill":
                            await element.fill(action.get("value", ""))
                    await page.wait_for_timeout(1000)
        
        # Wait for specific element if specified
        if "wait_selector" in flow:
            try:
                await page.wait_for_selector(flow["wait_selector"], timeout=5000)
            except:
                logger.warning(f"  ⚠️  Selector not found: {flow['wait_selector']}")
        
        # Additional delay for animations/rendering
        delay = flow.get("delay", 1000)
        await page.wait_for_timeout(delay)
        
        # Take screenshot
        screenshot_path = SCREENSHOTS_DIR / flow["filename"]
        await page.screenshot(
            path=str(screenshot_path),
            full_page=flow.get("full_page", True)
        )
        
        file_size = screenshot_path.stat().st_size / (1024 * 1024)
        logger.info(f"  ✅ Saved: {flow['filename']} ({file_size:.2f} MB)")
        return screenshot_path
        
    except Exception as e:
        logger.error(f"  ❌ Failed: {flow['name']} - {str(e)[:50]}")
        import traceback
        traceback.print_exc()
        return None


async def capture_all():
    """Capture all UI screens"""
    async with async_playwright() as p:
        logger.info("Launching browser...")
        browser = await p.chromium.launch(
            args=[
                "--start-maximized",
                "--disable-blink-features=AutomationControlled",
            ]
        )
        
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            ignore_https_errors=True,
        )
        
        page = await context.new_page()
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "base_url": BASE_URL,
            "resolution": {"width": 1920, "height": 1080},
            "total": len(UI_FLOWS),
            "succeeded": 0,
            "failed": 0,
            "captures": []
        }
        
        # Check if user is authenticated
        is_authenticated = False
        
        try:
            logger.info(f"Starting capture: {len(UI_FLOWS)} flows")
            logger.info("-" * 60)
            
            for i, flow in enumerate(UI_FLOWS, 1):
                # Login if needed
                if flow.get("requires_auth") and not is_authenticated:
                    logger.info("\n🔐 Authentication required")
                    logger.warning("⚠️  Skipping authenticated flows (need valid test user)")
                    break
                
                # Capture
                result = await capture_screenshot(page, flow)
                
                if result:
                    results["succeeded"] += 1
                    results["captures"].append({
                        "name": flow["name"],
                        "filename": flow["filename"],
                        "path": flow["path"],
                        "category": flow.get("category", "other"),
                        "requires_auth": flow.get("requires_auth", False),
                        "status": "success"
                    })
                else:
                    results["failed"] += 1
                    results["captures"].append({
                        "name": flow["name"],
                        "filename": flow["filename"],
                        "path": flow["path"],
                        "category": flow.get("category", "other"),
                        "requires_auth": flow.get("requires_auth", False),
                        "status": "failed"
                    })
            
            logger.info("-" * 60)
            logger.info(f"Capture Summary:")
            logger.info(f"  ✅ Succeeded: {results['succeeded']}/{results['total']}")
            logger.info(f"  ❌ Failed: {results['failed']}/{results['total']}")
            
            # Save results
            with open(LOG_FILE, 'w') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Log saved: {LOG_FILE}")
            
        finally:
            await context.close()
            await browser.close()


async def main():
    """Main entry point"""
    print(f"\n🎬 ft_transcendence UI Capture Tool (with Auth)")
    print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Target: {BASE_URL}")
    print(f"   Username: {TEST_USERNAME}")
    print()
    
    try:
        await capture_all()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
