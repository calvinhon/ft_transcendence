// frontend/src/managers/auth/TokenManager.ts
// Manages JWT token storage, retrieval, and verification

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
  private token: string | null = null;

  constructor() {
    this.token = sessionStorage.getItem('token');
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
    if (token) {
      sessionStorage.setItem('token', token);
    } else {
      sessionStorage.removeItem('token');
    }
  }

  clearToken(): void {
    this.token = null;
    sessionStorage.removeItem('token');
  }

  async verifyToken(): Promise<boolean> {
    if (!this.token) {
      console.log('No token to verify');
      return false;
    }

    try {
      console.log('Verifying token with backend...');
      const response = await fetch(`${this.baseURL}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        }
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
        this.clearToken();
        return false;
      }
    } catch (error) {
      console.log('Token verification error:', error);
      this.clearToken();
      return false;
    }
  }

  getAuthHeaders(): Record<string, string> {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  hasValidToken(): boolean {
    return !!this.token;
  }
}