import { AbstractComponent } from "../components/AbstractComponent";
import { AuthService } from "../services/AuthService";
import { App } from "../core/App";

export class RegisterPage extends AbstractComponent {
    constructor() {
        super();
        this.setTitle('Register');
    }

    getHtml(): string {
        return `
            <div class="w-full h-full flex items-center justify-center relative bg-bg-primary">
                <div class="w-full max-w-[400px] p-8 border-2 border-accent rounded-xl shadow-glow bg-black relative">
                    <div class="text-center mb-8">
                        <h1 class="text-3xl text-white tracking-[4px] uppercase font-vcr">
                            REGISTER
                        </h1>
                    </div>
                    <form id="register-form" class="flex flex-col gap-4">
                        <input
                            type="text"
                            id="register-username"
                            placeholder="Username"
                            required
                            class="w-full p-4 bg-transparent border border-panel-border rounded text-white font-vcr focus:border-accent focus:shadow-glow transition-all placeholder:text-text-muted"
                        />
                        <input
                            type="email"
                            id="register-email"
                            placeholder="Email"
                            required
                            class="w-full p-4 bg-transparent border border-panel-border rounded text-white font-vcr focus:border-accent focus:shadow-glow transition-all placeholder:text-text-muted"
                        />
                        <input
                            type="password"
                            id="register-password"
                            placeholder="Password"
                            required
                            class="w-full p-4 bg-transparent border border-panel-border rounded text-white font-vcr focus:border-accent focus:shadow-glow transition-all placeholder:text-text-muted"
                        />

                        <div id="error-msg" class="text-primary text-xs text-center hidden font-vcr uppercase"></div>

                        <button
                            type="submit"
                            class="mt-4 w-full py-4 bg-accent-dim hover:bg-accent border border-accent rounded text-white hover:text-black font-bold font-vcr uppercase tracking-widest transition-all shadow-glow hover:shadow-glow-strong"
                        >
                            CREATE ACCOUNT
                        </button>
                    </form>
                    <div class="mt-6 text-center">
                        <a
                            href="#"
                            id="back-to-login"
                            class="text-text-muted hover:text-white text-xs font-vcr uppercase tracking-wider"
                        >Back to Login</a>
                    </div>
                </div>
            </div>
        `;
    }

    onMounted(): void {
        const form = this.$('#register-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = (this.$('#register-username') as HTMLInputElement).value;
            const email = (this.$('#register-email') as HTMLInputElement).value;
            const password = (this.$('#register-password') as HTMLInputElement).value;
            const errorDiv = this.$('#error-msg')!;

            try {
                await AuthService.getInstance().register(username, email, password);
                // On success, maybe auto-login or redirect to login? 
                // Let's rely on AuthService to handle or just redirect to login manually for now if it doesn't auto-login.
            } catch (err: any) {
                errorDiv.textContent = err.message || "Registration Failed";
                errorDiv.classList.remove('hidden');
            }
        });

        this.$('#back-to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            App.getInstance().router.navigateTo('/login');
        });
    }
}
