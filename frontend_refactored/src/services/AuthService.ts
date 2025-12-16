import { Api } from '../core/Api';
import { App } from '../core/App';
import { User } from '../types';

export class AuthService {
    private static instance: AuthService;

    private constructor() {
        // Explicitly called by App
    }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    /**
     * Standard Login
     * @param navigateToHome If true, redirects to home on success. False is useful for "Add Player" modal.
     */
    public async login(username: string, password: string, navigateToHome: boolean = true): Promise<{ success: boolean, user?: User, error?: string }> {
        try {
            const response = await Api.post('/api/auth/login', { username, password });

            if (response.success && response.data?.token) {
                this.handleAuthSuccess(response.data.token, response.data.user);
                if (navigateToHome) {
                    App.getInstance().router.navigateTo('/');
                }
                return { success: true, user: response.data.user };
            }
            return { success: false, error: response.error || 'Login failed' };
        } catch (e: any) {
            console.error("Login failed", e);
            return { success: false, error: e.message || 'Network error' };
        }
    }

    public async register(username: string, email: string, password: string): Promise<boolean> {
        try {
            const response = await Api.post('/api/auth/register', { username, email, password });

            if (response.success && response.data?.token) {
                this.handleAuthSuccess(response.data.token, response.data.user);
                App.getInstance().router.navigateTo('/');
                return true;
            }
            return false;
        } catch (e) {
            console.error("Registration failed", e);
            throw e;
        }
    }

    public async forgotPassword(email: string): Promise<{ success: boolean, error?: string }> {
        try {
            const response = await Api.post('/api/auth/forgot-password', { email });
            if (response.success) {
                return { success: true };
            }
            return { success: false, error: response.error || 'Failed to send reset email' };
        } catch (e: any) {
            console.error("Forgot password failed", e);
            return { success: false, error: e.message || 'Network error' };
        }
    }

    public logout(): void {
        localStorage.removeItem('token');
        App.getInstance().currentUser = null;
        Api.post('/api/auth/logout', {}).catch(e => console.warn('Logout API call failed', e)); // Best effort
        App.getInstance().router.navigateTo('/login');
    }

    public getCurrentUser(): User | null {
        // Access App instance via global or direct App import if circular dependency is managed
        // Ideally App holds state.
        return App.getInstance().currentUser;
    }

    public async checkSession(): Promise<boolean> {
        // Even if no token, we should check with server in case of HTTP-only cookies

        try {
            const response = await Api.post('/api/auth/verify', {});
            // Check for nested structure: { success: true, data: { valid: true, user: {...} } }
            if (response.success && response.data?.valid && response.data?.user) {
                App.getInstance().currentUser = response.data.user;
                // Update token if returned (refresh)
                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
                }
                return true;
            } else {
                // Not valid
                this.logout();
                return false;
            }
        } catch (e) {
            // Token likely invalid
            this.logout();
            return false;
        }
    }

    // ==========================================
    // OAuth Methods (Redirect Based)
    // ==========================================

    public async loginWithSchool42(): Promise<void> {
        window.location.href = '/api/auth/oauth/init?provider=42';
    }

    public async loginWithGoogle(): Promise<void> {
        window.location.href = '/api/auth/oauth/init?provider=google';
    }

    public async loginWithGithub(): Promise<void> {
        window.location.href = '/api/auth/oauth/init?provider=github';
    }

    private handleAuthSuccess(token: string, user: User): void {
        if (token) localStorage.setItem('token', token);
        App.getInstance().currentUser = user;
    }
}
