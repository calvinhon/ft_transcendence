// frontend/src/auth.ts - Simplified authentication manager without JWT

interface User {
  userId: number;
  username: string;
  email?: string;
}

interface AuthResponse {
  success: boolean;
  message?: string;
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

export class AuthManager {
  private baseURL: string = '/api/auth';
  public currentUser: User | null = null;

  constructor() {
    // No token verification on startup since we removed JWT
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
        
        // Extract from nested backend response
        const user = data.data?.user || data.user;
        console.log('User registered:', user.username);
        
        this.currentUser = { 
          userId: user.userId || user.id, 
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
        body: JSON.stringify({ username, password })
      });

      const data: any = await response.json();
      
      if (response.ok && data.success) {
        // Extract from nested backend response
        const user = data.data?.user || data.user;
        
        this.currentUser = { 
          userId: user.userId || user.id, 
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

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseURL}/logout`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.currentUser = null;
    }
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }
}
