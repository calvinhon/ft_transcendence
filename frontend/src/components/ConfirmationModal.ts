import { AbstractComponent } from "./AbstractComponent";

export type ConfirmVariant = 'destructive' | 'warning' | 'neutral';

export class ConfirmationModal extends AbstractComponent {
    private message: string;
    private onConfirm: () => void;
    private onCancel: () => void;
    private variant: ConfirmVariant;

    constructor(message: string, onConfirm: () => void, onCancel: () => void = () => { }, variant: ConfirmVariant = 'warning') {
        super();
        this.message = message;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        this.variant = variant;
    }

    private getColors() {
        switch (this.variant) {
            case 'destructive':
                return {
                    border: 'border-red-600',
                    bg: 'bg-red-900/10',
                    text: 'text-red-500',
                    textLight: 'text-red-100',
                    shadow: 'shadow-[0_0_50px_rgba(220,38,38,0.3)]',
                    headerBg: 'bg-red-600/20',
                    headerBorder: 'border-red-600',
                    confirmBg: 'bg-red-600',
                    confirmHover: 'hover:bg-white',
                    icon: 'fa-exclamation-triangle',
                    title: 'CONFIRM ACTION'
                };
            case 'neutral':
                return {
                    border: 'border-accent',
                    bg: 'bg-accent/10',
                    text: 'text-accent',
                    textLight: 'text-white',
                    shadow: 'shadow-[0_0_50px_rgba(41,182,246,0.3)]',
                    headerBg: 'bg-accent/20',
                    headerBorder: 'border-accent',
                    confirmBg: 'bg-accent',
                    confirmHover: 'hover:bg-white',
                    icon: 'fa-question-circle',
                    title: 'CONFIRM'
                };
            default: // warning
                return {
                    border: 'border-amber-500',
                    bg: 'bg-amber-900/10',
                    text: 'text-amber-500',
                    textLight: 'text-amber-100',
                    shadow: 'shadow-[0_0_50px_rgba(245,158,11,0.3)]',
                    headerBg: 'bg-amber-600/20',
                    headerBorder: 'border-amber-500',
                    confirmBg: 'bg-amber-600',
                    confirmHover: 'hover:bg-white',
                    icon: 'fa-question-circle',
                    title: 'CONFIRMATION'
                };
        }
    }

    getHtml(): string {
        const c = this.getColors();
        return `
            <div class="fixed inset-0 bg-black/90 flex items-center justify-center ${this.getZIndex()}">
                <div class="w-full max-w-[800px] border-2 ${c.border} bg-black relative ${c.shadow}">
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
                            SYS.REQ.0x${Math.floor(Math.random() * 9999).toString(16).toUpperCase()}
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="p-8 text-center relative">
                        <div class="${c.textLight} font-vcr text-lg leading-relaxed uppercase tracking-wider relative z-20">
                            ${this.message}
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="p-4 border-t ${c.headerBorder} ${c.bg} flex justify-center gap-4">
                        <button id="confirm-yes-btn" class="px-8 py-3 ${c.confirmBg} ${c.confirmHover} text-black font-bold font-vcr uppercase tracking-widest transition-all">
                            CONFIRM
                        </button>
                        <button id="confirm-no-btn" class="px-8 py-3 bg-transparent border ${c.border} ${c.text} hover:bg-white/10 font-bold font-vcr uppercase tracking-widest transition-all">
                            CANCEL
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    onMounted(): void {
        this.$('#confirm-yes-btn')?.addEventListener('click', () => {
            this.destroy();
            this.onConfirm();
        });

        this.$('#confirm-no-btn')?.addEventListener('click', () => {
            this.destroy();
            this.onCancel();
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

    public render(target?: HTMLElement): void {
        console.log('[ConfirmationModal] render() called');
        const container = document.createElement('div');
        this.container = container;
        container.innerHTML = this.getHtml();

        if (target) {
            console.log('[ConfirmationModal] Appending to provided target');
            target.appendChild(container);
            // If target is modal-container, we might need to ensure pointer events are on
            if (target.id === 'modal-container') {
                target.classList.remove('pointer-events-none');
            }
        } else {
            const modalContainer = document.getElementById('modal-container');
            // Check if we are in 3D GAME mode (not just 3D scene) - if so, we MUST append to body to be visible
            // data-3d-game is set by GamePage when using ThreeDGameRenderer
            const is3DGameMode = document.body.hasAttribute('data-3d-game');
            console.log('[ConfirmationModal] is3DGameMode:', is3DGameMode);

            if (modalContainer && !is3DGameMode) {
                console.log('[ConfirmationModal] Appending to modal-container');
                modalContainer.appendChild(container);
                modalContainer.classList.remove('pointer-events-none');
            } else {
                console.log('[ConfirmationModal] Appending to document.body');
                document.body.appendChild(container);
            }
        }
        this.onMounted();
    }

    private getZIndex(): string {
        return document.body.hasAttribute('data-3d-game') ? 'z-[10000]' : 'z-[11]';
    }
}
