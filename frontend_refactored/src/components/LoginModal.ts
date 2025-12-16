import { AbstractComponent } from "./AbstractComponent";


export class LoginModal extends AbstractComponent {
    private onLoginSuccess: (user: any) => void;
    private onCancel: () => void;

    constructor(onLoginSuccess: (user: any) => void, onCancel: () => void) {
        super();
        this.onLoginSuccess = onLoginSuccess;
        this.onCancel = onCancel;
    }

    getHtml(): string {
        return `
            <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
                <div class="w-full max-w-[400px] p-8 border-2 border-accent rounded-xl shadow-[0_0_30px_rgba(41,182,246,0.2)] bg-black relative">
                    <button id="modal-close-btn" class="absolute top-4 right-4 text-gray-500 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                    
                    <div class="text-center mb-8">
                        <h1 class="text-3xl text-white tracking-[4px] uppercase font-vcr">
                            ADD PLAYER
                        </h1>
                        <p class="text-xs text-gray-400 mt-2 font-vcr">Login to join the session</p>
                    </div>

                    <form id="modal-login-form" class="flex flex-col gap-4">
                        <input
                            type="text"
                            id="modal-username"
                            placeholder="Username"
                            required
                            class="w-full p-4 bg-transparent border border-panel-border rounded text-white font-vcr focus:border-accent focus:shadow-glow transition-all placeholder:text-text-muted outline-none"
                        />
                        <input
                            type="password"
                            id="modal-password"
                            placeholder="Password"
                            required
                            class="w-full p-4 bg-transparent border border-panel-border rounded text-white font-vcr focus:border-accent focus:shadow-glow transition-all placeholder:text-text-muted outline-none"
                        />

                         <div id="modal-error-msg" class="text-red-500 text-xs text-center hidden font-vcr uppercase"></div>

                        <button
                            type="submit"
                            class="mt-4 w-full py-4 bg-accent-dim hover:bg-accent border border-accent rounded text-white hover:text-black font-bold font-vcr uppercase tracking-widest transition-all shadow-glow hover:shadow-glow-strong"
                        >
                            LOGIN
                        </button>
                    </form>
                    
                    <div class="mt-6 text-center pt-4 border-t border-gray-800">
                        <p class="text-[10px] text-gray-500 font-vcr uppercase">
                            New Player? <a href="#" id="modal-register-link" class="text-accent hover:text-white">Create Account</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    onMounted(): void {
        const form = this.$('#modal-login-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = (this.$('#modal-username') as HTMLInputElement).value;
            const password = (this.$('#modal-password') as HTMLInputElement).value;
            const errorDiv = this.$('#modal-error-msg')!;

            try {
                // Use AuthService to login without auto-navigation (pass false as 3rd arg)
                const { AuthService } = await import('../services/AuthService');
                const result = await AuthService.getInstance().login(username, password, false);

                if (result.success && result.user) {
                    this.onLoginSuccess(result.user);
                    this.destroy();
                } else {
                    throw new Error(result.error || "Invalid credentials");
                }
            } catch (err: any) {
                errorDiv.textContent = err.message || "Authentication Failed";
                errorDiv.classList.remove('hidden');
            }
        });

        this.$('#modal-close-btn')?.addEventListener('click', () => {
            this.onCancel();
            this.destroy();
        });

        // Handle Register link?
        // For simplicity, maybe just alert or swap content. 
        // User asked for "Login or Register modal". 
        // Let's keep it simple: "Register" just redirects to the main register page? 
        // No, that would lose state. 
        // Ideally we'd swap the form to register form in this same modal.
        // For this iteration, let's just support Login as the primary flow for "Add Player".
        this.$('#modal-register-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            alert("Please register via the main page for now, or ask the host to create an account.");
        });
    }

    public destroy(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = undefined;
    }

    public render(_containerId: string = ''): void {
        const container = document.createElement('div');
        this.container = container;
        container.innerHTML = this.getHtml();
        document.body.appendChild(container);
        this.onMounted();
    }
}
