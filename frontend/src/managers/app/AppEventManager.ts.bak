// frontend/src/managers/app/AppEventManager.ts
// Handles keyboard shortcuts, zoom control, and event listeners for the App

import { logger } from '../../utils/Logger';
import { profileManager } from '../profile/ProfileManager';
import { settingsManager } from '../SettingsManager';
import { getTournamentManager } from '../tournament';
import { gameCoordinator } from '../game/GameCoordinator';
import { playerService } from '../../core/playerService';
import { authService } from '../../core/authService';
import { playerManager } from '../PlayerManager';

export class AppEventManager {
  private zoomLevel: number = 1.0;
  private readonly minZoom: number = 0.5;
  private readonly maxZoom: number = 3.0;
  private readonly zoomStep: number = 0.1;

  // Store event handler references for cleanup
  private zoomWheelHandler: ((e: WheelEvent) => void) | null = null;
  private zoomKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  private app: any;

  constructor() {
    logger.info('AppEventManager', '🏗️ AppEventManager initialized');
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts(router: any, gameManager: any): void {
    logger.info('AppEventManager', 'Setting up keyboard shortcuts');

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      const currentScreen = document.querySelector('.screen.active')?.id.replace('-screen', '');

      switch (e.key) {
        case 'Backspace':
          e.preventDefault();
          this.handleBackspaceShortcut(currentScreen, router, gameManager);
          break;
        case 'Escape':
          e.preventDefault();
          this.handleEscapeShortcut(gameManager);
          break;
        case 'Enter':
          e.preventDefault();
          this.handleEnterShortcut(currentScreen);
          break;
        case 'p':
        case 'P':
          if (currentScreen === 'game') {
            e.preventDefault();
            this.handlePauseShortcut();
          }
          break;
        case 'q':
        case 'Q':
          if (currentScreen === 'game') {
            e.preventDefault();
            this.handleQuitShortcut();
          }
          break;
      }
    });
  }

  /**
   * Setup zoom control
   */
  setupZoomControl(): void {
    logger.info('AppEventManager', 'Setting up zoom control');

    // Handle Ctrl + Mouse Wheel for zoom
    this.zoomWheelHandler = (e: WheelEvent) => {
      // Only zoom when Ctrl key is pressed
      if (e.ctrlKey) {
        e.preventDefault();

        // Determine zoom direction
        const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + delta));

        if (newZoom !== this.zoomLevel) {
          this.zoomLevel = newZoom;
          this.applyZoom(this.zoomLevel);
        }
      }
    };

    document.addEventListener('wheel', this.zoomWheelHandler, { passive: false });

    // Handle Ctrl + Plus/Minus for zoom (keyboard shortcuts)
    this.zoomKeyHandler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          const newZoom = Math.min(this.maxZoom, this.zoomLevel + this.zoomStep);
          if (newZoom !== this.zoomLevel) {
            this.zoomLevel = newZoom;
            this.applyZoom(newZoom);
          }
        } else if (e.key === '-') {
          e.preventDefault();
          const newZoom = Math.max(this.minZoom, this.zoomLevel - this.zoomStep);
          if (newZoom !== this.zoomLevel) {
            this.zoomLevel = newZoom;
            this.applyZoom(newZoom);
          }
        } else if (e.key === '0') {
          e.preventDefault();
          this.zoomLevel = 1.0;
          this.applyZoom(1.0);
        }
      }
    };

    document.addEventListener('keydown', this.zoomKeyHandler);
  }

  /**
   * Apply zoom level to the app
   */
  private applyZoom(zoomLevel: number): void {
    const app = document.getElementById('app');
    if (app) {
      app.style.transform = `scale(${zoomLevel})`;
      app.style.transformOrigin = 'top left';

      // Adjust body size to accommodate zoom
      document.body.style.width = `${100 / zoomLevel}%`;
      document.body.style.height = `${100 / zoomLevel}%`;

      // Show zoom level indicator (optional)
      this.showZoomIndicator(zoomLevel);
    }
  }

  /**
   * Show zoom indicator
   */
  private showZoomIndicator(zoomLevel: number): void {
    // Remove existing indicator
    const existingIndicator = document.getElementById('zoom-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Create new indicator
    const indicator = document.createElement('div');
    indicator.id = 'zoom-indicator';
    indicator.textContent = `${Math.round(zoomLevel * 100)}%`;
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
    `;

    document.body.appendChild(indicator);

    // Remove after 2 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 2000);
  }

  /**
   * Handle backspace shortcut
   */
  private handleBackspaceShortcut(currentScreen: string | undefined, router: any, gameManager: any): void {
    if (!currentScreen) return;

    switch (currentScreen) {
      case 'register':
        router.navigateToScreen('login');
        break;
      case 'forgot-password':
        router.navigateToScreen('login');
        break;
      case 'main-menu':
        this.handleLogout(router);
        break;
      case 'play-config':
        router.navigateToScreen('main-menu');
        break;
      case 'settings':
        router.navigateToScreen('main-menu');
        break;
      case 'profile':
        router.navigateToScreen('main-menu');
        break;
      case 'game': {
        if (gameManager) {
          // Clean up any campaign modals that might be visible
          if (typeof gameManager.cleanupCampaignModals === 'function') {
            gameManager.cleanupCampaignModals();
          }
          // Stop the game if it's running
          if (typeof gameManager.stopGame === 'function') {
            gameManager.stopGame();
          }
        }
        break;
      }
    }
  }

  /**
   * Handle escape shortcut
   */
  private handleEscapeShortcut(gameManager: any): void {
    // Clean up campaign modals and stop any running game
    if (gameManager) {
      // Clean up any campaign modals that might be visible
      if (typeof gameManager.cleanupCampaignModals === 'function') {
        gameManager.cleanupCampaignModals();
      }
      // Stop the game if it's running
      if (gameManager.isPlaying && typeof gameManager.stopGame === 'function') {
        gameManager.stopGame();
      }
    }

    const router = (window as any).app?.router;
    if (router) {
      router.navigateToScreen('login');
    }
  }

  /**
   * Handle enter shortcut
   */
  private handleEnterShortcut(currentScreen: string | undefined): void {
    switch (currentScreen) {
      case 'login': {
        const loginSubmitBtn = document.querySelector('#login-form button[type="submit"]') as HTMLButtonElement;
        if (loginSubmitBtn) loginSubmitBtn.click();
        break;
      }
      case 'register': {
        const registerSubmitBtn = document.querySelector('#register-form button[type="submit"]') as HTMLButtonElement;
        if (registerSubmitBtn) registerSubmitBtn.click();
        break;
      }
      case 'forgot-password': {
        const forgotSubmitBtn = document.querySelector('#forgot-password-form button[type="submit"]') as HTMLButtonElement;
        if (forgotSubmitBtn) forgotSubmitBtn.click();
        break;
      }
      case 'main-menu': {
        const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
        if (playBtn) playBtn.click();
        break;
      }
      case 'play-config': {
        // Don't auto-start game with Enter - let user manually click start button
        // Focus on start game button for visual feedback
        const startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
        if (startGameBtn) startGameBtn.focus();
        break;
      }
      case 'game': {
        const pauseBtn = document.getElementById('pause-game-btn');
        if (pauseBtn instanceof HTMLButtonElement) {
          pauseBtn.click();
        }
        break;
      }
    }
  }

  /**
   * Handle logout
   */
  private handleLogout(router: any): void {
    try {
      if (authService && typeof authService.logout === 'function') {
        authService.logout();
      }
    } catch (e) {
      // Fallback to window.authManager if present
      try { const am = (window as any).authManager; if (am && typeof am.logout === 'function') am.logout(); } catch (_) {}
    }

    if (router) {
      router.navigateToScreen('login');
    }

    // Clear players via migration bridge
    try {
      if (playerService && typeof playerService.clearAllPlayers === 'function') {
        playerService.clearAllPlayers();
      }
    } catch (e) {
      logger.warn('AppEventManager', 'playerService.clearAllPlayers failed', e);
    }
  }

  /**
   * Initialize the event manager
   */
  initialize(app: any): void {
    this.app = app;
    // Setup zoom control
    this.setupZoomControl();
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts(app.router, gameCoordinator);
    
    // Setup form and navigation event listeners
    this.setupFormEventListeners();
  }

  /**
   * Setup form and navigation event listeners
   */
  setupFormEventListeners(): void {
    logger.info('AppEventManager', 'Setting up form and navigation event listeners');

    // Login screen navigation links
    const createAccountLink = document.getElementById('create-account-link');
    if (createAccountLink) {
      logger.info('AppEventManager', 'Adding event listener for create-account-link');
      createAccountLink.addEventListener('click', (e) => {
        logger.info('AppEventManager', 'Create account link clicked');
        e.preventDefault();
        const app = (window as any).app;
        if (app?.router) {
          app.router.navigateToScreen('register');
        } else {
          logger.error('AppEventManager', 'App or router not available');
        }
      });
    } else {
      logger.warn('AppEventManager', 'create-account-link not found');
    }

    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
      logger.info('AppEventManager', 'Adding event listener for forgot-password-link');
      forgotPasswordLink.addEventListener('click', (e) => {
        logger.info('AppEventManager', 'Forgot password link clicked');
        e.preventDefault();
        const app = (window as any).app;
        if (app?.router) {
          app.router.navigateToScreen('forgot-password');
        } else {
          logger.error('AppEventManager', 'App or router not available');
        }
      });
    } else {
      logger.warn('AppEventManager', 'forgot-password-link not found');
    }

    // Register screen back link
    const backToLoginLink = document.getElementById('back-to-login-link');
    if (backToLoginLink) {
      logger.info('AppEventManager', 'Adding event listener for back-to-login-link');
      backToLoginLink.addEventListener('click', (e) => {
        logger.info('AppEventManager', 'Back to login link clicked');
        e.preventDefault();
        const app = (window as any).app;
        if (app?.router) {
          app.router.navigateToScreen('login');
        } else {
          logger.error('AppEventManager', 'App or router not available');
        }
      });
    } else {
      logger.warn('AppEventManager', 'back-to-login-link not found');
    }

    // Forgot password screen back link
    const backToLoginFromForgot = document.getElementById('back-to-login-from-forgot-link');
    if (backToLoginFromForgot) {
      logger.info('AppEventManager', 'Adding event listener for back-to-login-from-forgot-link');
      backToLoginFromForgot.addEventListener('click', (e) => {
        logger.info('AppEventManager', 'Back to login from forgot link clicked');
        e.preventDefault();
        const app = (window as any).app;
        if (app?.router) {
          app.router.navigateToScreen('login');
        } else {
          logger.error('AppEventManager', 'App or router not available');
        }
      });
    } else {
      logger.warn('AppEventManager', 'back-to-login-from-forgot-link not found');
    }

    // Main menu logout button
    const logoutBtn = document.getElementById('main-menu-logout-btn');
    if (logoutBtn) {
      logger.info('AppEventManager', 'Adding event listener for main-menu-logout-btn');
      logoutBtn.addEventListener('click', (e) => {
        logger.info('AppEventManager', 'Logout button clicked');
        e.preventDefault();
        if (this.app?.handleUserLogout) {
          this.app.handleUserLogout().catch((err) => {
            logger.error('AppEventManager', 'handleUserLogout failed', err);
          });
        } else {
          logger.error('AppEventManager', 'App handleUserLogout not available');
        }
      });
    } else {
      logger.warn('AppEventManager', 'main-menu-logout-btn not found');
    }

    // Form submissions
    const loginForm = document.getElementById('login-form') as HTMLFormElement;
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = (document.getElementById('login-username') as HTMLInputElement).value;
        const password = (document.getElementById('login-password') as HTMLInputElement).value;
        const app = (window as any).app;
        if (app?.handleLogin) {
          await app.handleLogin(username, password);
        }
      });
    }

    const registerForm = document.getElementById('register-form') as HTMLFormElement;
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = (document.getElementById('register-username') as HTMLInputElement).value;
        const email = (document.getElementById('register-email') as HTMLInputElement).value;
        const password = (document.getElementById('register-password') as HTMLInputElement).value;
        const app = (window as any).app;
        if (app?.handleRegisterUser) {
          await app.handleRegisterUser(username, email, password);
        }
      });
    }

    const forgotPasswordForm = document.getElementById('forgot-password-form') as HTMLFormElement;
    if (forgotPasswordForm) {
      forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (document.getElementById('forgot-password-email') as HTMLInputElement).value;
        const app = (window as any).app;
        if (app?.handleForgotPasswordEmail) {
          await app.handleForgotPasswordEmail(email);
        }
      });
    }

    // Main menu buttons: play, profile, settings
    const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    if (playBtn) {
      logger.info('AppEventManager', 'Adding event listener for play-btn');
      playBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const app = (window as any).app;
        if (app?.router) {
          app.router.navigateToScreen('play-config');
        } else {
          logger.warn('AppEventManager', 'App or router not available for play-btn');
        }
      });
    }

    const profileBtn = document.getElementById('profile-btn') as HTMLButtonElement;
    if (profileBtn) {
      logger.info('AppEventManager', 'Adding event listener for profile-btn');
      profileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const app = (window as any).app;
        if (app?.router) {
          app.router.navigateToScreen('profile');
        } else {
          logger.warn('AppEventManager', 'App or router not available for profile-btn');
        }
      });
    }

    const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
    if (settingsBtn) {
      logger.info('AppEventManager', 'Adding event listener for settings-btn');
      settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const app = (window as any).app;
        if (app?.router) {
          app.router.navigateToScreen('settings');
        } else {
          logger.warn('AppEventManager', 'App or router not available for settings-btn');
        }
      });
    }

    // Play config buttons
    const backToMainBtn = document.getElementById('back-to-main-btn') as HTMLButtonElement;
    if (backToMainBtn) {
      logger.info('AppEventManager', 'Adding event listener for back-to-main-btn');
      backToMainBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const app = (window as any).app;
        if (app?.router) {
          app.router.navigateToScreen('main-menu');
        } else {
          logger.warn('AppEventManager', 'App or router not available for back-to-main-btn');
        }
      });
    }

    // Profile screen back buttons
    const backToMainProfileBtn = document.getElementById('back-to-main-profile-btn') as HTMLButtonElement;
    if (backToMainProfileBtn) {
      logger.info('AppEventManager', 'Adding event listener for back-to-main-profile-btn');
      backToMainProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const app = (window as any).app;
        if (app?.router) {
          app.router.navigateToScreen('main-menu');
        } else {
          logger.warn('AppEventManager', 'App or router not available for back-to-main-profile-btn');
        }
      });
    }

    const backToMainProfileBottomBtn = document.getElementById('back-to-main-profile-bottom-btn') as HTMLButtonElement;
    if (backToMainProfileBottomBtn) {
      logger.info('AppEventManager', 'Adding event listener for back-to-main-profile-bottom-btn');
      backToMainProfileBottomBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const app = (window as any).app;
        if (app?.router) {
          app.router.navigateToScreen('main-menu');
        } else {
          logger.warn('AppEventManager', 'App or router not available for back-to-main-profile-bottom-btn');
        }
      });
    }

    // Settings screen back buttons
    const backToMainSettingsBtn = document.getElementById('back-to-main-settings-btn') as HTMLButtonElement;
    if (backToMainSettingsBtn) {
      logger.info('AppEventManager', 'Adding event listener for back-to-main-settings-btn');
      backToMainSettingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const app = (window as any).app;
        if (app?.router) {
          app.router.navigateToScreen('main-menu');
        } else {
          logger.warn('AppEventManager', 'App or router not available for back-to-main-settings-btn');
        }
      });
    }

    const backToMainSettingsBottomBtn = document.getElementById('back-to-main-settings-bottom-btn') as HTMLButtonElement;
    if (backToMainSettingsBottomBtn) {
      logger.info('AppEventManager', 'Adding event listener for back-to-main-settings-bottom-btn');
      backToMainSettingsBottomBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const app = (window as any).app;
        if (app?.router) {
          app.router.navigateToScreen('main-menu');
        } else {
          logger.warn('AppEventManager', 'App or router not available for back-to-main-settings-bottom-btn');
        }
      });
    }

    const startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
    if (startGameBtn) {
      logger.info('AppEventManager', 'Adding event listener for start-game-btn');
      startGameBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const app = (window as any).app;
        if (app && typeof app.startGame === 'function') {
          try {
            await app.startGame();
          } catch (err) {
            logger.error('AppEventManager', 'Error calling app.startGame()', err);
          }
        } else if ((window as any).gameManager && typeof (window as any).gameManager.startGame === 'function') {
          try { await (window as any).gameManager.startGame(); } catch (err) { logger.error('AppEventManager', 'gameManager.startGame failed', err); }
        } else {
          logger.warn('AppEventManager', 'No app.startGame or gameManager.startGame available');
        }
      });
    }

    // Game control buttons
    const pauseGameBtn = document.getElementById('pause-game-btn') as HTMLButtonElement;
    if (pauseGameBtn) {
      logger.info('AppEventManager', 'Adding event listener for pause-game-btn');
      pauseGameBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const gc = gameCoordinator || (window as any).gameManager || null;
        if (gc && typeof gc.pauseGame === 'function') {
          gc.pauseGame();
          // Update button text
          const span = pauseGameBtn.querySelector('span');
          if (span) {
            span.textContent = span.textContent === 'Pause' ? 'Resume' : 'Pause';
          }
          const icon = pauseGameBtn.querySelector('i');
          if (icon) {
            icon.className = span?.textContent === 'Pause' ? 'fas fa-pause' : 'fas fa-play';
          }
        } else {
          logger.warn('AppEventManager', 'Game coordinator not available for pause');
        }
      });
    }

    const stopGameBtn = document.getElementById('stop-game-btn') as HTMLButtonElement;
    if (stopGameBtn) {
      logger.info('AppEventManager', 'Adding event listener for stop-game-btn');
      stopGameBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const gc = gameCoordinator || (window as any).gameManager || null;
        if (gc && typeof gc.stopGame === 'function') {
          gc.stopGame();
          // Navigate back to play config
          const app = (window as any).app;
          if (app?.router) {
            app.router.navigateToScreen('play-config');
          }
        } else {
          logger.warn('AppEventManager', 'Game coordinator not available for stop');
        }
      });
    }

    // Setup delegated event listeners for data-action elements
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const actionEl = target.closest('[data-action]') as HTMLElement | null;
      if (!actionEl) return;

      const action = actionEl.getAttribute('data-action');
      if (!action) return;

      // Prevent default for actionable buttons/links
      if (actionEl.tagName === 'A' || actionEl.tagName === 'BUTTON') {
        e.preventDefault();
      }

      // Handle game mode tab clicks
      const gameModeTab = target.closest('.game-mode-tab') as HTMLElement;
      if (gameModeTab) {
        e.preventDefault();
        const app = (window as any).app;
        if (app && typeof app.handleGameModeChange === 'function') {
          app.handleGameModeChange(gameModeTab);
        }
        return;
      }

      try {
        // Simple routing: data-action="navigate:routeName"
        if (action.startsWith('navigate:')) {
          const route = action.split(':')[1];
          const app = (window as any).app;
          if (app?.router) app.router.navigateToScreen(route);
          else logger.warn('AppEventManager', 'Router not available for navigation', route);
          return;
        }

        // Profile actions
        if (action === 'profile:refresh') {
          profileManager.loadProfile().catch((err: any) => logger.error('AppEventManager', 'profileManager.loadProfile failed', err));
          return;
        }

        // Settings actions
        if (action === 'settings:inc-score') {
          settingsManager.adjustScoreToWin(1);
          return;
        }
        if (action === 'settings:dec-score') {
          settingsManager.adjustScoreToWin(-1);
          return;
        }
        if (action === 'settings:reset') {
          settingsManager.resetToDefaults();
          return;
        }

        // Toggle boolean settings: data-action="settings:toggle:powerupsEnabled"
        if (action.startsWith('settings:toggle:')) {
          const key = action.split(':')[2];
          if (key === 'powerupsEnabled' || key === 'accelerateOnHit') {
            settingsManager.toggleSetting(key as any);
          }
          return;
        }

        // Game actions
        // Tournament actions
        if (action === 'tournament:reload') {
          const tm = getTournamentManager();
          if (tm && typeof tm.loadTournaments === 'function') tm.loadTournaments();
          else logger.warn('AppEventManager', 'Tournament manager not available for reload');
          return;
        }
        if (action === 'tournament:join') {
          const id = actionEl.getAttribute('data-id');
          const tm = getTournamentManager();
          if (tm && typeof tm.joinTournament === 'function' && id) tm.joinTournament(Number(id));
          else logger.warn('AppEventManager', `Tournament manager not available for join ${id}`);
          return;
        }
        if (action === 'tournament:view') {
          const id = actionEl.getAttribute('data-id');
          const tm = getTournamentManager();
          if (tm && typeof tm.viewTournament === 'function' && id) tm.viewTournament(Number(id));
          else logger.warn('AppEventManager', `Tournament manager not available for view ${id}`);
          return;
        }
        if (action === 'tournament:play') {
          const tid = actionEl.getAttribute('data-tournament-id');
          const mid = actionEl.getAttribute('data-match-id');
          const tm = getTournamentManager();
          if (tm && typeof tm.playMatchFromCard === 'function' && tid && mid) tm.playMatchFromCard(Number(tid), Number(mid));
          else logger.warn('AppEventManager', `Tournament manager not available for play ${tid} ${mid}`);
          return;
        }
        if (action === 'tournament:record') {
          const id = actionEl.getAttribute('data-id');
          const winner = actionEl.getAttribute('data-winner');
          const tm = getTournamentManager();
          if (tm && typeof tm.recordOnBlockchain === 'function' && id) {
            const winnerNum = winner ? Number(winner) : 0;
            tm.recordOnBlockchain(Number(id), winnerNum);
          } else logger.warn('AppEventManager', `Tournament manager not available for record ${id}`);
          return;
        }

        if (action === 'game:find-match') {
          const gc = gameCoordinator || (window as any).gameManager || null;
          if (gc && typeof gc.findMatch === 'function') gc.findMatch();
          else logger.warn('AppEventManager', 'Game coordinator not available for find-match');
          return;
        }
        if (action === 'game:pause') {
          const gc = gameCoordinator || (window as any).gameManager || null;
          if (gc && typeof gc.pauseGame === 'function') gc.pauseGame();
          else logger.warn('AppEventManager', 'Game coordinator not available for pause');
          return;
        }
      } catch (err) {
        logger.error('AppEventManager', 'Error handling delegated data-action', err);
      }
    });
  }

  /*
   * Cleanup event listeners and handlers
   */
  cleanup(): void {
    logger.info('AppEventManager', '🧹 Cleaning up event listeners...');

    // Remove zoom event listeners if they exist
    if (this.zoomWheelHandler) {
      document.removeEventListener('wheel', this.zoomWheelHandler);
      this.zoomWheelHandler = null;
    }
    if (this.zoomKeyHandler) {
      document.removeEventListener('keydown', this.zoomKeyHandler);
      this.zoomKeyHandler = null;
    }

    logger.info('AppEventManager', '✅ Event listeners cleaned up');
  }
}