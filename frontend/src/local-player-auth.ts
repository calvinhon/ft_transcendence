// frontend/src/local-player-auth.ts
// Authentication logic for local players

import { LocalPlayer } from './types';

export interface AuthResult {
  success: boolean;
  error?: string;
  data?: any;
}

export class LocalPlayerAuth {
  public async registerAndHighlightLocalPlayer(
    app: any,
    username: string,
    email: string,
    password: string
  ): Promise<void> {
    console.log('🔧 [LocalPlayer] registerAndHighlightLocalPlayer() called with:', { username, email });

    try {
      const result = await this.registerLocalPlayer(username, email, password);

      if (result.success && result.data) {
        console.log('✅ [LocalPlayer] Registration successful, adding to local players');

        const authManager = (window as any).authManager;
        const token = authManager?.getToken() || '';

        // Add to local players list
        if (app && app.playerManager) {
          const localPlayer: LocalPlayer = {
            id: `user_${result.data.userId}`,
            username: result.data.username,
            isCurrentUser: true,
            userId: result.data.userId,
            token: token
          };

          app.playerManager.addLocalPlayer(localPlayer);
          console.log('✅ [LocalPlayer] Added to local players list');
        }

        this.showToast('Registration successful!', 'success');
      } else {
        console.warn('❌ [LocalPlayer] Registration failed:', result.error);
        this.showToast(result.error || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('💥 [LocalPlayer] Registration error:', error);
      this.showToast('An unexpected error occurred', 'error');
    }
  }

  public async registerLocalPlayer(
    username: string,
    email: string,
    password: string
  ): Promise<AuthResult> {
    console.log('🔧 [LocalPlayer] registerLocalPlayer() called with:', { username, email });

    try {
      const authManager = (window as any).authManager;
      if (!authManager) {
        return { success: false, error: 'Authentication system not available' };
      }

      const result = await authManager.register(username, email, password);
      console.log('📝 [LocalPlayer] Registration result:', result);

      return result;
    } catch (error) {
      console.error('💥 [LocalPlayer] Registration error:', error);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  public addLocalPlayerToList(
    localPlayers: LocalPlayer[],
    user: any,
    token: string
  ): LocalPlayer[] {
    console.log('🔧 [LocalPlayer] addLocalPlayerToList() called with user:', user);

    // Check for duplicate email
    const existingPlayer = localPlayers.find(p => p.email === user.email);
    if (existingPlayer) {
      console.warn('⚠️ [LocalPlayer] Player with email already exists:', user.email);
      throw new Error('A player with this email already exists');
    }

    const newPlayer: LocalPlayer = {
      id: `user_${user.userId}`,
      username: user.username,
      email: user.email,
      isCurrentUser: true,
      userId: user.userId,
      token: token
    };

    const updatedList = [...localPlayers, newPlayer];
    console.log('✅ [LocalPlayer] Added player to list:', newPlayer);

    return updatedList;
  }

  public validateRegistrationData(
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!username || username.trim().length === 0) {
      errors.push('Username is required');
    } else if (username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(email)) {
      errors.push('Please enter a valid email address');
    }

    if (!password || password.length === 0) {
      errors.push('Password is required');
    } else if (password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public validateLoginData(email: string, password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(email)) {
      errors.push('Please enter a valid email address');
    }

    if (!password || password.length === 0) {
      errors.push('Password is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const toast = (window as any).showToast;
    if (toast) {
      toast(message, type);
    } else {
      console.log(`Toast: ${type.toUpperCase()} - ${message}`);
    }
  }
}