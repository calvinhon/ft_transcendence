import { AbstractComponent } from "../components/AbstractComponent";
import { ThreeDGameRenderer } from "../components/ThreeDGameRenderer";
import { GameRenderer } from "../components/GameRenderer";
import { BabylonWrapper } from "../core/BabylonWrapper";
import { GameService } from "../services/GameService";
import { App } from "../core/App";
import { GameStateService } from "../services/GameStateService";
import { CampaignService } from "../services/CampaignService";
import { WebGLService } from "../services/WebGLService";
import { ConfirmationModal } from "../components/ConfirmationModal";

const SNAP_THRESHOLD = 200; // Distance to snap rather than lerp. Higher = smoother for fast objects.

export class GamePage extends AbstractComponent {
    private renderer: GameRenderer | null = null;
    private p1Ids: number[] = [];
    private p2Ids: number[] = [];
    private returnTimer: ReturnType<typeof setInterval> | null = null; // For game over countdown
    private isRecording: boolean = false; // Lock to prevent double recording
    private isPaused: boolean = false;
    private animationFrameId: number | null = null;
    private startTime: Date | null = null;
    private floatingHud: HTMLElement | null = null; // Floating HUD for 3D mode
    private is3DMode: boolean = false;

    getHtml(): string {
        return `
            <div id="game-screen" class="screen active w-full h-full bg-black p-2 border-[4px] border-accent box-border flex flex-col">
                <!-- Top Bar (HUD) -->
                <div class="w-full mx-auto mb-2 border border-white flex justify-between h-14 bg-black text-white relative z-20">
                    <!-- Left Player -->
                    <div class="flex items-center w-1/3 border-r border-white">
                        <div id="p1-avatar" class="w-14 h-full border-r border-white bg-cover bg-center" style="background-color: #333;"></div>
                        <span id="p1-name" class="pl-4 font-vcr uppercase truncate">Player 1</span>
                        <span id="p1-score" class="ml-auto pr-4 font-vcr text-2xl text-accent">0</span>
                    </div>

                    <!-- Center Status -->
                    <div class="flex-1 flex flex-col items-center justify-center font-pixel text-xs text-text-muted">
                        <span id="game-status-text">INITIALIZING...</span>
                    </div>

                    <!-- Right Player -->
                    <div class="flex items-center justify-end w-1/3 border-l border-white">
                        <span id="p2-score" class="mr-auto pl-4 font-vcr text-2xl text-accent">0</span>
                        <span id="p2-name" class="pr-4 font-vcr uppercase truncate">Player 2</span>
                        <div id="p2-avatar" class="w-14 h-full border-l border-white bg-cover bg-center" style="background-color: #333;"></div>
                    </div>
                </div>

                <!-- Canvas Container -->
                <div class="game-container flex-1 w-full border border-accent relative bg-black overflow-hidden">
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

        // Toggle Renderer
        // Toggle Renderer
        const canUse3D = WebGLService.getInstance().is3DModeEnabled();
        if (setup.settings.use3D && canUse3D) {
            console.log("3D Mode Enabled: Switching to Babylon Renderer");
            this.is3DMode = true;
            if (canvas) canvas.style.display = 'none'; // Hide 2D Canvas
            const screen = this.$('#game-screen');
            if (screen) {
                screen.classList.remove('bg-black');
                screen.classList.add('bg-transparent');

                // If using HtmlMeshProjector (Babylon), we might want to hide the screen container 
                // BUT if we hide it, HtmlMesh might not find content. 
                // Actually HtmlMesh clones or moves content.
                // In 3D mode, the GAME is rendered by Babylon meshes, NOT HtmlMesh. 
                // So we can hide the 2D UI container.
                screen.style.display = 'none';
            }
            this.renderer = new ThreeDGameRenderer() as any;

            // Create floating HUD for 3D mode (outside of HtmlMesh)
            this.createFloatingHUD(setup);
        } else {
            // 2D Mode
            if (canvas) canvas.style.display = 'block';
            this.renderer = new GameRenderer(canvas);

            // Safety: Tell Babylon to relax (disable tilt/camera updates) to prevent recursion crashes
            // while HtmlMesh is displaying this 2D game.
            if (canUse3D) {
                BabylonWrapper.getInstanceIfEnabled()?.set2DGameActive(true);
            }
        }

        // Use capture to ensure we get events before other elements swallow them
        window.addEventListener('keydown', this.handleKeyDown, { capture: true });
        window.addEventListener('keyup', this.handleKeyUp, { capture: true });

        // Sanitize teams to ensure usernames are present
        const getName = (p: any) => {
            if (p.username) return p.username;
            if (p.isBot || p.userId <= 0) return `BOT ${Math.abs(p.userId) || 1}`;
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
        const DECAY = 60; // Catch-up speed (higher = faster/tighter. 60 reduces visual gap significantly)

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
                }

                targetState = state;

                // Update Score DOM (with null checks)
                // Update Score DOM (with fallback for nested scores object)
                const lScore = state.leftScore !== undefined ? state.leftScore : (state.scores?.player1 ?? 0);
                const rScore = state.rightScore !== undefined ? state.rightScore : (state.scores?.player2 ?? 0);

                if (this.is3DMode) {
                    // Update floating HUD for 3D mode
                    this.updateFloatingHUD(lScore, rScore);
                } else {
                    // Update regular HUD for 2D mode
                    const p1ScoreEl = this.$('#p1-score');
                    const p2ScoreEl = this.$('#p2-score');
                    if (p1ScoreEl) p1ScoreEl.innerText = lScore.toString();
                    if (p2ScoreEl) p2ScoreEl.innerText = rScore.toString();
                }

                // Render frame
                if (this.renderer) {
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
                    // ARCADE & CAMPAIGN Match History Recording
                    // Handled by Backend GameScoring service automatically.
                    // Frontend manual save caused duplicate entries (and incorrect "Bot 1" naming).
                    console.log('Arcade/Campaign match finished. Saving handled by backend.');
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
        const overlayId = 'pause-overlay';
        let existingOverlay = document.getElementById(overlayId);

        if (this.isPaused) {
            if (!existingOverlay) {
                const overlay = document.createElement('div');
                overlay.id = overlayId;
                overlay.className = 'fixed inset-0 flex flex-col items-center justify-center bg-black/80 z-[10000] text-white font-pixel'; // fixed and high z-index
                overlay.innerHTML = `
                    <h1 class="text-4xl mb-4 text-neon-blue tracking-widest">PAUSED</h1>
                    <div class="flex flex-col gap-4 items-center">
                        <button id="pause-resume-btn" class="px-8 py-2 border border-accent hover:bg-accent/20 text-sm">RESUME</button>
                        <button id="pause-quit-btn" class="px-8 py-2 border border-red-500 text-red-500 hover:bg-red-500/20 text-sm">QUIT GAME</button>
                    </div>
                    <p class="mt-6 text-[8px] text-gray-500 font-pixel tracking-widest uppercase">Press 'P' to Resume</p>
                `;

                // Append to body to ensure visibility over 3D canvas
                document.body.appendChild(overlay);

                overlay.querySelector('#pause-resume-btn')?.addEventListener('click', () => this.togglePause());
                overlay.querySelector('#pause-quit-btn')?.addEventListener('click', () => {
                    const modalTarget = this.is3DMode
                        ? document.body
                        : document.getElementById('modal-container');

                    new ConfirmationModal(
                        "QUIT GAME? CURRENT PROGRESS WILL BE RECORDED.",
                        () => this.exitGame(),
                        () => { },
                        'destructive'
                    ).render(modalTarget as HTMLElement);
                });
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

        // Remove Pause Overlay
        const overlay = document.getElementById('pause-overlay');
        if (overlay) overlay.remove();

        let nextRoute = '/';
        if (setup && (setup.mode === 'tournament' || setup.tournamentId)) {
            nextRoute = '/tournament';
        }

        if (this.renderer && typeof (this.renderer as any).dispose === 'function') {
            (this.renderer as any).dispose();
            this.renderer = null;
        }

        GameStateService.getInstance().clearSetup();
        App.getInstance().router.navigateTo(nextRoute);
    }


    onDestroy(): void {
        window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
        window.removeEventListener('keyup', this.handleKeyUp, { capture: true }); // Fixed cleanup

        // Restore Babylon camera state if we were in 2D mode (re-enable tilt)
        if (!this.is3DMode && WebGLService.getInstance().is3DModeEnabled()) {
            BabylonWrapper.getInstanceIfEnabled()?.set2DGameActive(false);
        }

        if (this.returnTimer) {
            clearInterval(this.returnTimer);
            this.returnTimer = null;
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove Pause Overlay
        const overlay = document.getElementById('pause-overlay');
        if (overlay) overlay.remove();

        // Clean up floating HUD
        if (this.floatingHud) {
            this.floatingHud.remove();
            this.floatingHud = null;
        }

        // Ensure renderer cleanup if not already done via exitGame
        if (this.renderer && typeof (this.renderer as any).dispose === 'function') {
            (this.renderer as any).dispose();
            this.renderer = null;
        }

        window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
        window.removeEventListener('keyup', this.handleKeyUp, { capture: true });
        GameService.getInstance().disconnect();
    }

    private createFloatingHUD(setup: any): void {
        // Create a floating HUD that sits on top of the Babylon canvas
        // This is necessary because in 3D mode, the HtmlMesh (which contains #app) is disabled
        const sanitizedTeam1 = setup.team1 || [];
        const sanitizedTeam2 = setup.team2 || [];

        const p1Name = sanitizedTeam1.map((p: any) => p.username || `User ${p.userId}`).join(', ') || 'PLAYER 1';
        const p2Name = sanitizedTeam2.map((p: any) => p.username || `User ${p.userId}`).join(', ') || 'PLAYER 2';

        const p1Avatar = sanitizedTeam1[0]?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p1Name)}&background=0A0A0A&color=29B6F6`;
        const p2Avatar = sanitizedTeam2[0]?.avatarUrl || (sanitizedTeam2[0]?.isBot ? 'https://ui-avatars.com/api/?name=AI&background=FF0000&color=FFF' : `https://ui-avatars.com/api/?name=${encodeURIComponent(p2Name)}&background=0A0A0A&color=29B6F6`);

        this.floatingHud = document.createElement('div');
        this.floatingHud.id = 'floating-game-hud';
        this.floatingHud.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 9999;
            pointer-events: none;
            padding: 12px;
        `;

        this.floatingHud.innerHTML = `
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(0, 0, 0, 0.8);
                border: 1px solid #29b6f6;
                padding: 8px 16px;
                font-family: 'VCR OSD Mono', monospace;
                color: white;
            ">
                <!-- Left Player -->
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background-image: url('${p1Avatar}');
                        background-size: cover;
                        background-position: center;
                        border: 2px solid #29b6f6;
                    "></div>
                    <span style="text-transform: uppercase; font-size: 14px;">${p1Name}</span>
                    <span id="floating-p1-score" style="font-size: 28px; color: #29b6f6; font-weight: bold;">0</span>
                </div>
                
                <!-- Center -->
                <div style="text-align: center;">
                    <span id="floating-game-status" style="font-size: 12px; color: #888;">PLAYING</span>
                </div>
                
                <!-- Right Player -->
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span id="floating-p2-score" style="font-size: 28px; color: #29b6f6; font-weight: bold;">0</span>
                    <span style="text-transform: uppercase; font-size: 14px;">${p2Name}</span>
                    <div style="
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background-image: url('${p2Avatar}');
                        background-size: cover;
                        background-position: center;
                        border: 2px solid #29b6f6;
                    "></div>
                </div>
            </div>
        `;

        document.body.appendChild(this.floatingHud);
    }

    private updateFloatingHUD(leftScore: number, rightScore: number): void {
        if (!this.floatingHud) return;

        const p1ScoreEl = this.floatingHud.querySelector('#floating-p1-score');
        const p2ScoreEl = this.floatingHud.querySelector('#floating-p2-score');

        if (p1ScoreEl) p1ScoreEl.textContent = leftScore.toString();
        if (p2ScoreEl) p2ScoreEl.textContent = rightScore.toString();
    }
}
