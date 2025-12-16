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

    public async login(username: string, password: string): Promise<boolean> {
        try {
            const response = await Api.post('/api/auth/login', { username, password });

            if (response.success && response.data?.token) {
                this.handleAuthSuccess(response.data.token, response.data.user);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Login failed", e);
            throw e;
        }
    }

    public async register(username: string, email: string, password: string): Promise<boolean> {
        try {
            const response = await Api.post('/api/auth/register', { username, email, password });

            if (response.success && response.data?.token) {
                this.handleAuthSuccess(response.data.token, response.data.user);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Registration failed", e);
            throw e;
        }
    }

    public logout(): void {
        localStorage.removeItem('token');
        App.getInstance().currentUser = null;
        App.getInstance().router.navigateTo('/login');
    }

    public getCurrentUser(): User | null {
        // We can access App instance via a getter or just rely on what we have. 
        // Actually, AuthService shouldn't depend on App for user state if possible, but App holds it. 
        // Let's just fix the build error by adding the method.
        const app = (window as any).app;
        return app ? app.currentUser : null;
    }

    public async checkSession(): Promise<void> {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await Api.post('/api/auth/verify', {});
            if (response.valid && response.user) {
                App.getInstance().currentUser = response.user;
                // Re-navigate if on login/register page? No, App router handles that.
            } else {
                this.logout();
            }
        } catch (e) {
            // Token likely invalid
            this.logout();
        }
    }

    private handleAuthSuccess(token: string, user: User): void {
        localStorage.setItem('token', token);
        App.getInstance().currentUser = user;
        App.getInstance().router.navigateTo('/');
    }
}
