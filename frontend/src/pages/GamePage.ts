import { AbstractComponent } from "../components/AbstractComponent";
import { GameRenderer } from "../components/GameRenderer";
import { GameService } from "../services/GameService";
import { App } from "../core/App";
import { GameStateService } from "../services/GameStateService";

export class GamePage extends AbstractComponent {
    private renderer: GameRenderer | null = null;
    private keysHeld: Set<string> = new Set();
    private animationFrameId: number | null = null;

    // Store players for input mapping
    private p1Ids: number[] = [];
    private p2Ids: number[] = [];

    getHtml(): string {
        return `
            <div id="game-screen" class="screen active w-full h-full bg-black p-2 border-[4px] border-accent box-border flex flex-col">
                <!-- Top Bar (HUD) -->
                <div class="w-full mx-auto mb-2 border border-white flex justify-between h-14 bg-black text-white relative">
                    <!-- Left Player -->
                    <div class="flex items-center w-1/3 border-r border-white">
                        <div class="w-14 h-full border-r border-white bg-cover bg-center" style="background-color: #333;"></div>
                        <span id="p1-name" class="pl-4 font-vcr uppercase truncate">Player 1</span>
                    </div>

                    <!-- Center Status -->
                    <div class="flex-1 flex items-center justify-center font-pixel text-xs text-text-muted">
                        <span id="game-status-text">INITIALIZING...</span>
                    </div>

                    <!-- Right Player -->
                    <div class="flex items-center justify-end w-1/3 border-l border-white">
                        <span id="p2-name" class="pr-4 font-vcr uppercase truncate">Player 2</span>
                        <div class="w-14 h-full border-l border-white bg-cover bg-center" style="background-color: #333;"></div>
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

        // Input handling
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        // Start Input Loop
        this.inputLoop();

        this.$('#exit-btn')?.addEventListener('click', () => {
            GameService.getInstance().disconnect();
            GameStateService.getInstance().clearSetup();
            App.getInstance().router.navigateTo('/');
        });

        // Store IDs for loop
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
            scoreToWin: setup.settings.scoreToWin
        } as any, setup.team1, setup.team2);

        // HUD Names
        const p1Name = setup.team1.map(p => p.username).join(', ') || 'PLAYER 1';
        const p2Name = setup.team2.map(p => p.username).join(', ') || 'PLAYER 2';

        const p1El = this.$('#p1-name');
        const p2El = this.$('#p2-name');
        if (p1El) p1El.innerText = p1Name;
        if (p2El) p2El.innerText = p2Name;

        service.onGameState((state) => {
            if (this.renderer) this.renderer.render(state);

            // Update Status Text once
            if (state) {
                const status = this.$('#game-status-text');
                if (status && status.innerText === "INITIALIZING...") {
                    status.innerText = "LIVE COMBAT";
                }
            }
        });
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        this.keysHeld.add(e.key);
    }

    private handleKeyUp = (e: KeyboardEvent) => {
        this.keysHeld.delete(e.key);
        this.keysHeld.delete(e.key.toLowerCase()); // Handle W vs w
        this.keysHeld.delete(e.key.toUpperCase());
    }

    private inputLoop = () => {
        this.animationFrameId = requestAnimationFrame(this.inputLoop);

        const service = GameService.getInstance();

        // Player 1 Control (W/S) - Moves ALL P1 paddles (or just the first/captain)
        // If local team, we iterate? Or just send for first?
        // Let's send for ALL p1Ids to be safe (sync movement)
        if (this.keysHeld.has('w') || this.keysHeld.has('W')) {
            this.p1Ids.forEach(id => service.sendMove('up', id));
        }
        if (this.keysHeld.has('s') || this.keysHeld.has('S')) {
            this.p1Ids.forEach(id => service.sendMove('down', id));
        }

        // Player 2 Control (Arrows)
        if (this.keysHeld.has('ArrowUp')) {
            this.p2Ids.forEach(id => service.sendMove('up', id));
        }
        if (this.keysHeld.has('ArrowDown')) {
            this.p2Ids.forEach(id => service.sendMove('down', id));
        }
    }

    onDestroy(): void {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        GameService.getInstance().disconnect();
    }
}
