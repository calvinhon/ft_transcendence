// frontend/src/managers/local-player/LocalPlayerUIManager.ts
// Handles UI updates, navigation, and display logic for local players

import { authManager as globalAuthManager } from '../auth';
import { showToast } from '../../toast';
import { playerManager } from '../player-manager';
import { appManager } from '../app/app-manager';

export class LocalPlayerUIManager {
  private modalManager: any = null;
  private authManagerInstance: any = null;

  constructor() {
    console.log('🏆 [LocalPlayerUIManager] Initialized');
  }

  // Allow injection of modal and auth manager instances
  public setup(modalManager: any, authManager?: any): void {
    this.modalManager = modalManager;
    this.authManagerInstance = authManager || globalAuthManager;
  }

  // Navigation helpers
  public async navigateToPlayConfig(): Promise<void> {
    const app = appManager as any;
    try {
      if (app?.screenManager && typeof app.screenManager.showScreen === 'function') {
        app.screenManager.showScreen('play-config');
        console.log('[LocalPlayerUIManager] Navigated to play-config via AppManager');
        return;
      }
      const currentRoute = app?.router ? app.router.getCurrentRoute() : 'unknown';
      console.log('[LocalPlayerUIManager] Current route:', currentRoute);
      if (app?.router && currentRoute !== 'play-config') {
        await app.router.navigateToScreen('play-config');
        console.log('[LocalPlayerUIManager] Navigated to play-config via router');
      }
    } catch (e) {
      console.warn('[LocalPlayerUIManager] navigateToPlayConfig fallback failed', e);
    }
  }

  // Display updates
  public updateGamePartyDisplay(): void {
    const app = appManager as any;
    if (app?.playerManager && typeof app.playerManager.updateGamePartyDisplay === 'function') {
      app.playerManager.updateGamePartyDisplay();
      console.log('[LocalPlayerUIManager] Party display updated via AppManager.playerManager');
      return;
    }
    if (playerManager && typeof (playerManager as any).updateUI === 'function') {
      (playerManager as any).updateUI();
      console.log('[LocalPlayerUIManager] Party display updated via playerManager.updateUI');
    }
  }

  // Host name restoration (double verification)
  public verifyAndRestoreHostNames(savedHostUser: any): void {
    if (!savedHostUser) return;
    const am = this.authManagerInstance || globalAuthManager;
    if (am) {
      am.currentUser = savedHostUser;
    }

    const hostPlayerNames = [
      document.getElementById('host-player-name'),
      document.getElementById('host-player-name-coop'),
      document.getElementById('host-player-name-tournament'),
    ];

    hostPlayerNames.forEach((element) => {
      if (element) element.textContent = savedHostUser.username;
    });
  }

  public showSuccessToast(message: string): void {
    if (typeof showToast === 'function') {
      showToast(message, 'success');
      return;
    }
    console.log('✅ [LocalPlayerUIManager] Success:', message);
  }

  public showErrorToast(message: string): void {
    if (typeof showToast === 'function') {
      showToast(message, 'error');
      return;
    }
    alert(message);
  }

  // Form reset helpers
  public resetLoginForm(): void {
    const form = document.getElementById('local-player-login-form') as HTMLFormElement;
    if (form) form.reset();
  }

  public resetRegisterForm(): void {
    const form = document.getElementById('local-player-register-form') as HTMLFormElement;
    if (form) form.reset();
  }

  // Event setup helpers
  public setupModalEventListeners(): void {
    if (!this.modalManager) return;
    const modalManager = this.modalManager;
    const authManager = this.authManagerInstance || globalAuthManager;

    const loginCloseBtn = document.getElementById('close-local-player-login-modal');
    loginCloseBtn?.addEventListener('click', () => modalManager.hideLoginModal());

    const loginModal = document.getElementById('local-player-login-modal');
    loginModal?.querySelector('.modal-overlay')?.addEventListener('click', () => modalManager.hideLoginModal());

    const registerCloseBtn = document.getElementById('close-local-player-register-modal');
    registerCloseBtn?.addEventListener('click', () => modalManager.hideRegisterModal());

    const registerModal = document.getElementById('local-player-register-modal');
    registerModal?.querySelector('.modal-overlay')?.addEventListener('click', () => modalManager.hideRegisterModal());

    const createAccountLink = document.getElementById('local-player-create-account-link');
    createAccountLink?.addEventListener('click', (e) => {
      e.preventDefault();
      modalManager.hideLoginModal();
      modalManager.showRegisterModal();
    });

    const backToLoginLink = document.getElementById('local-player-back-to-login-link');
    backToLoginLink?.addEventListener('click', (e) => {
      e.preventDefault();
      modalManager.hideRegisterModal();
      modalManager.showLoginModal();
    });

    const forgotPasswordLink = document.getElementById('local-player-forgot-password-link');
    forgotPasswordLink?.addEventListener('click', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('local-player-login-email') as HTMLInputElement;
      const email = emailInput?.value.trim();
      if (!email) {
        this.showErrorToast('Please enter your email address first');
        return;
      }
      if (authManager?.requestPasswordReset) {
        const success = await authManager.requestPasswordReset(email);
        if (success) this.showSuccessToast('Password reset link sent! Please check your email.');
        else this.showErrorToast('Failed to send reset email');
      }
    });
  }

  // Player list delegation setup
  public setupPlayerListDelegation(): void {
    const container = document.querySelector('#local-players-list') as HTMLElement;
    if (!container) return;

    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const removeBtn = target.closest('.remove-player-btn') as HTMLElement | null;
      if (removeBtn) {
        const playerId = removeBtn.getAttribute('data-player-id');
        if (playerId) {
          if (playerManager?.removeLocalPlayer) {
            playerManager.removeLocalPlayer(playerId);
          } else if (appManager?.playerManager && typeof appManager.playerManager.removeLocalPlayer === 'function') {
            appManager.playerManager.removeLocalPlayer(playerId);
          }
        }
      }
    });
  }
}