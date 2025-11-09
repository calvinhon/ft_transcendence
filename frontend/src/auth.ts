// Stub file - auth module
// frontend/src/auth.ts - TypeScript version of authentication manager

interface User {
  userId: number;
  username: string;
  email?: string;
}

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

interface VerifyResponse {
  valid: boolean;
  user?: User;
  expired?: boolean;
  error?: string;
}

export class AuthManager {
  private baseURL: string = '/api/auth';
  public currentUser: User | null = null;
  private token: string | null;

  constructor() {
    this.token = localStorage.getItem('token');
    
    // If we have a token, verify it on startup
    if (this.token) {
      this.verifyToken().then(isValid => {
        if (!isValid) {
          console.log('Stored token is invalid, clearing auth data');
          this.logout();
        }
      });
    }
  }

  async register(username: string, email: string, password: string): Promise<AuthResult> {
    console.log('AuthManager.register called with:', { username, email, passwordProvided: !!password });
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
        this.token = data.token;
        console.log('Token set:', !!this.token);
        
        if (this.token) {
          localStorage.setItem('token', this.token);
          console.log('Token saved to localStorage');
        }
        
        // Handle both possible response formats
        const userData = data.user || data.data;
        console.log('User data extracted:', userData);
        
        this.currentUser = { 
          userId: userData.userId, 
          username: userData.username,
          ...(userData.email && { email: userData.email })
        };
        console.log('Current user set:', this.currentUser);
        
        console.log('Registration success - returning success result');
        return { success: true, data: data };
      } else {
        console.log('Registration failed with response:', data);
        return { success: false, error: data.error || data.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration catch block error:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : error);
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

      const data: AuthResponse = await response.json();
      
      if (response.ok && data.success) {
        this.token = data.token;
        localStorage.setItem('token', this.token);
        this.currentUser = { 
          userId: data.user.userId, 
          username: data.user.username,
          ...(data.user.email && { email: data.user.email })
        };
        return { success: true, data };
      } else {
        // Clear any existing auth data on failed login
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
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
      console.error('Forgot password error:', error);
      return { success: false, error: 'Network error' };
    }
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
        this.currentUser = data.user || null;
        return true;
      } else {
        console.log('Token verification failed:', data.error);
        if (data.expired) {
          console.log('Token has expired');
        }
        this.logout();
        return false;
      }
    } catch (error) {
      console.log('Token verification error:', error);
      this.logout();
      return false;
    }
  }

  logout(): void {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('token');
  }

  getAuthHeaders(): Record<string, string> {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.currentUser;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }
}

// Note: AuthManager is now created in main.ts to ensure proper initialization order
// DO NOT create it here as it causes duplicate instances