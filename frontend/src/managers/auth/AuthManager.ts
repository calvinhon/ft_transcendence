// frontend/src/managers/auth/AuthManager.ts
// Main orchestrator for authentication functionality

import { TokenManager } from './TokenManager';
import { AuthApiService } from './AuthApiService';
import { UserSessionManager } from './UserSessionManager';

interface User {
  userId: number;
  username: string;
  email?: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
  data?: {
    success: boolean;
    token: string;
    user: User;
    message?: string;
  };
}

export class AuthManager {
  private tokenManager: TokenManager;
  private apiService: AuthApiService;
  private sessionManager: UserSessionManager;

  constructor() {
    this.tokenManager = new TokenManager();
    this.apiService = new AuthApiService();
    this.sessionManager = new UserSessionManager();

    // Verify token on startup
    this.initializeAuthState();
  }

  private async initializeAuthState(): Promise<void> {
    if (this.tokenManager.hasValidToken()) {
      const isValid = await this.tokenManager.verifyToken();
      if (!isValid) {
        console.log('Stored token is invalid, clearing auth data');
        this.logout();
      }
    }
  }

  async register(username: string, email: string, password: string): Promise<AuthResult> {
    const result = await this.apiService.register(username, email, password);

    if (result.success && result.data) {
      // Store token and user data
      this.tokenManager.setToken(result.data.token);
      this.sessionManager.setCurrentUser({
        userId: result.data.(user.userId || user.id),
        username: result.data.user.username,
        ...(result.data.user.email && { email: result.data.user.email })
      });
    }

    return result;
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const result = await this.apiService.login(username, password);

    if (result.success && result.data) {
      // Store token and user data
      this.tokenManager.setToken(result.data.token);
      this.sessionManager.setCurrentUser({
        userId: result.data.(user.userId || user.id),
        username: result.data.user.username,
        ...(result.data.user.email && { email: result.data.user.email })
      });
    } else {
      // Clear any existing auth data on failed login
      this.logout();
    }

    return result;
  }

  async forgotPassword(email: string): Promise<AuthResult> {
    return this.apiService.forgotPassword(email);
  }

  async verifyToken(): Promise<boolean> {
    const isValid = await this.tokenManager.verifyToken();
    if (!isValid) {
      this.sessionManager.clearCurrentUser();
    }
    return isValid;
  }

  logout(): void {
    this.tokenManager.clearToken();
    this.sessionManager.clearCurrentUser();
  }

  getAuthHeaders(): Record<string, string> {
    return this.tokenManager.getAuthHeaders();
  }

  isAuthenticated(): boolean {
    return this.tokenManager.hasValidToken() && this.sessionManager.isAuthenticated();
  }

  getCurrentUser(): User | null {
    return this.sessionManager.getCurrentUser();
  }

  setCurrentUser(user: User | null): void {
    this.sessionManager.setCurrentUser(user);
  }

  // Update user from token verification
  updateUserFromVerification(user: User | null): void {
    this.sessionManager.updateUserFromTokenVerification(user);
  }
}