// frontend/src/managers/local-player/LocalPlayerManager.ts
// Main orchestrator for local player management, coordinating all sub-managers
import { logger } from '../../utils/Logger';

import { LocalPlayerModalManager } from './local-player-modal-manager';
import { LocalPlayerDataManager } from './local-player-data-manager';
import { LocalPlayerAuthManager } from './local-player-auth-manager';
import { LocalPlayerUIManager } from './local-player-ui-manager';

export class LocalPlayerManager {
  // Sub-managers
  private modalManager: LocalPlayerModalManager;
  private dataManager: LocalPlayerDataManager;
  private authManager: LocalPlayerAuthManager;
  private uiManager: LocalPlayerUIManager;

  // State tracking (moved from global variables)
  private loginModalInitialized = false;
  private registerModalInitialized = false;
  private isSubmittingLogin = false;
  private isSubmittingRegister = false;

  constructor() {
    console.log('🏆 [LocalPlayerManager] Constructor called');

    // Initialize sub-managers
    this.modalManager = new LocalPlayerModalManager();
    this.dataManager = new LocalPlayerDataManager();
    this.authManager = new LocalPlayerAuthManager(this.dataManager, this.modalManager);
    this.uiManager = new LocalPlayerUIManager();

    // Setup event listeners when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupEventListeners();
      });
    } else {
      this.setupEventListeners();
    }
  }

  private setupEventListeners(): void {
    console.log('[LocalPlayerManager] Setting up event listeners');
    this.uiManager.setup(this.modalManager, this.authManager);
    this.uiManager.setupModalEventListeners();
    this.uiManager.setupPlayerListDelegation();
  }

  // Public API methods - Login Modal
  public setupLoginModal(app: any): void {
    console.log('🔧 [LocalPlayerManager] setupLoginModal() called');

    if (this.loginModalInitialized) {
      console.log('[LocalPlayerManager] Login modal already initialized, skipping');
      return;
    }

    this.loginModalInitialized = true;
    console.log('[LocalPlayerManager] Login modal marked as initialized');

    const loginForm = document.getElementById('local-player-login-form') as HTMLFormElement;
    if (!loginForm) {
      console.warn('⚠️ [LocalPlayerManager] Login form not found, cannot setup');
      return;
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (this.isSubmittingLogin) {
        console.warn('⚠️ [LocalPlayerManager] Login already in progress, ignoring duplicate submit');
        return;
      }

      this.isSubmittingLogin = true;
      console.log('📝 [LocalPlayerManager] Login form submitted, isSubmittingLogin set to true');

      const emailInput = document.getElementById('local-player-login-email') as HTMLInputElement;
      const passwordInput = document.getElementById('local-player-login-password') as HTMLInputElement;
      const email = emailInput?.value.trim();
      const password = passwordInput?.value;

      try {
        const result = await this.authManager.loginPlayer(email, password);

        if (result?.success) {
          // Add player to app
          this.dataManager.addPlayerToApp(result.player);

          // Reset submitting guard and close modal
          this.isSubmittingLogin = false;
          this.modalManager.hideLoginModal();
          console.log('🎉 [LocalPlayerManager] Login successful, modal hidden');

          // Final host user restoration
          this.dataManager.restoreHostSession(result.savedSession);

          // Navigate and update UI
          await this.uiManager.navigateToPlayConfig();

          setTimeout(() => {
            this.uiManager.verifyAndRestoreHostNames(result.savedSession.user);
            this.uiManager.updateGamePartyDisplay();
          }, 50);
        } else {
          this.isSubmittingLogin = false;
        }
      } catch (err) {
        logger.error('local-player-manager', 'Exception during login', err);
        this.modalManager.showLoginError('An error occurred during login: ' + (err as Error).message);
        this.isSubmittingLogin = false;
      }
    });
  }

  // Public API methods - Register Modal
  public setupRegisterModal(app: any): void {
    console.log('🔧 [LocalPlayerManager] setupRegisterModal() called');

    if (this.registerModalInitialized) {
      console.log('[LocalPlayerManager] Register modal already initialized, skipping');
      return;
    }

    this.registerModalInitialized = true;
    console.log('[LocalPlayerManager] Register modal marked as initialized');

    const registerForm = document.getElementById('local-player-register-form') as HTMLFormElement;
    if (!registerForm) {
      console.warn('⚠️ [LocalPlayerManager] Register form not found, cannot setup');
      return;
    }

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (this.isSubmittingRegister) {
        console.warn('⚠️ [LocalPlayerManager] Registration already in progress, ignoring duplicate submit');
        return;
      }

      this.isSubmittingRegister = true;
      console.log('📝 [LocalPlayerManager] Register form submitted, isSubmittingRegister set to true');

      const usernameInput = document.getElementById('local-player-register-username') as HTMLInputElement;
      const emailInput = document.getElementById('local-player-register-email') as HTMLInputElement;
      const passwordInput = document.getElementById('local-player-register-password') as HTMLInputElement;
      const username = usernameInput?.value.trim();
      const email = emailInput?.value.trim();
      const password = passwordInput?.value;

      try {
        const result = await this.authManager.registerPlayer(username, email, password);

        if (result?.success) {
          // Add player to app
          this.dataManager.addPlayerToApp(result.player);

          // Reset submitting guard and close modal
          this.isSubmittingRegister = false;
          this.modalManager.hideRegisterModal();
          console.log('🎉 [LocalPlayerManager] Registration successful, modal hidden');

          // Final host user restoration
          this.dataManager.restoreHostSession(result.savedSession);

          // Navigate and update UI
          await this.uiManager.navigateToPlayConfig();

          setTimeout(() => {
            this.uiManager.verifyAndRestoreHostNames(result.savedSession.user);
            this.uiManager.updateGamePartyDisplay();
          }, 50);
        } else {
          this.isSubmittingRegister = false;
        }
      } catch (err) {
        logger.error('local-player-manager', 'Exception during registration', err);
        this.modalManager.showRegisterError('An error occurred during registration: ' + (err as Error).message);
        this.isSubmittingRegister = false;
      }
    });
  }

  // Public API methods - Modal control
  public showLoginModal(): void {
    this.modalManager.showLoginModal();
  }

  public hideLoginModal(): void {
    this.modalManager.hideLoginModal();
  }

  public showRegisterModal(): void {
    this.modalManager.showRegisterModal();
  }

  public hideRegisterModal(): void {
    this.modalManager.hideRegisterModal();
  }

  // Public API methods - List delegation
  public setupListDelegation(): void {
    console.log('🔧 [LocalPlayerManager] setupListDelegation() called');
    this.uiManager.setupPlayerListDelegation();
  }

  // Legacy compatibility methods
  public registerAndHighlightLocalPlayer(app: any, username: string, email: string, password: string): Promise<void> {
    // This method is kept for backward compatibility but delegates to the new auth manager
    return this.authManager.registerPlayer(username, email, password).then(result => {
      if (result?.success) {
        this.dataManager.addPlayerToApp(result.player);
        this.uiManager.updateGamePartyDisplay();
      }
    });
  }

  public registerLocalPlayer(username: string, email: string, password: string, authManager: any): Promise<any> {
    // Legacy method - delegates to auth manager
    return this.authManager.registerPlayer(username, email, password);
  }

  public addLocalPlayerToList(localPlayers: any[], user: any, token: string): any[] {
    // Legacy method - delegates to data manager
    const player = this.dataManager.createPlayerObject(user, token, 1);
    localPlayers.push(player);
    return localPlayers;
  }
}

// Global instance for backward compatibility
// `main.ts` is responsible for creating and registering the global `localPlayerManager`.
// This file should not create its own global instance to avoid duplicate initialization.