import { Api } from '../core/Api';
import { App } from '../core/App';
import { User } from '../types';
import { LocalPlayerService } from './LocalPlayerService';

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

            const data = response.data || response;
            const token = data.token; // Might be undefined if using cookies
            const user = data.user;

            if (response.success) {
                this.handleAuthSuccess(token, user);
                if (navigateToHome) {
                    App.getInstance().router.navigateTo('/');
                }
                return { success: true, user: user };
            }
            return { success: false, error: response.error || response.message || 'Login failed' };
        } catch (e: any) {
            console.error("Login failed", e);
            return { success: false, error: e.message || 'Network error' };
        }
    }

    public async register(username: string, email: string, password: string): Promise<boolean> {
        try {
            const response = await Api.post('/api/auth/register', { username, email, password });

            const data = response.data || response;
            const token = data.token;
            const user = data.user;

            if (response.success) {
                this.handleAuthSuccess(token, user);
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
        // Hoach added: Call backend logout to delete HTTP-only cookie session
        Api.post('/api/auth/logout', {}).catch(e => {
            console.warn('Logout API call failed', e);
            // Continue with client-side cleanup even if API fails
        });
        // End Hoach added

        // localStorage.removeItem('token');
        // localStorage.removeItem('user');

        // Clear local players state
        LocalPlayerService.getInstance().clearAllPlayers();

        App.getInstance().currentUser = null;
        App.getInstance().router.navigateTo('/login');
    }

    public getCurrentUser(): User | null {
        // Access App instance via global or direct App import if circular dependency is managed
        // Ideally App holds state.
        return App.getInstance().currentUser;
    }

    public async checkSession(): Promise<boolean> {
        console.log("AuthService: Checking Session...");

        // Hoach added: HTTP-only cookie session validation
        // No localStorage check - session is in HTTP-only cookie, browser sends it automatically
        try {
            const verifyPromise = Api.post('/api/auth/verify', {});
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Session verify timeout")), 5000)
            );

            console.log("AuthService: Verifying HTTP-only cookie session...");
            const response = await Promise.race([verifyPromise, timeoutPromise]) as any;
            console.log("AuthService: Session verification response:", response);

            const data = response.data || response;

            // Backend validated the HTTP-only cookie and returned user
            if (data.user) {
                console.log("AuthService: Session valid for user", data.user.username);
                App.getInstance().currentUser = data.user;
                // Don't store in localStorage - session is in HTTP-only cookie
                return true;
            }

            console.warn("AuthService: No user data in verify response");
            return false;
        } catch (e: any) {
            console.error("AuthService: Session verification failed:", e.message || e);
            // Session invalid or expired - require login
            return false;
        }
        // End Hoach added
    }

    // ==========================================
    // OAuth Methods (Popup Based)
    // ==========================================

    public async loginWithSchool42(): Promise<void> {
        await this.initiateOAuthPopup('42');
    }

    public async loginWithGoogle(): Promise<void> {
        await this.initiateOAuthPopup('google');
    }

    public async loginWithGithub(): Promise<void> {
        await this.initiateOAuthPopup('github');
    }

    public async verifyCredentials(username: string, password: string): Promise<{ success: boolean, user?: User, token?: string, error?: string }> {
        try {
            const response = await Api.post('/api/auth/login', { username, password });
            if (response.success) {
                const user = response.data?.user || response.user;
                if (user) {
                    return {
                        success: true,
                        user: {
                            userId: user.userId || user.id,
                            username: user.username,
                            email: user.email
                        },
                        token: response.data?.token // Return token if present
                    };
                }
            }
            return { success: false, error: response.error || response.message || 'Verification failed' };
        } catch (e: any) {
            return { success: false, error: e.message || 'Network error' };
        }
    }

    public async registerUserOnly(username: string, email: string, password: string): Promise<{ success: boolean, user?: User, token?: string, error?: string }> {
        try {
            const response = await Api.post('/api/auth/register', { username, email, password });

            const data = response.data || response;
            const user = data.user || response.user;
            const token = data.token;

            if (response.success) {
                return {
                    success: true,
                    user: user,
                    token: token
                };
            }
            return { success: false, error: response.error || 'Registration failed' };
        } catch (e: any) {
            return { success: false, error: e.message || 'Network error' };
        }
    }

    /**
     * Authenticates via OAuth popup but returns the data instead of logging in globally.
     * Used for adding local players.
     */
    public async authenticateViaOAuth(provider: string): Promise<{ success: boolean, user?: User, token?: string, error?: string }> {
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const url = `/api/auth/oauth/init?provider=${provider}`;

        const popup = window.open(
            url,
            'OAuth Login',
            `width=${width},height=${height},left=${left},top=${top},toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0`
        );

        if (!popup) return { success: false, error: "Popup blocked" };

        try {
            const authData = await this.waitForOAuthPopup(popup);
            if (authData && authData.success) {
                return { success: true, user: authData.user, token: authData.token }; // Pure data return
            } else {
                return { success: false, error: authData?.error || "OAuth failed" };
            }
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async initiateOAuthPopup(provider: string): Promise<void> {
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const url = `/api/auth/oauth/init?provider=${provider}`; // Backend endpoint to start OAuth
        // Note: Backend works by redirecting this popup to the provider

        const popup = window.open(
            url,
            'OAuth Login',
            `width=${width},height=${height},left=${left},top=${top},toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0`
        );

        if (!popup) {
            alert("Popup blocked! Please allow popups for this site.");
            return;
        }

        try {
            const authData = await this.waitForOAuthPopup(popup);
            if (authData && authData.success) {
                this.handleAuthSuccess(authData.token, authData.user);
                App.getInstance().router.navigateTo('/');
            } else {
                console.error("OAuth failed:", authData?.error);
                alert("Authentication failed: " + (authData?.error || "Unknown error"));
            }
        } catch (error) {
            console.error("OAuth error:", error);
        }
    }

    private waitForOAuthPopup(popup: Window): Promise<any> {
        return new Promise((resolve, reject) => {
            let handled = false;

            // Listener for message from popup
            const messageHandler = (event: MessageEvent) => {
                // Security check: ensure origin matches (if needed, currently relative)
                // if (event.origin !== window.location.origin) return;

                if (event.data && event.data.type === 'OAUTH_SUCCESS') {
                    handled = true;
                    window.removeEventListener('message', messageHandler);
                    popup.close();
                    resolve(event.data.payload);
                } else if (event.data && event.data.type === 'OAUTH_ERROR') {
                    handled = true;
                    window.removeEventListener('message', messageHandler);
                    popup.close();
                    reject(new Error(event.data.error));
                }
            };

            window.addEventListener('message', messageHandler);

            // Poll to see if popup closed manually
            const timer = setInterval(() => {
                if (popup.closed) {
                    clearInterval(timer);
                    window.removeEventListener('message', messageHandler);
                    if (!handled) {
                        reject(new Error("Login window closed"));
                    }
                }
            }, 1000);
        });
    }

    /**
     * Called by the Popup Window to pass data back to opener
     */
    public handleOAuthCallbackInPopup(user: User, token: string): void {
        if (window.opener) {
            window.opener.postMessage({
                type: 'OAUTH_SUCCESS',
                payload: { success: true, user, token }
            }, window.location.origin);
            window.close();
        } else {
            // Fallback if no opener (e.g. mobile or weird browser behavior)
            // Just set storage and redirect locally
            this.handleAuthSuccess(token, user);
            window.location.href = '/';
        }
    }

    /**
     * Called by the Popup Window on error
     */
    public handleOAuthErrorInPopup(error: string): void {
        if (window.opener) {
            window.opener.postMessage({
                type: 'OAUTH_ERROR',
                error
            }, window.location.origin);
            window.close();
        } else {
            alert("Authentication failed: " + error);
            window.location.href = '/login';
        }
    }


    private handleAuthSuccess(token: string, user: User): void {
        // Hoach added: Remove localStorage usage, rely on HTTP-only cookie
        // Cookie is automatically sent by browser on every request
        // No need to store anything in localStorage
        // if (token) localStorage.setItem('token', token);
        // if (user) localStorage.setItem('user', JSON.stringify(user));
        // End Hoach added
        App.getInstance().currentUser = user;
    }

    public restoreUserFromStorage(): void {
        // Hoach added: Session validation now handled by backend via HTTP-only cookie
        // Don't restore from localStorage; let checkSession() validate the session
        // const userStr = localStorage.getItem('user');
        // if (userStr) {
        //     try {
        //         const user = JSON.parse(userStr);
        //         App.getInstance().currentUser = user;
        //     } catch (e) {
        //         console.warn("Failed to restore user from storage");
        //     }
        // }
        // End Hoach added
    }
}
