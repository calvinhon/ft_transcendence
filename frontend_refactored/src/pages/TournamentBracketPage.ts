import { AbstractComponent } from "../components/AbstractComponent";
import { App } from "../core/App";
import { TournamentService, Tournament } from "../services/TournamentService";
import { GameStateService } from "../services/GameStateService";

export class TournamentBracketPage extends AbstractComponent {
    private tournamentId: string | null = null;
    private tournament: Tournament | null = null;
    private autoRefreshInterval: any = null;

    constructor() {
        super();
        this.setTitle("TOURNAMENT BRACKET");
    }

    async onMounted() {
        // Get tournament ID from router or service
        // Ideally router param /tournament/:id
        // But for now maybe we fetch the current one from Service
        const current = TournamentService.getInstance().getCurrentTournament();
        if (current) {
            this.tournamentId = current.id;
            this.tournament = current;
        } else {
            // Try to find from URL if we had params support
            // fallback
            this.container!.innerHTML = "<div class='text-white p-8'>No Active Tournament Found</div>";
            return;
        }

        await this.refreshData();
        this.render();

        // Auto Refresh
        this.autoRefreshInterval = setInterval(() => this.refreshData().then(() => this.render()), 5000);

        this.bindEvents();
    }

    onDestroy() {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
    }

    private async refreshData() {
        if (!this.tournamentId) return;
        this.tournament = await TournamentService.getInstance().get(this.tournamentId);
    }

    private bindEvents() {
        this.container?.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const playBtn = target.closest('.match-play-btn') as HTMLElement;

            if (playBtn) {
                const matchId = playBtn.dataset.matchId;
                if (matchId) this.playMatch(matchId);
            }

            const blockchainBtn = target.closest('#blockchain-record-btn');
            if (blockchainBtn) {
                this.recordBlockchain();
            }
        });
    }

    public render(): void {
        if (this.container) {
            this.container.innerHTML = this.getHtml();
            this.bindEvents();
        }
    }

    private playMatch(matchId: string) {
        if (!this.tournament) return;
        const match = this.tournament.matches.find(m => m.matchId.toString() === matchId);
        if (!match) return;

        // Setup Game
        const setup = {
            mode: 'tournament',
            settings: {
                scoreToWin: 3, // Tournament standard?
                ballSpeed: 'medium',
                paddleSpeed: 'medium',
                powerups: false,
                accumulateOnHit: false,
                difficulty: 'medium'
            },
            team1: [{ userId: match.player1Id, username: match.player1Name, paddleIndex: 0 }],
            team2: [{ userId: match.player2Id, username: match.player2Name, paddleIndex: 0 }]
        };

        // Pass Tournament Metadata so GamePage knows where to report results
        // GamePage currently triggers GameService which triggers backend "gameEnd".
        // But backend for "gameEnd" might not update tournament directly unless linked.
        // The Legacy system did "playMatchFromCard" -> startGame
        // And then "recordMatchResult" was called manually or automagically?
        // Legacy `handleTournamentGameEnd` (View 167 line 1727) calls `recordMatchResult`.
        // So I need to ensure GamePage/Service handles this linkage.
        // For now, let's put it in App state just like legacy.

        // Better: GameStateService should hold tournament context
        (setup as any).tournamentContext = {
            tournamentId: this.tournament.id,
            matchId: match.matchId
        };

        GameStateService.getInstance().setSetup(setup as any);
        App.getInstance().router.navigateTo('/game');
    }

    private async recordBlockchain() {
        if (!this.tournament || !this.tournament.winnerId) return;
        try {
            await TournamentService.getInstance().recordOnBlockchain(this.tournament.id, this.tournament.winnerId);
            alert("Recorded on Blockchain successfully!");
        } catch (e) {
            alert("Failed to record on blockchain.");
        }
    }

    getHtml(): string {
        if (!this.tournament) return `<div class="text-white text-center mt-20">LOADING TOURNAMENT DATA...</div>`;

        return `
            <div class="w-full h-full bg-black p-4 overflow-y-auto">
                <div class="max-w-6xl mx-auto border border-accent p-6 bg-black/80">
                    <!-- Header -->
                    <div class="flex justify-between items-center mb-8 border-b border-white pb-4">
                        <div>
                            <h1 class="text-3xl font-vcr text-white">${this.tournament.name}</h1>
                            <div class="flex gap-4 mt-2 text-sm font-pixel">
                                <span class="text-accent">STATUS: ${this.tournament.status.toUpperCase()}</span>
                                <span class="text-gray-400">PLAYERS: ${this.tournament.players.length}</span>
                            </div>
                        </div>
                        <button onclick="window.history.back()" class="px-4 py-2 border border-white text-white hover:bg-white hover:text-black">
                            EXIT TO MENU
                        </button>
                    </div>

                    <!-- Bracket Area -->
                    <div class="flex gap-8 overflow-x-auto pb-4 custom-scrollbar">
                        ${this.renderBracket()}
                    </div>

                    <!-- Winner / Actions -->
                    ${this.tournament.winnerId ? `
                        <div class="mt-8 p-6 border border-green-500 bg-green-900/20 text-center">
                            <h2 class="text-2xl text-green-400 font-bold mb-2">TOURNAMENT COMPLETED</h2>
                            <p class="text-white mb-4">WINNER: <span class="font-bold text-xl">${this.getWinnerName()}</span></p>
                            <button id="blockchain-record-btn" class="px-6 py-3 bg-accent text-black font-bold hover:bg-white transition-all">
                                <i class="fas fa-link mr-2"></i> RECORD ON BLOCKCHAIN
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    private getWinnerName(): string {
        if (!this.tournament || !this.tournament.winnerId) return "Unknown";
        const p = this.tournament.players.find(x => x.id === this.tournament!.winnerId);
        return p ? p.username : `Player ${this.tournament.winnerId}`;
    }

    private renderBracket(): string {
        if (!this.tournament) return '';

        // Group matches by round
        const rounds: { [key: number]: any[] } = {};
        this.tournament.matches.forEach(m => {
            if (!rounds[m.round]) rounds[m.round] = [];
            rounds[m.round].push(m);
        });

        return Object.keys(rounds).sort().map(r => {
            const roundNum = parseInt(r);
            return `
                <div class="flex flex-col justify-around min-w-[250px]">
                    <h3 class="text-center text-accent font-pixel mb-4 border-b border-accent/30 pb-2">ROUND ${roundNum}</h3>
                    <div class="flex flex-col gap-8 justify-center h-full">
                        ${rounds[roundNum].map(m => this.renderMatchCard(m)).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    private renderMatchCard(match: any): string {
        const isReady = match.player1Id !== 0 && match.player2Id !== 0 && match.status !== 'completed';
        const isCompleted = match.status === 'completed';

        return `
            <div class="border ${isCompleted ? 'border-green-500/50' : 'border-white/30'} bg-black p-3 relative group min-w-[220px]">
                <div class="flex flex-col gap-2">
                    <!-- P1 -->
                    <div class="flex justify-between items-center ${match.winnerId === match.player1Id ? 'text-green-400 font-bold' : 'text-gray-300'}">
                        <span>${this.getPlayerName(match.player1Id)}</span>
                        <span>${match.score1 ?? '-'}</span>
                    </div>
                    <!-- P2 -->
                    <div class="flex justify-between items-center ${match.winnerId === match.player2Id ? 'text-green-400 font-bold' : 'text-gray-300'}">
                        <span>${this.getPlayerName(match.player2Id)}</span>
                        <span>${match.score2 ?? '-'}</span>
                    </div>
                </div>

                ${isReady ? `
                <div class="mt-3 pt-2 border-t border-white/10 text-center">
                     <button class="match-play-btn text-xs bg-accent text-black px-3 py-1 font-bold hover:bg-white w-full" data-match-id="${match.matchId}">
                        PLAY MATCH
                    </button>
                </div>
                ` : ''}
                
                <div class="absolute top-0 right-0 p-1">
                    <span class="text-[10px] text-gray-600">#${match.matchId}</span>
                </div>
            </div>
        `;
    }

    private getPlayerName(id: number): string {
        if (id === 0) return "TBD";
        const p = this.tournament?.players.find(pl => pl.id === id);
        return p ? p.username : `Player ${id}`;
    }
}
