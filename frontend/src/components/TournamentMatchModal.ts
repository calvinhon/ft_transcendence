import { AbstractComponent } from "./AbstractComponent";
import { App } from "../core/App";

export class TournamentMatchModal extends AbstractComponent {
    private player1: { id: number, name: string };
    private player2: { id: number, name: string };
    private onConfirm: (choice: 'keep' | 'swap') => void;
    private onCancel: () => void;

    constructor(
        player1: { id: number, name: string },
        player2: { id: number, name: string },
        onConfirm: (choice: 'keep' | 'swap') => void,
        onCancel: () => void
    ) {
        super();
        this.player1 = player1;
        this.player2 = player2;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
    }

    getHtml(): string {
        const currentUser = App.getInstance().currentUser;
        if (!currentUser) return '';

        const isCurrentPlayer1 = currentUser.userId === this.player1.id;
        const currentUserName = isCurrentPlayer1 ? this.player1.name : this.player2.name;
        const opponentName = isCurrentPlayer1 ? this.player2.name : this.player1.name;

        return `
            <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000]">
                <div class="w-[600px] max-w-[90%] bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-[20px] p-10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-center text-white relative">
                    <div class="mb-8">
                        <h2 class="text-3xl font-bold mb-2">⚔️ Choose Your Side</h2>
                        <p class="text-lg opacity-90">Select which side you want to play on</p>
                    </div>

                    <div class="flex gap-5 mb-8 justify-center">
                        <button id="side-left-btn" class="flex-1 max-w-[250px] p-8 bg-white/15 border-[3px] border-white/30 rounded-[15px] text-white cursor-pointer transition-all hover:bg-white/25 hover:border-white/60 hover:scale-105 group relative">
                            <div class="text-5xl mb-2">⬅️</div>
                            <div class="font-bold mb-2">LEFT SIDE</div>
                            <div class="text-sm opacity-80 mb-2">Controls: W/S or ↑/↓</div>
                            <div class="text-lg font-bold text-[#ffd700]">
                                ${isCurrentPlayer1 ? currentUserName : opponentName}
                            </div>
                        </button>

                        <button id="side-right-btn" class="flex-1 max-w-[250px] p-8 bg-white/15 border-[3px] border-white/30 rounded-[15px] text-white cursor-pointer transition-all hover:bg-white/25 hover:border-white/60 hover:scale-105 group relative">
                            <div class="text-5xl mb-2">➡️</div>
                            <div class="font-bold mb-2">RIGHT SIDE</div>
                            <div class="text-sm opacity-80 mb-2">Controls: U/J</div>
                            <div class="text-lg font-bold text-[#ffd700]">
                                ${isCurrentPlayer1 ? opponentName : currentUserName}
                            </div>
                        </button>
                    </div>

                    <button id="cancel-side-btn" class="px-8 py-3 bg-white/10 border-2 border-white/30 rounded-lg text-white hover:bg-white/20 hover:border-white/50 transition-all">
                        Cancel
                    </button>
                </div>
            </div>
        `;
    }

    onMounted(): void {
        const currentUser = App.getInstance().currentUser;
        if (!currentUser) return;

        const isCurrentPlayer1 = currentUser.userId === this.player1.id;

        this.$('#side-left-btn')?.addEventListener('click', () => {
            this.destroy();
            // If I am P1 and choose Left -> Keep
            // If I am P2 and choose Left -> Swap (so I become P1/Left)
            this.onConfirm(isCurrentPlayer1 ? 'keep' : 'swap');
        });

        this.$('#side-right-btn')?.addEventListener('click', () => {
            this.destroy();
            // If I am P1 and choose Right -> Swap (so I become P2/Right)
            // If I am P2 and choose Right -> Keep
            this.onConfirm(isCurrentPlayer1 ? 'swap' : 'keep');
        });

        this.$('#cancel-side-btn')?.addEventListener('click', () => {
            this.destroy();
            this.onCancel();
        });

        // Key handler for ESC
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.destroy();
                this.onCancel();
                window.removeEventListener('keydown', handleEscape);
            }
        };
        window.addEventListener('keydown', handleEscape);
    }

    public destroy(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = undefined;
    }

    public render(): void {
        const container = document.createElement('div');
        this.container = container;
        container.innerHTML = this.getHtml();
        document.body.appendChild(container);
        this.onMounted();
    }
}
