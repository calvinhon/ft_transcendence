// frontend/src/managers/app/AppScreenManager.ts
// Handles screen navigation and display management for the App

import { logger } from '../../utils/Logger';
import { authService } from '../../core/authService';

export class AppScreenManager {
  // Screen elements
  private loginScreen!: HTMLElement;
  private registerScreen!: HTMLElement;
  private mainMenuScreen!: HTMLElement;
  private playConfigScreen!: HTMLElement;
  private gameScreen!: HTMLElement;
  private settingsScreen!: HTMLElement;
  private profileScreen!: HTMLElement;
  private forgotPasswordScreen!: HTMLElement;

  constructor() {
    logger.info('app-screen-manager', '🏗️ AppScreenManager initialized');
    this.cacheScreenElements();
  }

  /**
   * Cache screen elements for quick access
   */
  private cacheScreenElements(): void {
    this.loginScreen = document.getElementById('login-screen') as HTMLElement;
    this.registerScreen = document.getElementById('register-screen') as HTMLElement;
    this.mainMenuScreen = document.getElementById('main-menu-screen') as HTMLElement;
    this.playConfigScreen = document.getElementById('play-config-screen') as HTMLElement;
    this.gameScreen = document.getElementById('game-screen') as HTMLElement;
    this.settingsScreen = document.getElementById('settings-screen') as HTMLElement;
    this.profileScreen = document.getElementById('profile-screen') as HTMLElement;
    this.forgotPasswordScreen = document.getElementById('forgot-password-screen') as HTMLElement;

    logger.info('app-screen-manager', 'Screen elements cached');
  }

  /**
   * Show screen directly (used by router)
   */
  showScreen(screenName: string): void {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Show target screen
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
      targetScreen.classList.add('active');
      logger.info('app-screen-manager', `Screen shown: ${screenName}`);
    }

    // Set body data attribute for CSS targeting
    document.body.setAttribute('data-current-screen', screenName);

    logger.info('app-screen-manager', `Screen navigation complete: ${screenName}`);
  }

  /**
   * Get current active screen
   */
  getCurrentScreen(): string | null {
    const activeScreen = document.querySelector('.screen.active');
    return activeScreen ? activeScreen.id.replace('-screen', '') : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const user = authService?.getCurrentUser?.();
    const token = localStorage.getItem('token');
    return !!(user && user.userId && token);
  }

  /**
   * Get screen element by name
   */
  getScreenElement(screenName: string): HTMLElement | null {
    switch (screenName) {
      case 'login': return this.loginScreen;
      case 'register': return this.registerScreen;
      case 'main-menu': return this.mainMenuScreen;
      case 'play-config': return this.playConfigScreen;
      case 'game': return this.gameScreen;
      case 'settings': return this.settingsScreen;
      case 'profile': return this.profileScreen;
      case 'forgot-password': return this.forgotPasswordScreen;
      default: return null;
    }
  }

  /**
   * Initialize the screen manager
   */
  initialize(): void {
    // Initial screen is handled by RouterCoordinator via main.ts -> router.getInitialRoute()
    // or by the router's own initialization logic.
  }

  /**
   * Cleanup the screen manager
   */
  cleanup(): void {
    // Remove any active screen overlays or states
    this.hideAllScreens();
  }

  /**
   * Hide all screens
   */
  private hideAllScreens(): void {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.body.removeAttribute('data-current-screen');
  }
}