import { App } from "../core/App";

/**
 * Tournament Match Modal
 * Shows side selection for the LOGGED-IN USER only.
 * Returns a Promise that resolves with 'keep', 'swap', or null if cancelled.
 */
export class TournamentMatchModal {
    private player1: { id: number, name: string };
    private player2: { id: number, name: string };
    private container: HTMLElement | null = null;
    private keyHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(
        player1: { id: number, name: string },
        player2: { id: number, name: string }
    ) {
        this.player1 = player1;
        this.player2 = player2;
    }

    /**
     * Shows the modal and returns a Promise with the user's choice.
     */
    public show(): Promise<'keep' | 'swap' | null> {
        return new Promise((resolve) => {
            const currentUser = App.getInstance().currentUser;
            if (!currentUser) {
                console.error('TournamentMatchModal: No user logged in');
                resolve(null);
                return;
            }

            const isCurrentPlayer1 = currentUser.userId === this.player1.id;
            const currentUserName = isCurrentPlayer1 ? this.player1.name : this.player2.name;
            const opponentName = isCurrentPlayer1 ? this.player2.name : this.player1.name;

            // Create modal container
            this.container = document.createElement('div');
            this.container.className = 'tournament-match-modal';
            this.container.innerHTML = `
                <div class="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999]" style="backdrop-filter: blur(5px);">
                    <div class="w-full max-w-[700px] p-8 border-2 border-accent bg-black relative shadow-[0_0_50px_rgba(41,182,246,0.3)]">
                        <div class="text-center mb-6">
                            <h2 class="text-3xl font-vcr text-white tracking-widest mb-3">⚔️ CHOOSE YOUR SIDE</h2>
                            <p class="text-lg font-vcr text-accent">${currentUserName}, pick your side!</p>
                            <p class="text-sm text-gray-400 mt-2">Your opponent <span class="text-white">${opponentName}</span> will get the other side</p>
                        </div>

                        <div class="flex gap-6 mb-6 justify-center">
                            <button id="modal-side-left" class="flex-1 max-w-[280px] p-8 border-2 border-white/30 hover:border-accent hover:bg-accent/10 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group">
                                <div class="text-6xl group-hover:scale-125 transition-transform">⬅️</div>
                                <div class="text-center">
                                    <div class="font-vcr text-2xl text-accent mb-2">LEFT SIDE</div>
                                    <div class="font-pixel text-sm text-gray-400">Controls: W / S</div>
                                    <div class="font-vcr text-lg text-white mt-3">${isCurrentPlayer1 ? this.player1.name : this.player2.name}</div>
                                </div>
                            </button>

                            <button id="modal-side-right" class="flex-1 max-w-[280px] p-8 border-2 border-white/30 hover:border-accent hover:bg-accent/10 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group">
                                <div class="text-6xl group-hover:scale-125 transition-transform">➡️</div>
                                <div class="text-center">
                                    <div class="font-vcr text-2xl text-accent mb-2">RIGHT SIDE</div>
                                    <div class="font-pixel text-sm text-gray-400">Controls: ↑ / ↓</div>
                                    <div class="font-vcr text-lg text-white mt-3">${isCurrentPlayer1 ? this.player2.name : this.player1.name}</div>
                                </div>
                            </button>
                        </div>

                        <div class="text-center">
                            <button id="modal-cancel" class="px-8 py-3 border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-vcr transition-all">
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(this.container);

            // Use setTimeout to ensure DOM is ready before attaching listeners
            setTimeout(() => {
                const leftBtn = this.container?.querySelector('#modal-side-left');
                const rightBtn = this.container?.querySelector('#modal-side-right');
                const cancelBtn = this.container?.querySelector('#modal-cancel');

                const cleanup = () => {
                    if (this.keyHandler) {
                        window.removeEventListener('keydown', this.keyHandler);
                        this.keyHandler = null;
                    }
                    if (this.container && this.container.parentNode) {
                        this.container.parentNode.removeChild(this.container);
                    }
                    this.container = null;
                };

                leftBtn?.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cleanup();
                    // If current user chooses LEFT:
                    // - If they are player1, keep order
                    // - If they are player2, swap order
                    resolve(isCurrentPlayer1 ? 'keep' : 'swap');
                });

                rightBtn?.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cleanup();
                    // If current user chooses RIGHT:
                    // - If they are player1, swap order
                    // - If they are player2, keep order
                    resolve(isCurrentPlayer1 ? 'swap' : 'keep');
                });

                cancelBtn?.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cleanup();
                    resolve(null);
                });

                // ESC key handler
                this.keyHandler = (e: KeyboardEvent) => {
                    if (e.key === 'Escape') {
                        cleanup();
                        resolve(null);
                    }
                };
                window.addEventListener('keydown', this.keyHandler);
            }, 0);
        });
    }
}
