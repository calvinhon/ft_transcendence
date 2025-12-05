import { showToast } from '../toast';
import { handleHostRegister } from '../host-auth';
import { AuthResult } from '../types';

export class RegisterPage {
    private router: any;

    constructor(router: any) {
        this.router = router;
    }

    init(): void {
        const registerForm = document.getElementById('register-form') as HTMLFormElement;
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        document.getElementById('back-to-login-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.router.navigate('login');
        });
    }

    cleanup(): void { }

    private async handleRegister(e: Event): Promise<void> {
        e.preventDefault();
        const usernameInput = document.getElementById('register-username') as HTMLInputElement;
        const emailInput = document.getElementById('register-email') as HTMLInputElement;
        const passwordInput = document.getElementById('register-password') as HTMLInputElement;
        const username = usernameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!username || !email || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        if (password.length < 6) {
            showToast('Password must be at least 6 characters long', 'error');
            return;
        }

        try {
            const authManager = (window as any).authManager;
            const result: AuthResult = await handleHostRegister(username, email, password, authManager);
            if (result.success) {
                this.router.navigate('main-menu');
            } else {
                showToast('Registration failed: ' + result.error, 'error');
            }
        } catch (error) {
            showToast('Registration failed: Network error', 'error');
        }
    }
}
