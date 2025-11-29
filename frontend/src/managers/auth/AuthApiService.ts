// frontend/src/managers/auth/AuthApiService.ts
// Handles authentication API communication
import { logger } from '../../utils/Logger';

interface AuthResponse {
  success: boolean;
  message?: string;
  token: string;
  user: {
    userId: number;
    username: string;
    email?: string;
  };
}

interface AuthResult {
  success: boolean;
  error?: string;
  data?: AuthResponse;
}

export class AuthApiService {
  private baseURL: string = '/api/auth';

  async register(username: string, email: string, password: string): Promise<AuthResult> {
    console.log('AuthApiService.register called with:', { username, email, passwordProvided: !!password });
    try {
      const requestBody = { username, email, password };
      console.log('Sending registration request with body:', { username, email, passwordProvided: !!password });

      const response = await fetch(`${this.baseURL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Registration response status:', response.status, response.ok);
      const data: any = await response.json();
      console.log('Registration response data:', data);

      if (data.success) {
        console.log('Registration success detected, processing...');

        // Extract from nested backend response
        const user = data.data?.user || data.user;
        const token = data.data?.token || data.token;

        console.log('Token extracted:', !!token);

        console.log('Registration success - returning success result');
        return {
          success: true,
          data: {
            success: true,
            token,
            user,
            message: data.message
          }
        };
      } else {
        console.log('Registration failed with response:', data);
        return { success: false, error: data.error || data.message || 'Registration failed' };
      }
    } catch (error) {
      logger.error('AuthApiService', 'Registration catch block error', error);
      logger.error('AuthApiService', `Error type: ${typeof error}`);
      logger.error('AuthApiService', `Error message: ${error instanceof Error ? error.message : error}`);
      return { success: false, error: 'Network error' };
    }
  }

  async login(username: string, password: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      const data: any = await response.json();

      if (response.ok && data.success) {
        // Extract from nested backend response
        const user = data.data?.user || data.user;
        const token = data.data?.token || data.token;

        return {
          success: true,
          data: {
            success: true,
            token,
            user,
            message: data.message
          }
        };
      } else {
        return { success: false, error: (data as any).error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async forgotPassword(email: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseURL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data: any = await response.json();

      if (data.success) {
        return { success: true, data };
      } else {
        return { success: false, error: data.error || data.message || 'Failed to send reset email' };
      }
    } catch (error) {
      logger.error('AuthApiService', 'Forgot password error', error);
      return { success: false, error: 'Network error' };
    }
  }
}