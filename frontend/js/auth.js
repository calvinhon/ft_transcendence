// frontend/js/auth.js
class AuthManager {
    constructor() {
        this.baseURL = '/api/auth';
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        
        // Configure for PHP backend in development
        if (window.location.hostname === 'localhost') {
            this.baseURL = 'http://localhost:8000/auth';
            console.log('AuthManager: Using PHP backend at localhost:8000');
        }
        
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

    async register(username, email, password) {
        try {
            const response = await fetch(`${this.baseURL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('token', this.token);
                this.currentUser = { userId: data.userId, username };
                return { success: true, data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    async login(username, password) {
        try {
            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('token', this.token);
                this.currentUser = { userId: data.userId, username: data.username };
                return { success: true, data };
            } else {
                // Clear any existing auth data on failed login
                this.token = null;
                this.currentUser = null;
                localStorage.removeItem('token');
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    async verifyToken() {
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

            const data = await response.json();
            
            if (response.ok && data.valid) {
                console.log('Token verified successfully');
                this.currentUser = data.user;
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

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('token');
    }

    getAuthHeaders() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    }

    isAuthenticated() {
        return !!this.token && !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Global auth manager instance
window.authManager = new AuthManager();