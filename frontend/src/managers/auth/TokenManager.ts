// frontend/src/managers/auth/TokenManager.ts
// Manages JWT token verification (token is now in HTTP-only cookie)

interface VerifyResponse {
  valid: boolean;
  user?: {
    userId: number;
    username: string;
    email?: string;
  };
  expired?: boolean;
  error?: string;
}

export class TokenManager {
  private baseURL: string = '/api/auth';

  constructor() {
    // Token is now stored in HTTP-only cookie, not accessible from JS
  }

  getToken(): string | null {
    // Token is in HTTP-only cookie, cannot be accessed from JS
    return null;
  }

  setToken(token: string): void {
    // Token is set by backend as HTTP-only cookie, no client-side storage needed
    console.log('Token is now managed by HTTP-only cookie');
  }

  clearToken(): void {
    // Token is cleared by backend logout endpoint
    console.log('Token clearing is handled by backend logout');
  }

  async verifyToken(): Promise<boolean> {
    try {
      console.log('Verifying token with backend...');
      const response = await fetch(`${this.baseURL}/verify`, {
        method: 'POST',
        credentials: 'include'
      });

      const data: VerifyResponse = await response.json();

      if (response.ok && data.valid) {
        console.log('Token verified successfully');
        return true;
      } else {
        console.log('Token verification failed:', data.error);
        if (data.expired) {
          console.log('Token has expired');
        }
        return false;
      }
    } catch (error) {
      console.log('Token verification error:', error);
      return false;
    }
  }

  getAuthHeaders(): Record<string, string> {
    // No longer needed with HTTP-only cookies
    return {};
  }

  hasValidToken(): Promise<boolean> {
    // Must verify with backend since token is in HTTP-only cookie
    return this.verifyToken();
  }
}