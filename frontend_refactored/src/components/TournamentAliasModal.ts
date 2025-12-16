import { AbstractComponent } from "./AbstractComponent";

interface Player {
    id: number;
    username: string;
    alias?: string;
}

export class TournamentAliasModal extends AbstractComponent {
    private players: Player[];
    private onConfirm: (players: Player[]) => void;

    constructor(players: Player[], onConfirm: (p: Player[]) => void, _onCancel: () => void) {
        super();
        this.players = JSON.parse(JSON.stringify(players)); // Deep copy
        this.onConfirm = onConfirm;
    }

    getHtml(): string {
        return `
            <div class="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
                <div class="w-[600px] border-2 border-accent bg-black p-0 relative shadow-[0_0_30px_rgba(41,182,246,0.2)]">
                    
                    <!-- Header -->
                    <div class="p-8 border-b border-white/20">
                        <h2 class="font-vcr text-3xl text-white mb-4 tracking-[0.1em] uppercase">TOURNAMENT REGISTRATION</h2>
                        <p class="font-vcr text-sm text-white max-w-md leading-relaxed">
                            Please enter an alias for each member taking part in the tournament.
                        </p>
                    </div>

                    <!-- Player List -->
                    <div class="p-8 space-y-4 max-h-[400px] overflow-y-auto">
                        <div class="w-full h-[2px] bg-accent mb-6"></div>
                        
                        ${this.renderInputs()}
                    </div>

                    <!-- Footer -->
                    <div class="p-8 pt-0">
                        <button id="modal-confirm-btn" class="w-full py-4 bg-accent text-black font-pixel font-bold text-2xl tracking-wider hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-all">
                            BEGIN
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    private renderInputs(): string {
        return this.players.map((p, i) => `
            <div class="flex items-center justify-between gap-4 mb-4">
                <div class="flex items-center gap-4 w-1/3">
                    <div class="w-8 h-8 bg-gray-800 bg-cover bg-center border border-white/50" 
                         style="background-image: url('https://ui-avatars.com/api/?name=${p.username}&background=random')"></div>
                    <span class="font-vcr text-white text-lg truncate">${p.username}</span>
                </div>
                
                <input 
                    type="text" 
                    id="alias-input-${i}" 
                    value="${p.alias || ''}"
                    placeholder="Alias"
                    class="flex-1 bg-black border border-white/50 p-3 text-white font-vcr text-sm focus:border-accent focus:shadow-[0_0_10px_rgba(41,182,246,0.3)] outline-none transition-all placeholder:text-gray-700"
                >
            </div>
        `).join('');
    }

    onMounted(): void {
        this.$('#modal-confirm-btn')?.addEventListener('click', () => {
            // Collect aliases
            this.players.forEach((p, i) => {
                const input = this.$(`#alias-input-${i}`) as HTMLInputElement;
                if (input) {
                    p.alias = input.value.trim() || p.username; // Fallback to username
                }
            });
            this.onConfirm(this.players);
            this.destroy();
        });

        // Close on background click? check design. Design looks modal-exclusive. 
        // Keeping it strictly required to click BEGIN or maybe add a close if needed, 
        // but design doesn't show close "X". We'll rely on onCancel if we add a back button later.
    }

    public destroy(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = undefined;
    }

    // Override render to append to body instead of replacing
    public render(_containerId: string = ''): void {
        const container = document.createElement('div');
        this.container = container;
        container.innerHTML = this.getHtml();
        document.body.appendChild(container);
        this.onMounted();
    }
}
