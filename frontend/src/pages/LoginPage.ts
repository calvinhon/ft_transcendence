import { AbstractComponent } from "../components/AbstractComponent";
import { AuthService } from "../services/AuthService";

export class LoginPage extends AbstractComponent {
    constructor() {
        super();
        this.setTitle('Login');
    }

    getHtml(): string {
        return `
            <div class="flex bg-black items-center justify-center relative">
                <div class="w-full max-w-[600px] p-8 border-2 border-accent rounded-xl shadow-glow bg-black relative pointer-events-auto">
                    <div class="text-center mb-8">
                        <h1 class="text-3xl text-white tracking-[4px] uppercase font-vcr">
                            LOGIN
                        </h1>
                    </div>

                    <form id="login-form" class="flex flex-col gap-4">
                        <input
                            type="text"
                            id="username"
                            placeholder="Username"
                            required
                            class="w-full p-4 bg-transparent border border-panel-border rounded text-white font-vcr focus:border-accent focus:shadow-glow transition-all placeholder:text-text-muted"
                        />
                        <input
                            type="password"
                            id="password"
                            placeholder="Password"
                            required
                            class="w-full p-4 bg-transparent border border-panel-border rounded text-white font-vcr focus:border-accent focus:shadow-glow transition-all placeholder:text-text-muted"
                        />

                         <div id="error-msg" class="text-primary text-xs text-center hidden font-vcr uppercase"></div>

                        <button
                            type="submit"
                            class="mt-4 w-full py-4 bg-accent-dim hover:bg-accent border border-accent rounded text-white hover:text-black font-bold font-vcr uppercase tracking-widest transition-all shadow-glow hover:shadow-glow-strong"
                        >
                            LOGIN
                        </button>
                    </form>

                    <div class="flex flex-col items-center gap-3 mt-8 pt-4 border-t border-panel-border">
                        <div class="flex gap-4 mb-2 w-full justify-center">
                            <button id="login-42" class="w-12 h-12 flex items-center justify-center rounded-full border border-panel-border hover:border-accent hover:shadow-glow hover:bg-accent/10 transition-all group" title="Login with 42">
                                <span class="font-vcr font-bold text-white group-hover:text-accent">42</span>
                            </button>
                            <button id="login-google" class="w-12 h-12 flex items-center justify-center rounded-full border border-panel-border hover:border-accent hover:shadow-glow hover:bg-accent/10 transition-all group" title="Login with Google">
                                <i class="fab fa-google text-white group-hover:text-accent text-lg"></i>
                            </button>
                            <button id="login-github" class="w-12 h-12 flex items-center justify-center rounded-full border border-panel-border hover:border-accent hover:shadow-glow hover:bg-accent/10 transition-all group" title="Login with GitHub">
                                <i class="fab fa-github text-white group-hover:text-accent text-lg"></i>
                            </button>
                        </div>
                        <span class="text-text-muted text-[10px] uppercase">NEW USER?</span>
                        <a href="#" id="go-to-register" class="text-accent text-xs font-vcr uppercase tracking-widest hover:text-white transition-colors">
                            Create an Account
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    onMounted(): void {
        const form = this.$('#login-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = (this.$('#username') as HTMLInputElement).value;
            const password = (this.$('#password') as HTMLInputElement).value;
            const errorDiv = this.$('#error-msg')!;

            try {
                const result = await AuthService.getInstance().login(username, password);
                if (!result.success) {
                    throw new Error(result.error || "Authentication Failed");
                }
                // Router navigation happens in AuthService on success
            } catch (err: any) {
                errorDiv.textContent = err.message || "Authentication Failed";
                errorDiv.classList.remove('hidden');
            }
        });

        this.$('#login-42')?.addEventListener('click', async () => {
            await AuthService.getInstance().loginWithSchool42();
        });

        this.$('#login-google')?.addEventListener('click', async () => {
            await AuthService.getInstance().loginWithGoogle();
        });

        this.$('#login-github')?.addEventListener('click', async () => {
            await AuthService.getInstance().loginWithGithub();
        });

        this.$('#go-to-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            // We need to access App to navigate
            const app = (window as any).app;
            if (app) app.router.navigateTo('/register');
        });
    }
}
