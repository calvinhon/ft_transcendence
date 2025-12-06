// frontend/src/managers/app/AppManager.ts
// Main orchestrator for all app-specific managers

import { logger } from '../../utils/Logger';
import { AppScreenManager } from './AppScreenManager';
import { AppEventManager } from './AppEventManager';
import { AppPlayerManager } from './AppPlayerManager';
import { AppGameModeManager } from './AppGameModeManager';
import { AppUIManager } from './AppUIManager';
import { AppSettingsManager } from './AppSettingsManager';
import { AppAuthManager } from './AppAuthManager';
import { AppGameManager } from './AppGameManager';
import { PerformanceManager } from '../PerformanceManager';
import { OfflineManager } from '../OfflineManager';
import { settingsManager } from '../SettingsManager';

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
    logger.info('AppManager', '🏗️ AppManager initializing...');

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

    logger.info('AppManager', '✅ AppManager initialized with all specialized managers');
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
    logger.info('AppManager', '🚀 Initializing all app managers...');

    // Set app reference for managers that need it
    if (app) {
      (this.authManager as any).app = app;
      (this.gameManager as any).app = app;
    }

    // Initialize settings first
    const settingsStart = performance.now();
    this.settingsManager.initializeSettings();
    const settingsTime = performance.now() - settingsStart;
    this.performanceManager.trackManagerInit('SettingsManager', settingsTime);

    // Initialize performance monitoring
    const perfStart = performance.now();
    this.performanceManager.initialize();
    const perfTime = performance.now() - perfStart;
    this.performanceManager.trackManagerInit('PerformanceManager', perfTime);

    // Initialize offline support
    const offlineStart = performance.now();
    // OfflineManager is already initialized as singleton, just track timing
    const offlineTime = performance.now() - offlineStart;
    this.performanceManager.trackManagerInit('OfflineManager', offlineTime);

    // Initialize other managers
    const screenStart = performance.now();
    this.screenManager.initialize();
    const screenTime = performance.now() - screenStart;
    this.performanceManager.trackManagerInit('AppScreenManager', screenTime);

    const eventStart = performance.now();
    // Pass the app instance to the event manager so it can wire up
    // handlers that need access to the App (router, app methods).
    this.eventManager.initialize(app);
    const eventTime = performance.now() - eventStart;
    this.performanceManager.trackManagerInit('AppEventManager', eventTime);

    // Ensure SettingsManager UI listeners are registered so the play-config UI is interactive
    try {
      if (settingsManager && typeof settingsManager.setupUIListeners === 'function') {
        settingsManager.setupUIListeners();
        if (typeof settingsManager.updateUI === 'function') {
          settingsManager.updateUI();
        }
      }
    } catch (e) {
      logger.warn('AppManager', 'Failed to initialize SettingsManager UI listeners', e);
    }

    const playerStart = performance.now();
    this.playerManager.initialize();
    const playerTime = performance.now() - playerStart;
    this.performanceManager.trackManagerInit('AppPlayerManager', playerTime);

    const gameModeStart = performance.now();
    this.gameModeManager.initialize();
    const gameModeTime = performance.now() - gameModeStart;
    this.performanceManager.trackManagerInit('AppGameModeManager', gameModeTime);

    logger.info('AppManager', '✅ All app managers initialized');
  }

  /**
   * Cleanup all managers
   */
  cleanup(): void {
    logger.info('AppManager', '🧹 Cleaning up app managers...');

    this.eventManager.cleanup();
    this.playerManager.cleanup();
    this.screenManager.cleanup();
    this.gameModeManager.cleanup();
    this.uiManager.cleanup();

    logger.info('AppManager', '✅ App managers cleaned up');
  }
}

export const appManager = AppManager.getInstance();