import { AbstractComponent } from "../components/AbstractComponent";
import { GameRenderer } from "../components/GameRenderer";
import { GameService } from "../services/GameService";
import { App } from "../core/App";
import { GameStateService } from "../services/GameStateService";
import { CampaignService } from "../services/CampaignService";

export class GamePage extends AbstractComponent {
    private renderer: GameRenderer | null = null;
    private p1Ids: number[] = [];
    private p2Ids: number[] = [];
    private returnTimer: ReturnType<typeof setInterval> | null = null; // For game over countdown
    private isRecording: boolean = false; // Lock to prevent double recording
    private lastRenderTime: number = 0;
    private renderThrottleMs: number = 16; // ~60fps max

    getHtml(): string {
        return `
            <div id="game-screen" class="screen active w-full h-full bg-black p-2 border-[4px] border-accent box-border flex flex-col">
                <!-- Top Bar (HUD) -->
                <div class="w-full mx-auto mb-2 border border-white flex justify-between h-14 bg-black text-white relative">
                    <!-- Left Player -->
                    <div class="flex items-center w-1/3 border-r border-white">
                        <div id="p1-avatar" class="w-14 h-full border-r border-white bg-cover bg-center" style="background-color: #333;"></div>
                        <span id="p1-name" class="pl-4 font-vcr uppercase truncate">Player 1</span>
                    </div>

                    <!-- Center Status -->
                    <div class="flex-1 flex items-center justify-center font-pixel text-xs text-text-muted">
                        <span id="game-status-text">INITIALIZING...</span>
                    </div>

                    <!-- Right Player -->
                    <div class="flex items-center justify-end w-1/3 border-l border-white">
                        <span id="p2-name" class="pr-4 font-vcr uppercase truncate">Player 2</span>
                        <div id="p2-avatar" class="w-14 h-full border-l border-white bg-cover bg-center" style="background-color: #333;"></div>
                    </div>
                </div>

                <!-- Canvas Container -->
                <div class="game-container flex-1 w-full border border-accent relative bg-black overflow-hidden">
                    <!-- Overlay Controls -->
                    <div class="absolute top-4 right-4 flex gap-2 z-20">
                         <button id="exit-btn" class="w-8 h-8 border border-white text-white hover:bg-red-500 hover:border-red-500 flex items-center justify-center cursor-pointer">
                            <i class="fas fa-stop"></i>
                        </button>
                    </div>

                    <canvas id="game-canvas" class="w-full h-full block"></canvas>
                </div>
            </div>
        `;
    }

    onMounted(): void {
        const setup = GameStateService.getInstance().getSetup();
        if (!setup) {
            console.warn("No game setup found, redirecting to menu");
            App.getInstance().router.navigateTo('/');
            return;
        }

        const canvas = this.$('#game-canvas') as HTMLCanvasElement;

        if (canvas) {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
            }
        }

        this.renderer = new GameRenderer(canvas);

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        this.$('#exit-btn')?.addEventListener('click', () => {
            this.exitGame();
        });

        // Store IDs for loop if needed, but GameService handles it now
        this.p1Ids = setup.team1.map(p => p.userId);
        this.p2Ids = setup.team2.map(p => p.userId);

        console.log("Game IDs:", this.p1Ids, this.p2Ids);

        const service = GameService.getInstance();
        service.connect({
            mode: setup.mode,
            ballSpeed: setup.settings.ballSpeed,
            paddleSpeed: setup.settings.paddleSpeed,
            powerups: setup.settings.powerups,
            accumulateOnHit: setup.settings.accumulateOnHit,
            difficulty: setup.settings.difficulty,
            scoreToWin: setup.settings.scoreToWin,
            campaignLevel: setup.campaignLevel
        } as any, setup.team1, setup.team2);

        // HUD Names and Avatars
        const p1Name = setup.team1.map(p => p.username).join(', ') || 'PLAYER 1';
        const p2Name = setup.team2.map(p => p.username).join(', ') || 'PLAYER 2';

        const p1El = this.$('#p1-name');
        const p2El = this.$('#p2-name');
        if (p1El) p1El.innerText = p1Name;
        if (p2El) p2El.innerText = p2Name;

        // Set avatars in HUD
        const p1Avatar = (setup.team1[0] as any)?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p1Name)}&background=0A0A0A&color=29B6F6`;
        const p2Avatar = (setup.team2[0] as any)?.avatarUrl || ((setup.team2[0] as any)?.isBot ? 'https://ui-avatars.com/api/?name=AI&background=FF0000&color=FFF' : `https://ui-avatars.com/api/?name=${encodeURIComponent(p2Name)}&background=0A0A0A&color=29B6F6`);

        const p1AvatarEl = this.$('#p1-avatar');
        const p2AvatarEl = this.$('#p2-avatar');
        if (p1AvatarEl) (p1AvatarEl as HTMLElement).style.backgroundImage = `url('${p1Avatar}')`;
        if (p2AvatarEl) (p2AvatarEl as HTMLElement).style.backgroundImage = `url('${p2Avatar}')`;

        service.onGameState(async (state) => {
            console.log('Game state received:', state); // Debug logging

            // Throttle rendering to prevent excessive canvas updates
            const now = Date.now();
            if (now - this.lastRenderTime >= this.renderThrottleMs) {
                if (this.renderer) this.renderer.render(state, setup.mode);
                this.lastRenderTime = now;
            }

            // Update Status Text based on game state
            const status = this.$('#game-status-text');

            if (!state) {
                if (status) status.innerText = "CONNECTING...";
            } else if (state.gameState === 'countdown') {
                const countdownValue = state.countdownValue || 3;
                if (status) status.innerText = `GET READY... ${countdownValue}`;
            } else if (state.gameState === 'playing') {
                if (status) status.innerText = "LIVE COMBAT";
            } else if (state.gameState === 'finished' || state.type === 'gameEnd') {
                // --- Game Over Handling ---
                if (status) status.innerText = "MISSION COMPLETE";

                // Prevent multiple recordings/overlays
                if (this.isRecording) return;
                this.isRecording = true;

                // Save Game Result (ALL modes now)

                // Scores are in state.scores.player1 and state.scores.player2
                const p1Score = state.scores?.player1 ?? state.player1Score ?? 0;
                const p2Score = state.scores?.player2 ?? state.player2Score ?? 0;

                // Compute winnerId from scores if not provided
                let winnerId = state.winnerId;
                if (!winnerId && p1Score !== p2Score) {
                    winnerId = p1Score > p2Score ? this.p1Ids[0] : this.p2Ids[0];
                }

                console.log('Recording match with scores:', { p1Score, p2Score, winnerId, team1: setup.team1, team2: setup.team2, mode: setup.mode });

                // --- TOURNAMENT LOGIC ---
                if (setup.mode === 'tournament' && setup.tournamentId && setup.tournamentMatchId) {
                    let finalScore1 = p1Score;
                    let finalScore2 = p2Score;

                    // If Team 1 user isn't the original Player 1, they swapped sides!
                    if (setup.tournamentPlayer1Id && setup.team1[0].userId !== setup.tournamentPlayer1Id) {
                        console.log("Detecting players swapped, swapping scores for tournament record");
                        finalScore1 = p2Score;
                        finalScore2 = p1Score;
                    }

                    // Manually record to tournament service with CORRECT scores
                    // Note: This relies on TournamentService being imported
                    const { TournamentService } = await import('../services/TournamentService');
                    TournamentService.getInstance().recordMatchResult(
                        setup.tournamentId.toString(),
                        setup.tournamentMatchId.toString(),
                        winnerId,
                        finalScore1,
                        finalScore2
                    ).catch(err => console.error("Frontend tournament record failed:", err));
                }

                GameService.getInstance().recordMatchResult({
                    mode: setup.mode,
                    team1: setup.team1.map(p => p.userId),
                    team2: setup.team2.map(p => p.userId),
                    score1: p1Score,
                    score2: p2Score,
                    winnerId: winnerId,
                    tournamentId: setup.tournamentId,
                    tournamentMatchId: setup.tournamentMatchId,
                    skipTournamentNotification: true // Let frontend handle tournament update to handle swaps correctly
                }).catch(err => console.warn("Match recording failed:", err));

                // Add Auto-Return Timer UI
                // Add Auto-Return Timer UI
                const container = this.$('.game-container');
                if (container && !this.$('#game-over-overlay')) {
                    const winnerId = state.winnerId || (state.scores?.player1 > state.scores?.player2 ? this.p1Ids[0] : this.p2Ids[0]);
                    // Find winner name from setup teams
                    let winnerName = `PLAYER ${winnerId === this.p1Ids[0] ? '1' : '2'}`;
                    const winnerObj = [...setup.team1, ...setup.team2].find((p: any) => p.userId === winnerId);
                    if (winnerObj) winnerName = winnerObj.username;

                    const overlay = document.createElement('div');
                    overlay.id = 'game-over-overlay';
                    overlay.className = 'absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 text-white font-pixel';
                    overlay.innerHTML = `
                        <h1 class="text-4xl mb-4 text-neon-blue">GAME OVER</h1>
                        <p class="text-xl mb-8">WINNER: ${winnerName.toUpperCase()}</p>
                        <p class="text-sm text-gray-400">Returning to menu in <span id="return-countdown">5</span>...</p>
                        <button id="return-now-btn" class="mt-4 px-6 py-2 border border-accent hover:bg-accent/20">RETURN NOW</button>
                    `;
                    container.appendChild(overlay);

                    let seconds = 5;
                    const countEl = overlay.querySelector('#return-countdown');
                    const btn = overlay.querySelector('#return-now-btn');

                    this.returnTimer = setInterval(() => {
                        seconds--;
                        if (countEl) countEl.textContent = seconds.toString();
                        if (seconds <= 0) {
                            if (this.returnTimer) clearInterval(this.returnTimer);
                            this.exitGame();
                        }
                    }, 1000);

                    btn?.addEventListener('click', () => {
                        if (this.returnTimer) clearInterval(this.returnTimer);
                        this.exitGame();
                    });
                }

                // Campaign Logic
                if (setup.mode === 'campaign') {
                    const myId = App.getInstance().currentUser?.userId;
                    if (myId && state.winnerId === myId) {
                        console.log("Campaign Victory! Advancing Level...");
                        CampaignService.getInstance().advanceLevel();
                    }
                }


            }
        });
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        // Prevent default scrolling for game keys
        if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code) || e.code.startsWith('Key')) {
            e.preventDefault();
        }
        GameService.getInstance().handleKeyDown(e.code);
    }

    private handleKeyUp = (e: KeyboardEvent) => {
        GameService.getInstance().handleKeyUp(e.code);
    }

    private exitGame(): void {
        const setup = GameStateService.getInstance().getSetup();
        GameService.getInstance().disconnect();

        let nextRoute = '/';
        if (setup && (setup.mode === 'tournament' || setup.tournamentId)) {
            nextRoute = '/tournament';
        }

        GameStateService.getInstance().clearSetup();
        App.getInstance().router.navigateTo(nextRoute);
    }

    onDestroy(): void {
        if (this.returnTimer) {
            clearInterval(this.returnTimer);
            this.returnTimer = null;
        }
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        GameService.getInstance().disconnect();
    }
}
