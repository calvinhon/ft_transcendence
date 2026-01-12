import { AbstractComponent } from "./AbstractComponent";
import { AuthService } from "../services/AuthService";

export class LoginModal extends AbstractComponent {
    private onLoginSuccess: (user: any) => void;
    private onCancel: () => void;
    private isRegisterMode: boolean = false;

    constructor(onLoginSuccess: (user: any) => void, onCancel: () => void) {
        super();
        this.onLoginSuccess = onLoginSuccess;
        this.onCancel = onCancel;
    }

    getHtml(): string {
        return `
            <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
                <div class="w-full max-w-[500px] border-2 border-accent shadow-[0_0_20px_rgba(0,255,255,0.2)] bg-black relative pointer-events-auto">
                    <button id="modal-close-btn" class="absolute -top-10 right-0 text-white hover:text-accent transition-colors">
                        <i class="fas fa-times text-2xl"></i>
                    </button>

                    <!-- Tabs -->
                    <div class="flex w-full border-b-2 border-accent">
                        <button id="tab-login" class="w-1/2 justify-center items-center flex py-4 ${!this.isRegisterMode ? 'bg-accent text-black font-bold cursor-default' : 'bg-transparent text-text-muted hover:text-white cursor-pointer'} font-vcr text-xl transition-colors">
                            LOGIN
                        </button>
                        <button id="tab-register" class="w-1/2 justify-center items-center flex py-4 ${this.isRegisterMode ? 'bg-accent text-black font-bold cursor-default' : 'bg-transparent text-text-muted hover:text-white cursor-pointer'} font-vcr text-xl transition-colors">
                            REGISTER
                        </button>
                    </div>

                    <div class="p-12 flex flex-col gap-8">
                        <!-- LOGIN FORM -->
                        <form id="modal-login-form" class="flex flex-col gap-6 ${this.isRegisterMode ? 'hidden' : ''}">
                            <input type="text" id="login-username" placeholder="Username" required
                                class="w-full p-4 bg-transparent border border-white/20 text-white font-vcr focus:border-accent focus:shadow-[0_0_10px_rgba(0,255,255,0.5)] outline-none transition-all placeholder:text-text-muted" />
                            <input type="password" id="login-password" placeholder="Password" required
                                class="w-full p-4 bg-transparent border border-white/20 text-white font-vcr focus:border-accent focus:shadow-[0_0_10px_rgba(0,255,255,0.5)] outline-none transition-all placeholder:text-text-muted" />
                            
                            <div id="login-error-msg" class="text-red-500 text-xs text-center min-h-[18px] opacity-0 transition-opacity duration-200 font-vcr uppercase"></div>

                            <button type="submit" class="w-full py-4 bg-accent hover:bg-accent-hover text-black font-bold font-vcr uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]">
                                LOGIN
                            </button>
                        </form>

                        <!-- REGISTER FORM -->
                        <form id="modal-register-form" class="flex flex-col gap-6 ${this.isRegisterMode ? '' : 'hidden'}">
                            <input type="text" id="reg-username" placeholder="Username" required
                                class="w-full p-4 bg-transparent border border-white/20 text-white font-vcr focus:border-accent focus:shadow-[0_0_10px_rgba(0,255,255,0.5)] outline-none transition-all placeholder:text-text-muted" />
                            <input type="email" id="reg-email" placeholder="Email" required
                                class="w-full p-4 bg-transparent border border-white/20 text-white font-vcr focus:border-accent focus:shadow-[0_0_10px_rgba(0,255,255,0.5)] outline-none transition-all placeholder:text-text-muted" />
                            <input type="password" id="reg-password" placeholder="Password" required minlength="6"
                                class="w-full p-4 bg-transparent border border-white/20 text-white font-vcr focus:border-accent focus:shadow-[0_0_10px_rgba(0,255,255,0.5)] outline-none transition-all placeholder:text-text-muted" />
                            
                            <div id="reg-error-msg" class="text-red-500 text-xs text-center min-h-[18px] opacity-0 transition-opacity duration-200 font-vcr uppercase"></div>

                            <button type="submit" class="w-full py-4 bg-accent hover:bg-accent-hover text-black font-bold font-vcr uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,255,255,0.4)] hover:shadow-[0_0_25px_rgba(0,255,255,0.6)]">
                                CREATE ACCOUNT
                            </button>
                        </form>
                        
                        <!-- GOOGLE LOGIN (Shared) -->
                        <div class="flex flex-col gap-6 items-center w-full ${this.isRegisterMode ? 'hidden' : ''}">
                             <div class="relative flex items-center w-full">
                                <span class="mx-auto text-white font-vcr uppercase">OR</span>
                            </div>
                            
                            <button class="oauth-btn w-full py-4 flex items-center justify-center gap-3 bg-transparent border border-accent hover:bg-accent/10 text-accent font-bold font-vcr uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(0,255,255,0.2)] hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] group" data-provider="Google">
                                <i class="fab fa-google text-lg"></i>
                                <span>Login with Google</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    onMounted(): void {
        // Tab Switching
        this.$('#tab-login')?.addEventListener('click', () => {
            if (this.isRegisterMode) {
                this.isRegisterMode = false;
                this.render();
            }
        });

        this.$('#tab-register')?.addEventListener('click', () => {
            if (!this.isRegisterMode) {
                this.isRegisterMode = true;
                this.render();
            }
        });

        // Close
        this.$('#modal-close-btn')?.addEventListener('click', () => {
            this.onCancel();
            this.destroy();
        });

        // LOGIN SUBMIT
        this.$('#modal-login-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = (this.$('#login-username') as HTMLInputElement).value;
            const password = (this.$('#login-password') as HTMLInputElement).value;
            await this.handleAuthAction(() => AuthService.getInstance().verifyCredentials(username, password), 'login-error-msg');
        });

        // REGISTER SUBMIT
        this.$('#modal-register-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = (this.$('#reg-username') as HTMLInputElement).value;
            const email = (this.$('#reg-email') as HTMLInputElement).value;
            const password = (this.$('#reg-password') as HTMLInputElement).value;
            await this.handleAuthAction(() => AuthService.getInstance().registerUserOnly(username, email, password), 'reg-error-msg');
        });

        // OAUTH BUTTONS
        this.container?.querySelectorAll('.oauth-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const provider = (e.currentTarget as HTMLElement).dataset.provider;
                if (provider) {
                    await this.handleAuthAction(() => AuthService.getInstance().authenticateViaOAuth(provider), 'login-error-msg');
                }
            });
        });
    }

    private async handleAuthAction(action: () => Promise<{ success: boolean, user?: any, error?: string }>, errorElementId: string) {
        const errorDiv = this.$(`#${errorElementId}`)!;
        const hideError = () => {
            errorDiv.textContent = '';
            errorDiv.classList.add('opacity-0');
            errorDiv.classList.remove('opacity-100');
        };

        const showError = (message: string) => {
            errorDiv.textContent = message;
            errorDiv.classList.remove('opacity-0');
            errorDiv.classList.add('opacity-100');
        };

        hideError();

        try {
            const result = await action();
            // Wait for 100ms to allow popup to close if it was oauth
            if (result.success && result.user) {
                this.onLoginSuccess(result.user);
                this.destroy();
            } else {
                throw new Error(result.error || "Authentication failed");
            }
        } catch (err: any) {
            showError(err.message || "Error occurred");
        }
    }

    public destroy(): void {
        const modalContainer = document.getElementById('modal-container');
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = undefined;

        // Disable pointer events if no more modals
        if (modalContainer && modalContainer.children.length === 0) {
            modalContainer.classList.add('pointer-events-none');
        }
    }

    public render(_containerId: string = ''): void {
        if (this.container) {
            this.container.innerHTML = this.getHtml();
            this.onMounted();
        } else {
            const container = document.createElement('div');
            container.className = 'pointer-events-auto';
            this.container = container;
            container.innerHTML = this.getHtml();

            const modalContainer = document.getElementById('modal-container');
            if (modalContainer) {
                modalContainer.appendChild(container);
                modalContainer.classList.remove('pointer-events-none');
            } else {
                document.body.appendChild(container);
            }
            this.onMounted();
        }
    }
}
