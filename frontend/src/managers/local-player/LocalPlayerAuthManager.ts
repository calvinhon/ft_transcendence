// frontend/src/managers/local-player/LocalPlayerAuthManager.ts
// Handles authentication logic for local players (login and registration)
import { logger } from '../../utils/Logger';
import { authManager } from '../auth';

export class LocalPlayerAuthManager {
  private dataManager: any;
  private modalManager: any;

  constructor(dataManager: any, modalManager: any) {
    this.dataManager = dataManager;
    this.modalManager = modalManager;
    console.log('🏆 [LocalPlayerAuthManager] Initialized');
  }

  // Login logic
  public async loginPlayer(email: string, password: string): Promise<any> {
    console.log('[LocalPlayerAuthManager] Login attempt - Email:', email, 'Password:', password ? '***' : 'empty');

    // Validate input
    const validation = this.dataManager.validateLoginInput(email, password);
    if (!validation.isValid) {
      this.modalManager.showLoginError(validation.error);
      return null;
    }

    // Check for duplicates first (before authentication)
    const duplicateCheck = this.dataManager.checkForDuplicates(email, '', '');
    if (duplicateCheck.isDuplicate) {
      console.warn('⚠️ [LocalPlayerAuthManager] Duplicate detected:', duplicateCheck.reason);
      this.modalManager.showLoginError(duplicateCheck.reason || 'This player is already added.');
      return null;
    }

    if (!authManager) {
      this.modalManager.showLoginError('Auth system not available.');
      return null;
    }

    console.log('[LocalPlayerAuthManager] Attempting authentication...');

    // Save host session before authentication
    const savedSession = this.dataManager.saveHostSession();

    try {
      const result = await authManager.login(email, password);
      console.log('[LocalPlayerAuthManager] Auth result:', result && (result as any).success ? '✅ Success' : '❌ Failed', result);

      // Always restore host session immediately after local player auth
      this.dataManager.restoreHostSession(savedSession);

      const raw = (result as any).data || result;
      if (!result || !(result as any).success || !raw) {
        this.modalManager.showLoginError((result as any).error || 'Login failed.');
        return null;
      }

      // Extract user data from auth response
      const userData = raw.user || raw;
      const token = raw.token || '';
      console.log('[LocalPlayerAuthManager] Extracted userData:', userData);

      if (!userData || !userData.userId) {
        throw new Error('User data is missing userId. Please check the response structure.');
      }

      const loginUserId = userData.userId.toString();
      const loginUsername = userData.username;
      const loginEmail = userData.email;

      console.log('[LocalPlayerAuthManager] Authenticated user data:', { userId: loginUserId, username: loginUsername, email: loginEmail });

      // Now check for duplicates using the actual authenticated user data
      const finalDuplicateCheck = this.dataManager.checkForDuplicates(loginEmail, loginUsername, loginUserId);
      if (finalDuplicateCheck.isDuplicate) {
        console.warn('⚠️ [LocalPlayerAuthManager] Duplicate detected after auth:', finalDuplicateCheck.reason);
        this.modalManager.showLoginError(finalDuplicateCheck.reason || 'This player is already added.');
        return null;
      }

      console.log('[LocalPlayerAuthManager] ✅ No duplicates found, proceeding to add player');

      // Determine team and create player object
      const team = this.dataManager.determinePlayerTeam();
      const playerObj = this.dataManager.createPlayerObject(userData, token, team);

      return {
        success: true,
        player: playerObj,
        savedSession
      };

    } catch (err) {
      logger.error('LocalPlayerAuthManager', 'Exception during login', err);
      this.modalManager.showLoginError('An error occurred during login: ' + (err as Error).message);
      return null;
    }
  }

  // Registration logic
  public async registerPlayer(username: string, email: string, password: string): Promise<any> {
    console.log('[LocalPlayerAuthManager] Register attempt - Username:', username, 'Email:', email, 'Password:', password ? '***' : 'empty');

    // Validate input
    const validation = this.dataManager.validateRegisterInput(username, email, password);
    if (!validation.isValid) {
      this.modalManager.showRegisterError(validation.error);
      return null;
    }

    // Check for duplicates
    const duplicateCheck = this.dataManager.checkForDuplicates(email, username, '');
    if (duplicateCheck.isDuplicate) {
      this.modalManager.showRegisterError(duplicateCheck.reason || 'This player is already added.');
      return null;
    }

    if (!authManager) {
      this.modalManager.showRegisterError('Auth system not available.');
      return null;
    }

    console.log('[LocalPlayerAuthManager] Attempting registration...');

    // Save host session before registration
    const savedSession = this.dataManager.saveHostSession();

    try {
      const result = await authManager.register(username, email, password);
      console.log('[LocalPlayerAuthManager] Registration result:', result && (result as any).success ? '✅ Success' : '❌ Failed', result);

      // Always restore host session immediately after local player registration
      this.dataManager.restoreHostSession(savedSession);

      const rawReg = (result as any).data || result;
      if (!result || !(result as any).success || !rawReg) {
        this.modalManager.showRegisterError((result as any).error || 'Registration failed.');
        return null;
      }

      console.log('[LocalPlayerAuthManager] ✅ Entered register success block!');

      // Determine team and create player object
      const team = this.dataManager.determinePlayerTeam();

      console.log('[LocalPlayerAuthManager] Creating player object for registration...');
      console.log('[LocalPlayerAuthManager] Full result.data structure:', JSON.stringify(rawReg, null, 2));

      // Extract user data from nested structure (result.data.data for registration)
      const userData = (rawReg && rawReg.data) || rawReg.user || rawReg;
      console.log('[LocalPlayerAuthManager] Extracted userData:', userData);

      if (!userData || !userData.userId) {
        throw new Error('User data is missing userId. Please check the response structure.');
      }

      const playerObj = this.dataManager.createPlayerObject(userData, (rawReg && rawReg.token) || '', team);

      return {
        success: true,
        player: playerObj,
        savedSession
      };

    } catch (err) {
      logger.error('LocalPlayerAuthManager', 'Exception during registration', err);
      this.modalManager.showRegisterError('An error occurred during registration: ' + (err as Error).message);
      return null;
    }
  }

  // Password reset
  public async requestPasswordReset(email: string): Promise<boolean> {
    console.log('[LocalPlayerAuthManager] Sending password reset for:', email);

    if (!authManager) {
      logger.error('LocalPlayerAuthManager', 'AuthManager not available');
      return false;
    }

    try {
      const result = await authManager.forgotPassword(email);
      console.log('[LocalPlayerAuthManager] Forgot password result:', result);

      if (result.success) {
        console.log('✅ [LocalPlayerAuthManager] Password reset email sent');
        return true;
      } else {
        logger.error('LocalPlayerAuthManager', 'Password reset failed', result.error);
        return false;
      }
    } catch (error) {
      logger.error('LocalPlayerAuthManager', 'Exception during forgot password', error);
      return false;
    }
  }
}