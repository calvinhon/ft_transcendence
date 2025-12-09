#!/usr/bin/env python3
"""
Enhanced UI screenshot capture for ft_transcendence
Features:
- Batch capture with retry logic
- Progress tracking and reporting
- Selective capture (capture specific flows)
- Backup existing figures before overwriting
- Detailed logging
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
    print("   python3 -m playwright install chromium")
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
RESOLUTION = {"width": 1920, "height": 1080}
DELAY = 1000  # ms between actions
IGNORE_HTTPS = True
BACKUP_DIR = SCREENSHOTS_DIR.parent / "figures_backup"
LOG_FILE = SCREENSHOTS_DIR.parent / "capture_log.json"

# Ensure directories exist
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

# Define UI flows to capture
UI_FLOWS = [
    # Security & HTTPS
    {
        "name": "HTTPS Evidence - Home",
        "url": BASE_URL,
        "wait": "networkidle",
        "filename": "1_https_evidence.png",
        "full_page": False,
        "delay": 1000,
        "category": "security",
    },
    {
        "name": "HTTPS - Certificate Info",
        "url": f"{BASE_URL}/cert-info",
        "wait": "networkidle",
        "filename": "2_PEM_certificate_https.png",
        "full_page": True,
        "delay": 1000,
        "category": "security",
        "optional": True,  # Skip if page doesn't exist
    },
    
    # Authentication flows
    {
        "name": "Login Page",
        "url": f"{BASE_URL}/login",
        "wait": "networkidle",
        "filename": "2_login_UI.png",
        "full_page": True,
        "delay": 1000,
        "category": "auth",
    },
    {
        "name": "Registration Page",
        "url": f"{BASE_URL}/register",
        "wait": "networkidle",
        "filename": "3_create_new_account_UI.png",
        "full_page": True,
        "delay": 1000,
        "category": "auth",
    },
    {
        "name": "2FA Verification",
        "url": f"{BASE_URL}/auth/2fa",
        "wait": "networkidle",
        "filename": "2_Oauth_2Step_verification.png",
        "full_page": True,
        "delay": 1000,
        "category": "auth",
    },
    {
        "name": "Password Recovery",
        "url": f"{BASE_URL}/forgot-password",
        "wait": "networkidle",
        "filename": "3_Forget_Password.png",
        "full_page": True,
        "delay": 1000,
        "category": "auth",
    },
    
    # Game UI flows
    {
        "name": "Main Menu",
        "url": f"{BASE_URL}/menu",
        "wait": "networkidle",
        "filename": "3_Main_Menu.png",
        "full_page": True,
        "delay": 1000,
        "category": "gameplay",
    },
    {
        "name": "Game Modes Selection",
        "url": f"{BASE_URL}/game-modes",
        "wait": "networkidle",
        "filename": "game_modes.png",
        "full_page": True,
        "delay": 1000,
        "category": "gameplay",
    },
    {
        "name": "Game Settings",
        "url": f"{BASE_URL}/game/settings",
        "wait": "networkidle",
        "filename": "4_playemode_game_settings.png",
        "full_page": True,
        "delay": 1000,
        "category": "gameplay",
    },
    
    # Arcade mode
    {
        "name": "Arcade Gameplay",
        "url": f"{BASE_URL}/game/arcade",
        "wait": "networkidle",
        "filename": "multiplayer_arcade.png",
        "full_page": False,
        "delay": 2000,
        "category": "arcade",
    },
    {
        "name": "Arcade Multiple Players",
        "url": f"{BASE_URL}/game/arcade/multiplayer",
        "wait": "networkidle",
        "filename": "arcade_multiple_players.png",
        "full_page": False,
        "delay": 2000,
        "category": "arcade",
        "optional": True,
    },
    
    # Campaign mode
    {
        "name": "Campaign Gameplay",
        "url": f"{BASE_URL}/game/campaign",
        "wait": "networkidle",
        "filename": "Campaign_game_running.png",
        "full_page": False,
        "delay": 2000,
        "category": "campaign",
    },
    {
        "name": "Campaign AI Mode",
        "url": f"{BASE_URL}/game/campaign/ai",
        "wait": "networkidle",
        "filename": "coop_campagin_AI_bot.png",
        "full_page": False,
        "delay": 2000,
        "category": "campaign",
        "optional": True,
    },
    {
        "name": "Campaign Level Up",
        "url": f"{BASE_URL}/game/campaign/level-up",
        "wait": "networkidle",
        "filename": "coop_game_level_up.png",
        "full_page": True,
        "delay": 1000,
        "category": "campaign",
        "optional": True,
    },
    {
        "name": "Campaign Retry",
        "url": f"{BASE_URL}/game/campaign/retry",
        "wait": "networkidle",
        "filename": "coop_game_retry.png",
        "full_page": True,
        "delay": 1000,
        "category": "campaign",
        "optional": True,
    },
    
    # Tournament mode
    {
        "name": "Tournament Mode",
        "url": f"{BASE_URL}/game/tournament",
        "wait": "networkidle",
        "filename": "gamemode_tournament.png",
        "full_page": True,
        "delay": 1000,
        "category": "tournament",
    },
    {
        "name": "Tournament Bracket",
        "url": f"{BASE_URL}/tournament/bracket",
        "wait": "networkidle",
        "filename": "tournament_bracket_matches.png",
        "full_page": True,
        "delay": 1000,
        "category": "tournament",
    },
    {
        "name": "Tournament Game",
        "url": f"{BASE_URL}/game/tournament/match",
        "wait": "networkidle",
        "filename": "tournament_game.png",
        "full_page": False,
        "delay": 2000,
        "category": "tournament",
        "optional": True,
    },
    {
        "name": "Tournament Match Result",
        "url": f"{BASE_URL}/tournament/result",
        "wait": "networkidle",
        "filename": "11_tournament_match_result.png",
        "full_page": True,
        "delay": 1000,
        "category": "tournament",
        "optional": True,
    },
    {
        "name": "Tournament Games List",
        "url": f"{BASE_URL}/tournament/games",
        "wait": "networkidle",
        "filename": "tournament_games.png",
        "full_page": True,
        "delay": 1000,
        "category": "tournament",
        "optional": True,
    },
    
    # User profile
    {
        "name": "User Dashboard",
        "url": f"{BASE_URL}/profile",
        "wait": "networkidle",
        "filename": "13_dashboard_profile.png",
        "full_page": True,
        "delay": 1000,
        "category": "profile",
    },
    {
        "name": "Game Statistics",
        "url": f"{BASE_URL}/stats",
        "wait": "networkidle",
        "filename": "14_game_statistics.png",
        "full_page": True,
        "delay": 1000,
        "category": "profile",
    },
    {
        "name": "Match History",
        "url": f"{BASE_URL}/history",
        "wait": "networkidle",
        "filename": "15_history_matches.png",
        "full_page": True,
        "delay": 1000,
        "category": "profile",
    },
    
    # Blockchain
    {
        "name": "Blockchain Record",
        "url": f"{BASE_URL}/blockchain",
        "wait": "networkidle",
        "filename": "12_blockchain_record.png",
        "full_page": True,
        "delay": 1000,
        "category": "blockchain",
        "optional": True,
    },
]


async def capture_screenshot(page, flow, retry_count=0, max_retries=2):
    """Capture a single screenshot with retry logic"""
    try:
        logger.info(f"Capturing: {flow['name']}")
        
        # Navigate to URL
        try:
            await page.goto(
                flow["url"],
                wait_until=flow.get("wait", "networkidle"),
                timeout=30000,
            )
        except Exception as e:
            if flow.get("optional"):
                logger.warning(f"  ⚠️  Skipped (page not found): {flow['name']}")
                return None
            raise
        
        # Additional delay
        delay = flow.get("delay", DELAY)
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
        if retry_count < max_retries:
            logger.warning(f"  ⚠️  Retry {retry_count + 1}/{max_retries}: {str(e)[:50]}")
            await asyncio.sleep(2)  # Wait before retry
            return await capture_screenshot(page, flow, retry_count + 1, max_retries)
        else:
            logger.error(f"  ❌ Failed: {flow['name']}")
            if flow.get("optional"):
                return None
            raise


async def capture_by_category(category=None):
    """Capture specific category or all if category is None"""
    flows = UI_FLOWS
    if category:
        flows = [f for f in UI_FLOWS if f.get("category") == category]
    
    async with async_playwright() as p:
        logger.info(f"Launching browser...")
        browser = await p.chromium.launch(
            args=[
                "--start-maximized",
                "--force-device-scale-factor=2",
                "--disable-blink-features=AutomationControlled",
            ]
        )
        
        context = await browser.new_context(
            viewport=RESOLUTION,
            ignore_https_errors=IGNORE_HTTPS,
        )
        
        page = await context.new_page()
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "base_url": BASE_URL,
            "resolution": RESOLUTION,
            "category": category or "all",
            "total": len(flows),
            "succeeded": 0,
            "failed": 0,
            "skipped": 0,
            "captures": []
        }
        
        try:
            logger.info(f"Starting capture: {len(flows)} flows")
            logger.info("-" * 60)
            
            for flow in flows:
                result = await capture_screenshot(page, flow)
                
                capture_info = {
                    "name": flow["name"],
                    "filename": flow["filename"],
                    "category": flow.get("category", "other"),
                    "status": "success" if result else ("skipped" if flow.get("optional") else "failed")
                }
                results["captures"].append(capture_info)
                
                if result:
                    results["succeeded"] += 1
                elif flow.get("optional"):
                    results["skipped"] += 1
                else:
                    results["failed"] += 1
            
            logger.info("-" * 60)
            logger.info(f"Capture Summary:")
            logger.info(f"  ✅ Succeeded: {results['succeeded']}/{results['total']}")
            logger.info(f"  ⚠️  Skipped: {results['skipped']}/{results['total']}")
            if results['failed'] > 0:
                logger.info(f"  ❌ Failed: {results['failed']}/{results['total']}")
            
            # Save results log
            with open(LOG_FILE, 'w') as f:
                json.dump(results, f, indent=2)
            logger.info(f"Log saved: {LOG_FILE}")
            
            return results
            
        finally:
            await context.close()
            await browser.close()


def backup_existing_figures():
    """Backup existing figures before capturing new ones"""
    if SCREENSHOTS_DIR.exists() and list(SCREENSHOTS_DIR.glob("*.png")):
        backup_name = f"figures_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        backup_path = BACKUP_DIR / backup_name
        
        # Copy existing figures
        backup_path.mkdir(parents=True, exist_ok=True)
        for img in SCREENSHOTS_DIR.glob("*.png"):
            shutil.copy2(img, backup_path / img.name)
        
        logger.info(f"Backup created: {backup_path}")
        return backup_path
    return None


def list_categories():
    """List available capture categories"""
    categories = set(f.get("category", "other") for f in UI_FLOWS)
    return sorted(categories)


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Auto-capture UI screenshots for ft_transcendence"
    )
    parser.add_argument(
        "--category",
        choices=list_categories(),
        help="Capture specific category only"
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Skip backup of existing figures"
    )
    parser.add_argument(
        "--list-categories",
        action="store_true",
        help="List available categories and exit"
    )
    parser.add_argument(
        "--list-flows",
        action="store_true",
        help="List all capture flows and exit"
    )
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
        help="Logging level"
    )
    
    args = parser.parse_args()
    
    # Set logging level
    logging.getLogger().setLevel(args.log_level)
    
    if args.list_categories:
        print("\n📁 Available Categories:")
        for cat in list_categories():
            count = sum(1 for f in UI_FLOWS if f.get("category") == cat)
            print(f"  - {cat:<12} ({count} flows)")
        return
    
    if args.list_flows:
        print("\n📸 Available Capture Flows:")
        for i, flow in enumerate(UI_FLOWS, 1):
            opt = " [optional]" if flow.get("optional") else ""
            print(f"  {i:2}. {flow['name']:<40} → {flow['filename']}{opt}")
        return
    
    print(f"\n🎬 ft_transcendence UI Capture Tool")
    print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   Target: {BASE_URL}")
    print()
    
    # Backup existing figures
    if not args.no_backup:
        backup_existing_figures()
    
    # Run capture
    try:
        results = await capture_by_category(args.category)
        
        if results["failed"] > 0:
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
