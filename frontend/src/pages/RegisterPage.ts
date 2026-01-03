import { AbstractComponent } from "../components/AbstractComponent";
import { AuthService } from "../services/AuthService";


export class RegisterPage extends AbstractComponent {
    constructor() {
        super();
        this.setTitle('Register');
    }

    getHtml(): string {
        return `
            <div class="flex bg-black items-center justify-center relative w-full h-full">
                <div class="w-full max-w-[600px] border-2 border-accent shadow-[0_0_20px_rgba(0,255,255,0.2)] bg-black relative pointer-events-auto">
                    <!-- Tabs -->
                    <div class="flex w-full border-b-2 border-accent">
                        <button id="tab-login" class="w-1/2 justify-center items-center flex py-4 bg-transparent hover:bg-white/5 text-text-muted hover:text-white font-vcr font-bold text-xl transition-colors cursor-pointer">
                            LOGIN
                        </button>
                        <div class="w-1/2 justify-center items-center flex py-4 bg-accent text-black font-vcr font-bold text-xl cursor-default">
                            REGISTER
                        </div>
                    </div>

                    <div class="p-12 flex flex-col gap-8">
                        <form id="register-form" class="flex flex-col gap-6">
                            <input
                                type="text"
                                id="register-username"
                                placeholder="Username"
                                required
                                maxlength="16"
                                class="w-full p-4 bg-transparent border border-white/20 text-white font-vcr focus:border-accent focus:shadow-[0_0_10px_rgba(0,255,255,0.5)] outline-none transition-all placeholder:text-text-muted"
                            />
                            <input
                                type="email"
                                id="register-email"
                                placeholder="Email"
                                required
                                class="w-full p-4 bg-transparent border border-white/20 text-white font-vcr focus:border-accent focus:shadow-[0_0_10px_rgba(0,255,255,0.5)] outline-none transition-all placeholder:text-text-muted"
                            />
                            <input
                                type="password"
                                id="register-password"
                                placeholder="Password"
                                required
                                class="w-full p-4 bg-transparent border border-white/20 text-white font-vcr focus:border-accent focus:shadow-[0_0_10px_rgba(0,255,255,0.5)] outline-none transition-all placeholder:text-text-muted"
                            />
    
                            <div id="error-msg" class="text-red-500 text-xs text-center hidden font-vcr uppercase"></div>
    
                            <button
                                type="submit"
                                class="w-full py-4 bg-accent hover:bg-accent-hover text-black font-bold font-vcr uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]"
                            >
                                CREATE ACCOUNT
                            </button>
                        </form>
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

        this.$('#tab-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            const app = (window as any).app;
            if (app) app.router.navigateTo('/login');
        });
    }
}
