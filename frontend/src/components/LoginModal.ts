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
                <div class="w-full max-w-[420px] p-8 border-2 border-accent rounded-xl shadow-[0_0_30px_rgba(41,182,246,0.2)] bg-black relative">
                    <button id="modal-close-btn" class="absolute top-4 right-4 text-gray-500 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                    
                    <div class="text-center mb-6">
                        <h1 class="text-3xl text-white tracking-[4px] uppercase font-vcr" id="modal-title">
                            ADD PLAYER
                        </h1>
                        <p class="text-xs text-gray-400 mt-2 font-vcr" id="modal-subtitle">Login to join the session</p>
                    </div>

                    <!-- LOGIN FORM -->
                    <form id="modal-login-form" class="flex flex-col gap-4 ${this.isRegisterMode ? 'hidden' : ''}">
                        <input type="text" id="login-username" placeholder="Username" required
                            class="w-full p-4 bg-transparent border border-panel-border rounded text-white font-vcr focus:border-accent focus:shadow-glow transition-all placeholder:text-text-muted outline-none" />
                        <input type="password" id="login-password" placeholder="Password" required
                            class="w-full p-4 bg-transparent border border-panel-border rounded text-white font-vcr focus:border-accent focus:shadow-glow transition-all placeholder:text-text-muted outline-none" />
                        
                        <button type="submit" class="mt-2 w-full py-4 bg-accent-dim hover:bg-accent border border-accent rounded text-white hover:text-black font-bold font-vcr uppercase tracking-widest transition-all shadow-glow hover:shadow-glow-strong">
                            LOGIN
                        </button>
                    </form>

                    <!-- REGISTER FORM -->
                    <form id="modal-register-form" class="flex flex-col gap-4 ${this.isRegisterMode ? '' : 'hidden'}">
                        <input type="text" id="reg-username" placeholder="Username" required
                            class="w-full p-4 bg-transparent border border-panel-border rounded text-white font-vcr focus:border-accent focus:shadow-glow transition-all placeholder:text-text-muted outline-none" />
                        <input type="email" id="reg-email" placeholder="Email" required
                            class="w-full p-4 bg-transparent border border-panel-border rounded text-white font-vcr focus:border-accent focus:shadow-glow transition-all placeholder:text-text-muted outline-none" />
                        <input type="password" id="reg-password" placeholder="Password (min 6 chars)" required minlength="6"
                            class="w-full p-4 bg-transparent border border-panel-border rounded text-white font-vcr focus:border-accent focus:shadow-glow transition-all placeholder:text-text-muted outline-none" />
                        
                        <button type="submit" class="mt-2 w-full py-4 bg-accent-dim hover:bg-accent border border-accent rounded text-white hover:text-black font-bold font-vcr uppercase tracking-widest transition-all shadow-glow hover:shadow-glow-strong">
                            CREATE ACCOUNT
                        </button>
                    </form>
                    
                    <!-- OAUTH SECTION -->
                    <div class="my-6 flex items-center gap-4">
                        <div class="h-[1px] bg-gray-800 flex-1"></div>
                        <span class="text-[10px] text-gray-500 font-vcr">OR CONNECT WITH</span>
                        <div class="h-[1px] bg-gray-800 flex-1"></div>
                    </div>

                    <div class="flex justify-center gap-4">
                        <button class="oauth-btn w-12 h-12 rounded border border-gray-700 hover:border-white hover:bg-gray-800 transition-all flex items-center justify-center" data-provider="42">
                            <img src="/assets/42_logo.svg" alt="42" class="w-6 h-6 invert" onerror="this.style.display='none';this.parentElement.innerHTML='42'">
                        </button>
                        <button class="oauth-btn w-12 h-12 rounded border border-gray-700 hover:border-white hover:bg-gray-800 transition-all flex items-center justify-center" data-provider="google">
                            <i class="fab fa-google text-white text-xl"></i>
                        </button>
                        <button class="oauth-btn w-12 h-12 rounded border border-gray-700 hover:border-white hover:bg-gray-800 transition-all flex items-center justify-center" data-provider="github">
                            <i class="fab fa-github text-white text-xl"></i>
                        </button>
                    </div>

                    <div id="modal-error-msg" class="mt-4 text-red-500 text-xs text-center hidden font-vcr uppercase"></div>
                    
                    <div class="mt-6 text-center pt-4 border-t border-gray-800">
                        <p class="text-[10px] text-gray-500 font-vcr uppercase cursor-pointer hover:text-white transition-colors" id="toggle-mode-btn">
                            ${this.isRegisterMode ? 'Already have an account? Login' : 'New Player? Create Account'}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    onMounted(): void {
        // Toggle Logic
        this.$('#toggle-mode-btn')?.addEventListener('click', () => {
            this.isRegisterMode = !this.isRegisterMode;
            this.render(); // Re-render to swap forms
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
            await this.handleAuthAction(() => AuthService.getInstance().verifyCredentials(username, password));
        });

        // REGISTER SUBMIT
        this.$('#modal-register-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = (this.$('#reg-username') as HTMLInputElement).value;
            const email = (this.$('#reg-email') as HTMLInputElement).value;
            const password = (this.$('#reg-password') as HTMLInputElement).value;
            await this.handleAuthAction(() => AuthService.getInstance().registerUserOnly(username, email, password));
        });

        // OAUTH BUTTONS
        this.container?.querySelectorAll('.oauth-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const provider = (e.currentTarget as HTMLElement).dataset.provider;
                if (provider) {
                    await this.handleAuthAction(() => AuthService.getInstance().authenticateViaOAuth(provider));
                }
            });
        });
    }

    private async handleAuthAction(action: () => Promise<{ success: boolean, user?: any, error?: string }>) {
        const errorDiv = this.$('#modal-error-msg')!;
        errorDiv.classList.add('hidden');
        errorDiv.innerText = '';

        // Show loading state if desired (e.g. disable buttons)

        try {
            const result = await action();
            if (result.success && result.user) {
                this.onLoginSuccess(result.user);
                this.destroy(); // Success!
            } else {
                throw new Error(result.error || "Authentication failed");
            }
        } catch (err: any) {
            errorDiv.textContent = err.message || "Error occurred";
            errorDiv.classList.remove('hidden');
        }
    }

    public destroy(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = undefined;
    }

    public render(_containerId: string = ''): void {
        // If already mounted, just update innerHTML to preserve container
        // But re-binding events is easier with full replace or careful DOM updates.
        // Simple approach: remove old, create new.
        if (this.container) {
            this.container.innerHTML = this.getHtml(); // Update content (replaces children)
            this.onMounted(); // Re-bind events
        } else {
            // First mount
            const container = document.createElement('div');
            this.container = container;
            container.innerHTML = this.getHtml();
            document.body.appendChild(container);
            this.onMounted();
        }
    }
}
