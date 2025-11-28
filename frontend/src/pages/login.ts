import { showToast } from '../toast';
import { handleHostLogin } from '../host-auth';
import { AuthResult } from '../types';

export class LoginPage {
    private router: any;

    constructor(router: any) {
        this.router = router;
    }

    init(): void {
        const loginForm = document.getElementById('login-form') as HTMLFormElement;
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.router.navigate('forgot-password');
        });

        document.getElementById('create-account-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.router.navigate('register');
        });
    }

    cleanup(): void {
        // Event listeners are automatically removed when the DOM element is removed
        // but if we attached anything to window/document, we should remove it here.
    }

    private async handleLogin(e: Event): Promise<void> {
        e.preventDefault();
        const usernameInput = document.getElementById('login-username') as HTMLInputElement;
        const passwordInput = document.getElementById('login-password') as HTMLInputElement;
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!username || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            const authManager = (window as any).authManager;
            const result: AuthResult = await handleHostLogin(username, password, authManager);
            if (result.success) {
                this.router.navigate('main-menu');
            } else {
                authManager.currentUser = null;
                sessionStorage.removeItem('token');
                showToast('Login failed: ' + result.error, 'error');
            }
        } catch (error) {
            showToast('Login failed: Network error', 'error');
        }
    }
}
