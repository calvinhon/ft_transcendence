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

  constructor() {
    // Verify token on startup (token is now in HTTP-only cookie)
    this.verifyToken().then(isValid => {
      if (!isValid) {
        console.log('Token verification failed on startup');
      }
    });
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
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      console.log('Registration response status:', response.status, response.ok);
      const data: any = await response.json();
      console.log('Registration response data:', data);
      
      if (data.success) {
        console.log('Registration success detected, processing...');
        
        // Extract from nested backend response
        const user = data.data?.user || data.user;
        console.log('User registered:', user.username);
        
        this.currentUser = { 
          userId: user.userId, 
          username: user.username,
          ...(user.email && { email: user.email })
        };
        console.log('Current user set:', this.currentUser);
        
        console.log('Registration success - returning success result');
        return { 
          success: true, 
          data: { 
            success: true, 
            token: '', 
            user, 
            message: data.message 
          } 
        };
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
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data: any = await response.json();
      
      if (response.ok && data.success) {
        // Extract from nested backend response
        const user = data.data?.user || data.user;
        
        this.currentUser = { 
          userId: user.userId, 
          username: user.username,
          ...(user.email && { email: user.email })
        };
        return { 
          success: true, 
          data: { 
            success: true, 
            token: '', 
            user, 
            message: data.message 
          } 
        };
      } else {
        // Clear any existing auth data on failed login
        this.currentUser = null;
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
        credentials: 'include',
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
    try {
      console.log('Verifying token with backend...');
      const response = await fetch(`${this.baseURL}/verify`, {
        method: 'POST',
        credentials: 'include'
      });

      const result: any = await response.json();
      console.log('Verify response:', result);
      
      // Handle nested response structure: { success: true, data: { valid: true, user: {...} } }
      if (response.ok && result.success && result.data?.valid) {
        console.log('Token verified successfully, user:', result.data.user);
        this.currentUser = result.data.user || null;
        return true;
      } else {
        console.log('Token verification failed:', result.error || 'No valid data');
        this.logout();
        return false;
      }
    } catch (error) {
      console.log('Token verification error:', error);
      this.logout();
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseURL}/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    this.currentUser = null;
  }

  getAuthHeaders(): Record<string, string> {
    // No longer needed with HTTP-only cookies, but keep for compatibility
    return {};
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // OAuth Sign-In Methods
  async loginWithSchool42(): Promise<void> {
    console.log('Initiating 42 School OAuth login...');
    window.location.href = `${this.baseURL}/oauth/init?provider=42`;
  }

  async loginWithGoogle(): Promise<void> {
    console.log('Initiating Google OAuth login...');
    window.location.href = `${this.baseURL}/oauth/init?provider=google`;
  }

  async loginWithGithub(): Promise<void> {
    console.log('Initiating GitHub OAuth login...');
    window.location.href = `${this.baseURL}/oauth/init?provider=github`;
  }

  // Handle OAuth callback
  async handleOAuthCallback(): Promise<AuthResult> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const provider = urlParams.get('provider');

    if (!code || !provider) {
      return {
        success: false,
        error: 'Missing OAuth parameters'
      };
    }

    try {
      const response = await fetch(`${this.baseURL}/oauth/callback?code=${code}&provider=${provider}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data: AuthResponse = await response.json();

      if (response.ok && data.success) {
        this.currentUser = data.user;
        console.log('OAuth login successful:', this.currentUser);
        
        // Clear OAuth parameters from URL
        window.history.replaceState({}, document.title, '/');
        
        return {
          success: true,
          data
        };
      } else {
        return {
          success: false,
          error: data.message || 'OAuth authentication failed'
        };
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth callback failed'
      };
    }
  }
}

// Note: AuthManager is now created in main.ts to ensure proper initialization order
// DO NOT create it here as it causes duplicate instances