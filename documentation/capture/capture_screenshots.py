#!/usr/bin/env python3
"""
Automated UI screenshot capture for ft_transcendence
Captures high-quality screenshots at 1920x1080 resolution
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ Playwright not installed. Install with:")
    print("   pip3 install playwright")
    print("   playwright install chromium")
    sys.exit(1)

# Configuration
BASE_URL = os.getenv("BASE_URL", "https://localhost")
SCREENSHOTS_DIR = Path("./documentation/project-report/figures")
RESOLUTION = {"width": 1920, "height": 1080}
DELAY = 1000  # ms between actions
IGNORE_HTTPS = True  # For self-signed certificates

# Ensure figures directory exists
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

# Define UI flows to capture
UI_FLOWS = [
    {
        "name": "HTTPS/Security Evidence",
        "url": BASE_URL,
        "wait": "networkidle",
        "filename": "1_https_evidence.png",
        "full_page": False,
    },
    {
        "name": "Login Page",
        "url": f"{BASE_URL}/login",
        "wait": "networkidle",
        "filename": "2_login_UI.png",
        "full_page": True,
        "delay": 1000,
    },
    {
        "name": "Registration Page",
        "url": f"{BASE_URL}/register",
        "wait": "networkidle",
        "filename": "3_create_new_account_UI.png",
        "full_page": True,
        "delay": 1000,
    },
    {
        "name": "2FA Verification",
        "url": f"{BASE_URL}/auth/2fa",
        "wait": "networkidle",
        "filename": "2_Oauth_2Step_verification.png",
        "full_page": True,
        "delay": 1000,
    },
    {
        "name": "Password Recovery",
        "url": f"{BASE_URL}/forgot-password",
        "wait": "networkidle",
        "filename": "3_Forget_Password.png",
        "full_page": True,
        "delay": 1000,
    },
    {
        "name": "Main Menu",
        "url": f"{BASE_URL}/menu",
        "wait": "networkidle",
        "filename": "3_Main_Menu.png",
        "full_page": True,
        "delay": 1000,
    },
    {
        "name": "Game Modes",
        "url": f"{BASE_URL}/game-modes",
        "wait": "networkidle",
        "filename": "game_modes.png",
        "full_page": True,
        "delay": 1000,
    },
    {
        "name": "Game Settings",
        "url": f"{BASE_URL}/game/settings",
        "wait": "networkidle",
        "filename": "4_playemode_game_settings.png",
        "full_page": True,
        "delay": 1000,
    },
    {
        "name": "Arcade Gameplay",
        "url": f"{BASE_URL}/game/arcade",
        "wait": "networkidle",
        "filename": "multiplayer_arcade.png",
        "full_page": False,
        "delay": 2000,
    },
    {
        "name": "Campaign Gameplay",
        "url": f"{BASE_URL}/game/campaign",
        "wait": "networkidle",
        "filename": "Campaign_game_running.png",
        "full_page": False,
        "delay": 2000,
    },
    {
        "name": "Campaign Level Up",
        "url": f"{BASE_URL}/game/campaign/level-up",
        "wait": "networkidle",
        "filename": "coop_game_level_up.png",
        "full_page": True,
        "delay": 1000,
    },
    {
        "name": "Tournament Mode",
        "url": f"{BASE_URL}/game/tournament",
        "wait": "networkidle",
        "filename": "gamemode_tournament.png",
        "full_page": True,
        "delay": 1000,
    },
    {
        "name": "Tournament Bracket",
        "url": f"{BASE_URL}/tournament/bracket",
        "wait": "networkidle",
        "filename": "tournament_bracket_matches.png",
        "full_page": True,
        "delay": 1000,
    },
    {
        "name": "User Dashboard",
        "url": f"{BASE_URL}/profile",
        "wait": "networkidle",
        "filename": "13_dashboard_profile.png",
        "full_page": True,
        "delay": 1000,
    },
    {
        "name": "Game Statistics",
        "url": f"{BASE_URL}/stats",
        "wait": "networkidle",
        "filename": "14_game_statistics.png",
        "full_page": True,
        "delay": 1000,
    },
    {
        "name": "Match History",
        "url": f"{BASE_URL}/history",
        "wait": "networkidle",
        "filename": "15_history_matches.png",
        "full_page": True,
        "delay": 1000,
    },
]


async def capture_ui_flows():
    """Capture all major UI flows and screens"""

    async with async_playwright() as p:
        # Launch browser with high DPI scaling
        print("🚀 Launching browser...")
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

        try:
            print("🎬 Starting UI capture sequence...")
            print(f"📁 Target URL: {BASE_URL}")
            print(f"📁 Output directory: {SCREENSHOTS_DIR}")
            print(f"📐 Resolution: {RESOLUTION['width']}x{RESOLUTION['height']}")
            print("-" * 60)

            captured_count = 0
            for flow in UI_FLOWS:
                try:
                    print(f"📸 Capturing: {flow['name']:<25}", end=" ... ")
                    
                    # Navigate to URL
                    await page.goto(
                        flow["url"],
                        wait_until=flow.get("wait", "networkidle"),
                        timeout=30000,
                    )

                    # Additional delay if specified
                    if "delay" in flow:
                        await page.wait_for_timeout(flow["delay"])
                    else:
                        await page.wait_for_timeout(DELAY)

                    # Take screenshot
                    screenshot_path = SCREENSHOTS_DIR / flow["filename"]
                    await page.screenshot(
                        path=str(screenshot_path), full_page=flow.get("full_page", True)
                    )

                    print(f"✅ ({screenshot_path.name})")
                    captured_count += 1

                except Exception as e:
                    print(f"⚠️  Failed: {e}")

            print("-" * 60)
            print(f"\n✅ Capture complete!")
            print(f"   📊 Captured: {captured_count}/{len(UI_FLOWS)} screenshots")
            print(f"   📁 Location: {SCREENSHOTS_DIR.absolute()}")

            # List captured files
            png_files = list(SCREENSHOTS_DIR.glob("*.png"))
            if png_files:
                total_size = sum(f.stat().st_size for f in png_files)
                print(f"   💾 Total size: {total_size / (1024*1024):.2f} MB")

        except Exception as e:
            print(f"\n❌ Error during capture: {e}")
            sys.exit(1)

        finally:
            await context.close()
            await browser.close()


async def main():
    """Main entry point"""
    print(f"\n🎬 ft_transcendence UI Capture Tool")
    print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Check if services are running
    import subprocess

    try:
        result = subprocess.run(
            ["curl", "-s", "-k", "-o", "/dev/null", "-w", "%{http_code}", BASE_URL],
            capture_output=True,
            timeout=5,
        )
        if result.returncode != 0:
            print(f"⚠️  Warning: Cannot reach {BASE_URL}")
            print("   Make sure services are running with: make restart")
            response = input("   Continue anyway? (y/n): ")
            if response.lower() != "y":
                sys.exit(1)
    except Exception as e:
        print(f"⚠️  Cannot verify service status: {e}")

    await capture_ui_flows()


if __name__ == "__main__":
    asyncio.run(main())
