// frontend/js/auth.js
class AuthManager {
    constructor() {
        this.baseURL = '/api/auth';
        this.currentUser = null;
        this.token = localStorage.getItem('token');
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
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    async verifyToken() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await fetch(`${this.baseURL}/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            
            if (response.ok && data.valid) {
                this.currentUser = data.user;
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
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