// frontend/src/managers/app/AppManager.ts
// Main orchestrator for all app-specific managers

import { logger } from '../../utils/Logger';
import { AppScreenManager } from './app-screen-manager';
import { AppEventManager } from './app-event-manager';
import { AppPlayerManager } from './app-player-manager';
import { AppGameModeManager } from './app-game-mode-manager';
import { AppUIManager } from './app-ui-manager';
import { AppSettingsManager } from './app-settings-manager';
import { AppAuthManager } from './app-auth-manager';
import { AppGameManager } from './app-game-manager';
import { PerformanceManager } from '../performance-manager';
import { OfflineManager } from '../offline-manager';
import { settingsManager } from '../settings-manager';
import { routerCoordinator } from '../router';

export class AppManager {
  private static instance: AppManager;

  public readonly screenManager: AppScreenManager;
  public readonly eventManager: AppEventManager;
  public readonly playerManager: AppPlayerManager;
  public readonly gameModeManager: AppGameModeManager;
  public readonly uiManager: AppUIManager;
  public readonly settingsManager: AppSettingsManager;
  public readonly authManager: AppAuthManager;
  public readonly gameManager: AppGameManager;
  public readonly performanceManager: PerformanceManager;
  public readonly offlineManager: OfflineManager;

  private constructor() {
    logger.info('app-manager', '🏗️ AppManager initializing...');

    // Initialize all specialized managers
    this.screenManager = new AppScreenManager();
    this.eventManager = new AppEventManager();
    this.playerManager = new AppPlayerManager();
    this.gameModeManager = new AppGameModeManager();
    this.uiManager = new AppUIManager();
    this.settingsManager = new AppSettingsManager();
    this.authManager = new AppAuthManager(null); // Will be set during initialize
    this.gameManager = new AppGameManager(null); // Will be set during initialize
    this.performanceManager = PerformanceManager.getInstance();
    this.offlineManager = OfflineManager.getInstance();

    logger.info('app-manager', '✅ AppManager initialized with all specialized managers');
  }

  static getInstance(): AppManager {
    if (!AppManager.instance) {
      AppManager.instance = new AppManager();
    }
    return AppManager.instance;
  }

  /**
   * Initialize all app managers
   */
  initialize(app?: any): void {
    logger.info('app-manager', '🚀 Initializing all app managers...');

    // Set app reference for managers that need it
    if (app) {
      (this.authManager as any).app = app;
      (this.gameManager as any).app = app;
    }

    // Initialize settings first
    const settingsStart = performance.now();
    this.settingsManager.initializeSettings();
    const settingsTime = performance.now() - settingsStart;
    this.performanceManager.trackManagerInit('settings-manager', settingsTime);

    // Initialize performance monitoring
    const perfStart = performance.now();
    this.performanceManager.initialize();
    const perfTime = performance.now() - perfStart;
    this.performanceManager.trackManagerInit('performance-manager', perfTime);

    // Initialize offline support
    const offlineStart = performance.now();
    // OfflineManager is already initialized as singleton, just track timing
    const offlineTime = performance.now() - offlineStart;
    this.performanceManager.trackManagerInit('offline-manager', offlineTime);

    // Initialize other managers
    const screenStart = performance.now();
    this.screenManager.initialize();
    const screenTime = performance.now() - screenStart;
    this.performanceManager.trackManagerInit('app-screen-manager', screenTime);

    const eventStart = performance.now();
    // Pass the app instance to the event manager so it can wire up
    // handlers that need access to the App (router, app methods).
    this.eventManager.initialize(app);
    const eventTime = performance.now() - eventStart;
    this.performanceManager.trackManagerInit('app-event-manager', eventTime);

    // Ensure SettingsManager UI listeners are registered so the play-config UI is interactive
    try {
      if (settingsManager && typeof settingsManager.setupUIListeners === 'function') {
        settingsManager.setupUIListeners();
        if (typeof settingsManager.updateUI === 'function') {
          settingsManager.updateUI();
        }
      }
    } catch (e) {
      logger.warn('app-manager', 'Failed to initialize SettingsManager UI listeners', e);
    }

    const playerStart = performance.now();
    this.playerManager.initialize();
    const playerTime = performance.now() - playerStart;
    this.performanceManager.trackManagerInit('app-player-manager', playerTime);

    const gameModeStart = performance.now();
    this.gameModeManager.initialize();
    const gameModeTime = performance.now() - gameModeStart;
    this.performanceManager.trackManagerInit('app-game-mode-manager', gameModeTime);

    logger.info('app-manager', '✅ All app managers initialized');
  }

  /**
   * Cleanup all managers
   */
  cleanup(): void {
    logger.info('app-manager', '🧹 Cleaning up app managers...');

    this.eventManager.cleanup();
    this.playerManager.cleanup();
    this.screenManager.cleanup();
    this.gameModeManager.cleanup();
    this.uiManager.cleanup();

    logger.info('app-manager', '✅ App managers cleaned up');
  }

  // ===========================================================================
  // App Facade Implementation
  // These methods allow AppManager to serve as a drop-in replacement for the App class
  // ===========================================================================



  // Router accessor
  public get router(): any {
    return routerCoordinator;
  }

  // Auth delegation
  public async handleLogin(username: string, password: string): Promise<void> {
    return this.authManager.handleLogin(username, password);
  }

  public async handleRegisterUser(username: string, email: string, password: string): Promise<void> {
    return this.authManager.handleRegister(username, email, password);
  }

  public async handleForgotPasswordEmail(email: string): Promise<void> {
    return this.authManager.handleForgotPassword(email);
  }

  public async handleUserLogout(): Promise<void> {
    return this.authManager.handleLogout();
  }

  // Game delegation
  public async startGame(): Promise<void> {
    return this.gameManager.startGame();
  }

  public async stopGame(): Promise<void> {
    return this.gameManager.stopGame();
  }

  public pauseGame(): void {
    return this.gameManager.pauseGame();
  }

  // UI delegation
  public updateUserDisplay(): void {
    this.uiManager.updateUserDisplay();
  }

  public updateHostPlayerDisplay(): void {
    this.uiManager.updateHostPlayerDisplay();
  }

  public handleGameModeChange(tab: HTMLElement): void {
    this.gameModeManager.handleGameModeChange(tab);
  }

  // Navigation delegation
  public showScreenDirect(screenName: string): void {
    this.screenManager.showScreen(screenName);
  }
}

export const appManager = AppManager.getInstance();