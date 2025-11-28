import { showToast } from '../toast';
import { AuthResult } from '../types';

export class ForgotPasswordPage {
    private router: any;

    constructor(router: any) {
        this.router = router;
    }

    init(): void {
        const forgotPasswordForm = document.getElementById('forgot-password-form') as HTMLFormElement;
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', this.handleForgotPassword.bind(this));
        }

        document.getElementById('back-to-login-from-forgot-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.router.navigate('login');
        });
    }

    cleanup(): void { }

    private async handleForgotPassword(e: Event): Promise<void> {
        e.preventDefault();
        const emailInput = document.getElementById('forgot-password-email') as HTMLInputElement;
        const email = emailInput.value.trim();

        if (!email) {
            showToast('Please enter your email address', 'error');
            return;
        }
        if (!email.includes('@')) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        try {
            const authManager = (window as any).authManager;
            const result: AuthResult = await authManager.forgotPassword(email);
            if (result.success) {
                showToast('Password reset link sent! Please check your email.', 'success');
                (document.getElementById('forgot-password-form') as HTMLFormElement).reset();
                this.router.navigate('login');
            } else {
                showToast('Failed to send reset email: ' + result.error, 'error');
            }
        } catch (error) {
            showToast('Failed to send reset email: Network error', 'error');
        }
    }
}
