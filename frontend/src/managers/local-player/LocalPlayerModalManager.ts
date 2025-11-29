// frontend/src/managers/local-player/LocalPlayerModalManager.ts
// Handles modal show/hide operations and basic modal management
import { logger } from '../../utils/Logger';
import { sharedFlags } from '../SharedFlags';

export class LocalPlayerModalManager {
  constructor() {
    console.log('🏆 [LocalPlayerModalManager] Initialized');
  }

  // Login modal operations
  public showLoginModal(): void {
    console.log('🔓 [LocalPlayerModalManager] showLoginModal() called');

    // Reset the submitting guard when modal opens
    sharedFlags.isSubmittingLogin = false;
    console.log('[LocalPlayerModalManager] Login submitting guard reset to false');

    const modal = document.getElementById('local-player-login-modal') as HTMLElement;
    const form = document.getElementById('local-player-login-form') as HTMLFormElement;
    const error = document.getElementById('local-player-login-error') as HTMLElement;

    console.log('[LocalPlayerModalManager] Modal element:', modal ? '✅ Found' : '❌ Not found');
    console.log('[LocalPlayerModalManager] Form element:', form ? '✅ Found' : '❌ Not found');
    console.log('[LocalPlayerModalManager] Error element:', error ? '✅ Found' : '❌ Not found');
    console.log('[LocalPlayerModalManager] Current addPlayerTeam:', sharedFlags.addPlayerTeam);

    if (modal) {
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      console.log('[LocalPlayerModalManager] Modal display set to flex (centered)');
    }
    if (error) {
      error.style.display = 'none';
      error.textContent = '';
    }
    if (form) form.reset();
  }

  public hideLoginModal(): void {
    console.log('🔒 [LocalPlayerModalManager] hideLoginModal() called');
    const modal = document.getElementById('local-player-login-modal') as HTMLElement;
    console.log('[LocalPlayerModalManager] Modal element found:', modal ? '✅ Yes' : '❌ No');
    if (modal) {
      console.log('[LocalPlayerModalManager] Current modal display style:', modal.style.display);
      modal.style.display = 'none';
      modal.classList.add('hidden');
      console.log('[LocalPlayerModalManager] Modal display set to: none, hidden class added');
      console.log('[LocalPlayerModalManager] Verified modal display:', modal.style.display);
      console.log('[LocalPlayerModalManager] Verified modal classList:', modal.classList.toString());
    } else {
      logger.error('LocalPlayerModalManager', 'Cannot hide login modal - element not found');
    }
  }

  // Register modal operations
  public showRegisterModal(): void {
    console.log('🔓 [LocalPlayerModalManager] showRegisterModal() called');

    // Reset the submitting guard when modal opens
    sharedFlags.isSubmittingRegister = false;
    console.log('[LocalPlayerModalManager] Register submitting guard reset to false');

    const modal = document.getElementById('local-player-register-modal') as HTMLElement;
    const form = document.getElementById('local-player-register-form') as HTMLFormElement;
    const error = document.getElementById('local-player-register-error') as HTMLElement;
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
    }
    if (error) {
      error.style.display = 'none';
      error.textContent = '';
    }
    if (form) form.reset();
  }

  public hideRegisterModal(): void {
    console.log('🔒 [LocalPlayerModalManager] hideRegisterModal() called');
    const modal = document.getElementById('local-player-register-modal') as HTMLElement;
    console.log('[LocalPlayerModalManager] Modal element found:', modal ? '✅ Yes' : '❌ No');
    if (modal) {
      console.log('[LocalPlayerModalManager] Current modal display style:', modal.style.display);
      modal.style.display = 'none';
      modal.classList.add('hidden');
      console.log('[LocalPlayerModalManager] Modal display set to: none, hidden class added');
      console.log('[LocalPlayerModalManager] Verified modal display:', modal.style.display);
      console.log('[LocalPlayerModalManager] Verified modal classList:', modal.classList.toString());
    } else {
      logger.error('LocalPlayerModalManager', 'Cannot hide register modal - element not found');
    }
  }

  // Error display helpers
  public showLoginError(message: string): void {
    const error = document.getElementById('local-player-login-error') as HTMLElement;
    if (error) {
      error.textContent = message;
      error.style.display = 'block';
    }
  }

  public hideLoginError(): void {
    const error = document.getElementById('local-player-login-error') as HTMLElement;
    if (error) {
      error.style.display = 'none';
      error.textContent = '';
    }
  }

  public showRegisterError(message: string): void {
    const error = document.getElementById('local-player-register-error') as HTMLElement;
    if (error) {
      error.textContent = message;
      error.style.display = 'block';
    }
  }

  public hideRegisterError(): void {
    const error = document.getElementById('local-player-register-error') as HTMLElement;
    if (error) {
      error.style.display = 'none';
      error.textContent = '';
    }
  }
}