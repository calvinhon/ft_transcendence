import { AbstractComponent } from "./AbstractComponent";

export class PasswordConfirmationModal extends AbstractComponent {
    private onConfirm: (password: string) => void;
    private onCancel: () => void;
    private error: string | null = null;

    constructor(onConfirm: (password: string) => void, onCancel: () => void) {
        super();
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
    }

    getHtml(): string {
        return `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="modal-overlay">
                <div class="bg-black border-2 border-red-500 p-8 w-full max-w-md shadow-[0_0_30px_rgba(239,68,68,0.4)] relative">
                    <h2 class="text-2xl font-bold text-red-500 mb-6 tracking-widest text-center">SECURITY CHECK</h2>
                    
                    <p class="text-gray-400 text-sm mb-6 text-center leading-relaxed">
                        Identity verification required to modify system parameters.
                        <br>Please enter your access key.
                    </p>

                    ${this.error ? `<div class="bg-red-900/20 text-red-400 p-3 mb-4 text-center text-xs border border-red-500/50">${this.error}</div>` : ''}

                    <form id="password-form" class="space-y-6">
                        <div>
                            <input type="password" id="confirm-password-input" 
                                class="w-full bg-black border border-white/20 p-3 text-white text-center focus:border-red-500 outline-none transition-all font-mono"
                                placeholder="ENTER PASSWORD" required autofocus>
                        </div>

                        <div class="flex gap-4">
                            <button type="button" id="modal-cancel-btn" class="flex-1 py-3 text-gray-500 border border-transparent hover:text-white transition-colors">
                                ABORT
                            </button>
                            <button type="submit" class="flex-1 py-3 bg-red-600 text-black font-bold hover:bg-red-500 transition-colors tracking-widest">
                                VERIFY
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    render(): void {
        const overlay = document.createElement('div');
        overlay.innerHTML = this.getHtml();
        const app = document.getElementById('app');
        if (app) {
            app.appendChild(overlay.firstElementChild!);
        } else {
            document.body.appendChild(overlay.firstElementChild!);
        }
        this.bindEvents();
    }

    private bindEvents(): void {
        const overlay = document.getElementById('modal-overlay');
        const form = document.getElementById('password-form');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        const input = document.getElementById('confirm-password-input') as HTMLInputElement;

        if (input) input.focus();

        cancelBtn?.addEventListener('click', () => {
            this.close();
            this.onCancel();
        });

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = input.value;
            if (!password) {
                this.error = "PASSWORD REQUIRED";
                this.updateHtml();
                return;
            }
            this.close(); // Close immediately, let caller handle success/fail UI
            this.onConfirm(password);
        });

        // Close on background click
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
                this.onCancel();
            }
        });
    }

    private updateHtml(): void {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.outerHTML = this.getHtml();
            this.bindEvents();
        }
    }

    private close(): void {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
}
