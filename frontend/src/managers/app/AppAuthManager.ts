// frontend/src/managers/app/AppAuthManager.ts
// Handles authentication-related UI logic and form management for the App

import { logger } from '../../utils/Logger';
import { showToast } from '../../toast';
import { handleHostLogin, handleHostRegister } from '../../host-auth';
import { playerService } from '../../core/playerService';
import { authService } from '../../core/authService';

export class AppAuthManager {
  private app: any;

  constructor(app: any) {
    this.app = app;
    logger.info('AppAuthManager', '🏗️ AppAuthManager initialized');
  }

  /**
   * Handle login form submission
   */
  async handleLogin(username: string, password: string): Promise<void> {
    logger.info('AppAuthManager', `🔐 Handling login for user: ${username}`);

    try {
      const result = await handleHostLogin(username, password, authService);

      if (result.success) {
        logger.info('AppAuthManager', '✅ Login successful');
        
        // Set the host user in PlayerManager
        const currentUser = authService?.getCurrentUser?.();
        if (currentUser && playerService && typeof playerService.setHostUser === 'function') {
          playerService.setHostUser(currentUser);
          logger.info('AppAuthManager', '✅ Host user set in PlayerManager');
        }
        
        showToast('Login successful!', 'success');
        await this.app.router.navigateToScreen('main-menu');
        this.app.updateUserDisplay();
      } else {
        logger.warn('AppAuthManager', `❌ Login failed: ${result.error}`);
        showToast(result.error || 'Login failed', 'error');
      }
    } catch (error) {
      logger.error('AppAuthManager', '💥 Login error:', error);
      showToast('Login failed: Network error', 'error');
    }
  }

  /**
   * Handle register form submission
   */
  async handleRegister(username: string, email: string, password: string): Promise<void> {
    logger.info('AppAuthManager', `📝 Handling registration for user: ${username}`);

    try {
      const result = await handleHostRegister(username, email, password, authService);

      if (result.success) {
        logger.info('AppAuthManager', '✅ Registration successful');
        showToast('Registration successful! Please login.', 'success');
        await this.app.router.navigateToScreen('login');
      } else {
        logger.warn('AppAuthManager', `❌ Registration failed: ${result.error}`);
        showToast(result.error || 'Registration failed', 'error');
      }
    } catch (error) {
      logger.error('AppAuthManager', '💥 Registration error:', error);
      showToast('Registration failed: Network error', 'error');
    }
  }

  /**
   * Handle forgot password form submission
   */
  async handleForgotPassword(email: string): Promise<void> {
    logger.info('AppAuthManager', `🔑 Handling forgot password for: ${email}`);

    try {
      let result;
      try {
        result = await authService.forgotPassword(email);
      } catch (err) {
        logger.error('AppAuthManager', 'authService.forgotPassword failed', err);
        throw err;
      }

      if (result.success) {
        logger.info('AppAuthManager', '✅ Forgot password request successful');
        showToast('Password reset email sent!', 'success');
        await this.app.router.navigateToScreen('login');
      } else {
        logger.warn('AppAuthManager', `❌ Forgot password failed: ${result.error}`);
        showToast(result.error || 'Failed to send reset email', 'error');
      }
    } catch (error) {
      logger.error('AppAuthManager', '💥 Forgot password error:', error);
      showToast('Failed to send reset email: Network error', 'error');
    }
  }

  /**
   * Handle logout
   */
  async handleLogout(): Promise<void> {
    logger.info('AppAuthManager', '🚪 Handling logout');

    try {
      try {
        if (authService && typeof authService.logout === 'function') {
          authService.logout();
        }
      } catch (err) {
        logger.error('AppAuthManager', 'authService.logout failed', err);
      }

      // Clear the host user in PlayerManager
      if (playerService && typeof playerService.clearHostUser === 'function') {
        playerService.clearHostUser();
        logger.info('AppAuthManager', '✅ Host user cleared in PlayerManager');
      }

      logger.info('AppAuthManager', '✅ Logout successful');
      showToast('Logged out successfully', 'info');
      // Navigate back to login screen
      try {
        await this.app.router.navigateToScreen('login');
      } catch (navErr) {
        logger.warn('AppAuthManager', 'Router navigation failed during logout', navErr);
      }

      // Update UI: prefer App instance methods if available, otherwise fall back to managers
      try {
        if (this.app && typeof this.app.updateUserDisplay === 'function') {
          this.app.updateUserDisplay();
        }
        if (this.app && typeof this.app.updateHostPlayerDisplay === 'function') {
          this.app.updateHostPlayerDisplay();
        }
      } catch (uiErr) {
        logger.warn('AppAuthManager', 'App UI update failed; attempting manager fallbacks', uiErr);
      }

      // Fallback: ensure player and UI managers are reset
      try {
        try {
          if (playerService && typeof playerService.clearAllPlayers === 'function') {
            playerService.clearAllPlayers();
          }
        } catch (e) {
          logger.warn('AppAuthManager', 'playerService.clearAllPlayers failed', e);
        }
        const am = (window as any).appManager;
        if (am && am.uiManager && typeof am.uiManager.updateUserDisplay === 'function') {
          am.uiManager.updateUserDisplay();
        }
      } catch (fallbackErr) {
        logger.error('AppAuthManager', 'Fallback UI manager reset failed', fallbackErr);
      }
    } catch (error) {
      logger.error('AppAuthManager', '💥 Logout error:', error);
      showToast('Logout failed', 'error');
    }
  }

  /**
   * Get host user information
   */
  getHostUser(): { userId: number; username: string } | null {
    const user = authService?.getCurrentUser?.();

    if (user) {
      return {
        userId: (user.userId || user.id),
        username: user.username
      };
    }

    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return authService?.isAuthenticated?.() || false;
  }
}