import { AbstractComponent } from "../components/AbstractComponent";
import { GameRenderer } from "../components/GameRenderer";
import { GameService } from "../services/GameService";
import { App } from "../core/App";
import { GameStateService } from "../services/GameStateService";
import { CampaignService } from "../services/CampaignService";

const SNAP_THRESHOLD = 50; // Distance to snap rather than lerp

export class GamePage extends AbstractComponent {
    private renderer: GameRenderer | null = null;
    private p1Ids: number[] = [];
    private p2Ids: number[] = [];
    private returnTimer: ReturnType<typeof setInterval> | null = null; // For game over countdown
    private isRecording: boolean = false; // Lock to prevent double recording
    private isPaused: boolean = false;
    private animationFrameId: number | null = null;
    private startTime: Date | null = null;

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

        // Sanitize teams to ensure usernames are present
        const getName = (p: any) => {
            if (p.username) return p.username;
            if (p.isBot || (p.userId >= 100000)) return `BOT ${p.userId % 10000}`;
            return `User ${p.userId}`;
        };

        const sanitizedTeam1 = setup.team1.map((p: any) => ({ ...p, username: getName(p) }));
        const sanitizedTeam2 = setup.team2.map((p: any) => ({ ...p, username: getName(p) }));

        // Store IDs for loop if needed, but GameService handles it now
        this.p1Ids = sanitizedTeam1.map((p: any) => p.userId);
        this.p2Ids = sanitizedTeam2.map((p: any) => p.userId);

        console.log("Game IDs:", this.p1Ids, this.p2Ids);

        const service = GameService.getInstance();
        service.connect({
            mode: setup.mode,
            ballSpeed: setup.settings.ballSpeed,
            paddleSpeed: setup.settings.paddleSpeed,
            powerups: (setup.settings as any).powerupsEnabled ?? setup.settings.powerups,
            accumulateOnHit: setup.settings.accumulateOnHit,
            difficulty: setup.settings.difficulty,
            scoreToWin: setup.settings.scoreToWin,
            campaignLevel: setup.campaignLevel
        } as any, sanitizedTeam1, sanitizedTeam2);

        // HUD Names and Avatars
        const p1Name = sanitizedTeam1.map((p: any) => p.username).join(', ') || 'PLAYER 1';
        const p2Name = sanitizedTeam2.map((p: any) => p.username).join(', ') || 'PLAYER 2';

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

        // Initialize LERP state
        let visualState: any = null;
        let targetState: any = null;

        let lastUpdateTime = performance.now();
        const DECAY = 25; // Catch-up speed (higher = faster)

        const lerp = (start: number, target: number, dt: number) => {
            return target + (start - target) * Math.exp(-DECAY * dt);
        };

        const updateLoop = () => {
            if (!this.renderer || !targetState) return;

            const now = performance.now();
            const dt = (now - lastUpdateTime) / 1000;
            lastUpdateTime = now;

            if (!visualState) {
                visualState = JSON.parse(JSON.stringify(targetState));
            }

            // Interpolate Ball
            if (targetState.ball && visualState.ball) {
                if (isNaN(visualState.ball.x) || isNaN(visualState.ball.y)) {
                    visualState.ball.x = targetState.ball.x;
                    visualState.ball.y = targetState.ball.y;
                }

                const dist = Math.sqrt(Math.pow(targetState.ball.x - visualState.ball.x, 2) + Math.pow(targetState.ball.y - visualState.ball.y, 2));

                if (isNaN(dist)) {
                    visualState.ball.x = targetState.ball.x;
                    visualState.ball.y = targetState.ball.y;
                } else if (dist > SNAP_THRESHOLD || targetState.ball.frozen) {
                    visualState.ball.x = targetState.ball.x;
                    visualState.ball.y = targetState.ball.y;
                } else {
                    visualState.ball.x = lerp(visualState.ball.x, targetState.ball.x, dt);
                    visualState.ball.y = lerp(visualState.ball.y, targetState.ball.y, dt);
                }
            }

            // Interpolate Paddles
            if (visualState.paddles && targetState.paddles) {
                const syncPaddles = (targetArr: any[], visualArr: any[]) => {
                    if (!targetArr || !visualArr) return;
                    targetArr.forEach((tPaddle, i) => {
                        if (!visualArr[i]) visualArr[i] = { ...tPaddle };
                        visualArr[i].height = tPaddle.height;
                        visualArr[i].width = tPaddle.width;

                        if (Math.abs(tPaddle.y - visualArr[i].y) > SNAP_THRESHOLD) {
                            visualArr[i].y = tPaddle.y;
                        } else {
                            visualArr[i].y = lerp(visualArr[i].y, tPaddle.y, dt);
                        }
                    });
                };

                syncPaddles(targetState.paddles.team1, visualState.paddles.team1);
                syncPaddles(targetState.paddles.team2, visualState.paddles.team2);

                if (targetState.paddles.player1 && visualState.paddles.player1) {
                    visualState.paddles.player1.height = targetState.paddles.player1.height;
                    if (Math.abs(targetState.paddles.player1.y - visualState.paddles.player1.y) > SNAP_THRESHOLD)
                        visualState.paddles.player1.y = targetState.paddles.player1.y;
                    else
                        visualState.paddles.player1.y = lerp(visualState.paddles.player1.y, targetState.paddles.player1.y, dt);
                }
                if (targetState.paddles.player2 && visualState.paddles.player2) {
                    visualState.paddles.player2.height = targetState.paddles.player2.height;
                    if (Math.abs(targetState.paddles.player2.y - visualState.paddles.player2.y) > SNAP_THRESHOLD)
                        visualState.paddles.player2.y = targetState.paddles.player2.y;
                    else
                        visualState.paddles.player2.y = lerp(visualState.paddles.player2.y, targetState.paddles.player2.y, dt);
                }
            }

            // Directly copy non-interpolated data
            visualState.scores = targetState.scores;
            visualState.powerup = targetState.powerup;
            visualState.gameState = targetState.gameState;
            visualState.countdownValue = targetState.countdownValue;

            this.renderer.render(visualState, setup.mode);

            // Update Status Text based on game state
            const status = this.$('#game-status-text');
            if (visualState.gameState === 'playing' && status) status.innerText = "PLAYING";

            if (visualState.gameState !== 'finished' && visualState.type !== 'gameEnd') {
                this.animationFrameId = requestAnimationFrame(updateLoop);
            }
        };

        service.onGameState(async (state) => {
            // Handle Non-GameState Events strictly
            if (state.type === 'gamePaused') {
                this.isPaused = true;
                this.updatePauseUI();
                return;
            } else if (state.type === 'gameResumed') {
                this.isPaused = false;
                this.updatePauseUI();
                // Ensure loop is running
                if (!this.animationFrameId) updateLoop();
                return;
            }

            // Only update target state if it's a valid game state update
            if (state.type === 'gameState' || state.ball) {
                if (!targetState) {
                    // First state received
                    targetState = state;
                    visualState = JSON.parse(JSON.stringify(state));
                    this.startTime = new Date();
                    updateLoop();
                }

                // --- Tracking Start Time ---
                if (state && (state.gameState === 'playing' || state.type === 'gameStart') && !this.startTime) {
                    this.startTime = new Date();
                } else {
                    targetState = state;
                    // If loop stopped (e.g. resumed from pause), restart it
                    if (!this.animationFrameId) updateLoop();
                }
            }

            // Check for Game Over immediately on state receipt to handle events
            if (state && (state.gameState === 'finished' || state.type === 'gameEnd')) {
                // Render final state once to ensure score is updated
                if (this.renderer) this.renderer.render(state, setup.mode);
                if (this.animationFrameId) {
                    cancelAnimationFrame(this.animationFrameId);
                    this.animationFrameId = null;
                }

                // --- Game Over Handling ---
                const status = this.$('#game-status-text');
                if (status) status.innerText = "FINISHED";

                // Prevent multiple recordings/overlays
                if (this.isRecording) return;
                this.isRecording = true;

                // Save Game Result (ALL modes now)

                // Scores are in state.scores.player1 and state.scores.player2
                const p1Score = state.scores?.player1 ?? state.player1Score ?? 0;
                const p2Score = state.scores?.player2 ?? state.player2Score ?? 0;

                // Compute winnerId from scores if not provided
                let winnerId = state.winnerId;
                if (winnerId === undefined || winnerId === null) {
                    // Handle draws: if scores are equal, winnerId = 0
                    if (p1Score === p2Score) {
                        winnerId = 0;
                    } else {
                        winnerId = p1Score > p2Score ? this.p1Ids[0] : this.p2Ids[0];
                    }
                }

                console.log('Recording match with scores:', { p1Score, p2Score, winnerId, team1: setup.team1, team2: setup.team2, mode: setup.mode });

                // --- TOURNAMENT LOGIC ---
                if (setup.mode === 'tournament' && setup.tournamentId && setup.tournamentMatchId) {
                    let finalScore1 = p1Score;
                    let finalScore2 = p2Score;
                    let recordWinner = winnerId;

                    // If Team 1 user isn't the original Player 1, they swapped sides!
                    if (setup.tournamentPlayer1Id && setup.team1[0].userId !== setup.tournamentPlayer1Id) {
                        console.log("Detecting players swapped, swapping scores for tournament record");
                        finalScore1 = p2Score;
                        finalScore2 = p1Score;
                        // Winner ID is likely correct from backend, but if it was based on P1/P2 slot...
                        // Backend winnerId corresponds to User ID, so it should be correct regardless of slot.
                    }

                    // Manually record to tournament service with CORRECT scores
                    // Note: This relies on TournamentService being imported
                    const { TournamentService } = await import('../services/TournamentService');
                    try {
                        await TournamentService.getInstance().recordMatchResult(
                            setup.tournamentId.toString(),
                            setup.tournamentMatchId.toString(),
                            recordWinner,
                            finalScore1,
                            finalScore2
                        );
                    } catch (err) {
                        console.error("Frontend tournament record failed:", err);
                    }
                } else if (setup.mode === 'arcade' || setup.mode === 'campaign') {
                    // --- ARCADE & CAMPAIGN Match History Recording ---
                    // Save ONE record per match with full team arrays
                    const matchPayload = {
                        player1_id: sanitizedTeam1[0]?.userId || 0,
                        player2_id: sanitizedTeam2[0]?.userId || 0,
                        player1_score: p1Score,
                        player2_score: p2Score,
                        winner_id: winnerId,
                        game_mode: setup.mode,
                        team1: sanitizedTeam1,
                        team2: sanitizedTeam2,
                        started_at: this.startTime ? this.startTime.toISOString() : new Date().toISOString(),
                        finished_at: new Date().toISOString()
                    };

                    try {
                        await GameService.getInstance().recordMatchResult(matchPayload);
                        console.log('Arcade/Campaign match recorded:', matchPayload);
                    } catch (err) {
                        console.error('Failed to record arcade match:', err);
                    }
                }

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
                    // Player 1 is always the human in campaign mode.
                    // If winnerId matches the player 1 ID, advance the campaign.
                    if (winnerId === this.p1Ids[0]) {
                        console.log("Campaign Victory! Advancing Level...");
                        CampaignService.getInstance().advanceLevel();
                    } else {
                        console.log("Campaign Defeat. winnerId:", winnerId, "p1Id:", this.p1Ids[0]);
                    }
                }
            }
        });
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        // Toggle Pause on 'P' or 'Escape'
        if (e.code === 'KeyP' || e.code === 'Escape') {
            this.togglePause();
            e.preventDefault();
            return;
        }

        // Prevent default scrolling for game keys
        if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code) || e.code.startsWith('Key')) {
            e.preventDefault();
        }
        GameService.getInstance().handleKeyDown(e.code);
    }

    private togglePause(): void {
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            GameService.getInstance().pauseGame();
        } else {
            GameService.getInstance().resumeGame();
        }
        this.updatePauseUI();
    }

    private updatePauseUI(): void {
        const container = this.$('.game-container');
        const overlayId = 'pause-overlay';
        const existingOverlay = this.$(`#${overlayId}`);

        if (this.isPaused) {
            if (container && !existingOverlay) {
                const overlay = document.createElement('div');
                overlay.id = overlayId;
                overlay.className = 'absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-40 text-white font-pixel';
                overlay.innerHTML = `
                    <h1 class="text-4xl mb-4 text-neon-blue tracking-widest">PAUSED</h1>
                    <p class="text-xs text-gray-500">PRESS 'P' TO RESUME</p>
                `;
                container.appendChild(overlay);
            }
        } else {
            if (existingOverlay) {
                existingOverlay.remove();
            }
        }
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
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        GameService.getInstance().disconnect();
    }
}
