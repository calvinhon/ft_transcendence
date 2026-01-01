import { AbstractComponent } from "./AbstractComponent";

export type ModalVariant = 'error' | 'warning' | 'success';

export class ErrorModal extends AbstractComponent {
    private message: string;
    private onDismiss: () => void;
    private variant: ModalVariant;

    constructor(message: string, onDismiss: () => void = () => { }, variant: ModalVariant = 'error') {
        super();
        this.message = message;
        this.onDismiss = onDismiss;
        this.variant = variant;
    }

    private getColors() {
        switch (this.variant) {
            case 'success':
                return {
                    border: 'border-green-500',
                    bg: 'bg-green-900/10',
                    text: 'text-green-500',
                    textLight: 'text-green-100',
                    shadow: 'shadow-[0_0_50px_rgba(34,197,94,0.3)]',
                    headerBg: 'bg-green-600/20',
                    headerBorder: 'border-green-500',
                    btnBg: 'bg-green-600/20',
                    btnHover: 'hover:bg-green-600',
                    btnBorder: 'border-green-600',
                    icon: 'fa-check-circle',
                    title: 'SUCCESS'
                };
            case 'warning':
                return {
                    border: 'border-amber-500',
                    bg: 'bg-amber-900/10',
                    text: 'text-amber-500',
                    textLight: 'text-amber-100',
                    shadow: 'shadow-[0_0_50px_rgba(245,158,11,0.3)]',
                    headerBg: 'bg-amber-600/20',
                    headerBorder: 'border-amber-500',
                    btnBg: 'bg-amber-600/20',
                    btnHover: 'hover:bg-amber-600',
                    btnBorder: 'border-amber-600',
                    icon: 'fa-exclamation-circle',
                    title: 'WARNING'
                };
            default: // error
                return {
                    border: 'border-red-600',
                    bg: 'bg-red-900/10',
                    text: 'text-red-500',
                    textLight: 'text-red-100',
                    shadow: 'shadow-[0_0_50px_rgba(220,38,38,0.3)]',
                    headerBg: 'bg-red-600/20',
                    headerBorder: 'border-red-600',
                    btnBg: 'bg-red-600/20',
                    btnHover: 'hover:bg-red-600',
                    btnBorder: 'border-red-600',
                    icon: 'fa-exclamation-triangle',
                    title: 'ERROR'
                };
        }
    }

    getHtml(): string {
        const c = this.getColors();
        return `
            <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-[11]">
                <div class="w-full max-w-[500px] border-2 ${c.border} bg-black relative ${c.shadow}">
                    <!-- Scanline effect overlay -->
                    <div class="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_4px,3px_100%]"></div>
                    
                    <!-- Header -->
                    <div class="${c.headerBg} border-b ${c.headerBorder} p-4 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i class="fas ${c.icon} ${c.text} text-2xl animate-pulse"></i>
                            <h1 class="text-2xl ${c.text} font-bold font-vcr tracking-[0.2em] uppercase">
                                ${c.title}
                            </h1>
                        </div>
                        <div class="${c.text} opacity-50 font-vcr text-xs">
                            SYS.${this.variant.toUpperCase().slice(0, 3)}.0x${Math.floor(Math.random() * 9999).toString(16).toUpperCase()}
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="p-8 text-center relative">
                        <div class="${c.textLight} font-vcr text-lg leading-relaxed uppercase tracking-wider relative z-20">
                            ${this.message}
                        </div>
                        <!-- Decorative graphical elements -->
                        <div class="absolute top-2 left-2 w-4 h-4 border-t border-l ${c.border} opacity-50"></div>
                        <div class="absolute top-2 right-2 w-4 h-4 border-t border-r ${c.border} opacity-50"></div>
                        <div class="absolute bottom-2 left-2 w-4 h-4 border-b border-l ${c.border} opacity-50"></div>
                        <div class="absolute bottom-2 right-2 w-4 h-4 border-b border-r ${c.border} opacity-50"></div>
                    </div>

                    <!-- Footer -->
                    <div class="p-4 border-t ${c.headerBorder} ${c.bg} flex justify-center">
                        <button id="error-dismiss-btn" class="px-12 py-3 ${c.btnBg} ${c.btnHover} ${c.text} hover:text-black border ${c.btnBorder} font-bold font-vcr uppercase tracking-widest transition-all relative group overflow-hidden">
                            <span class="relative z-10">ACKNOWLEDGE</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    onMounted(): void {
        this.$('#error-dismiss-btn')?.addEventListener('click', () => {
            this.destroy();
            this.onDismiss();
        });
    }

    public destroy(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = undefined;

        // Restore pointer-events-none on modal container if it's empty
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer && modalContainer.children.length === 0) {
            modalContainer.classList.add('pointer-events-none');
        }
    }

    public render(): void {
        const container = document.createElement('div');
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

// Convenience factory functions
export function showError(message: string, onDismiss?: () => void): void {
    new ErrorModal(message, onDismiss, 'error').render();
}

export function showWarning(message: string, onDismiss?: () => void): void {
    new ErrorModal(message, onDismiss, 'warning').render();
}

export function showSuccess(message: string, onDismiss?: () => void): void {
    new ErrorModal(message, onDismiss, 'success').render();
}
