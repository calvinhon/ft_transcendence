import { AbstractComponent } from "../components/AbstractComponent";
import { GameRenderer } from "../components/GameRenderer";
import { GameService } from "../services/GameService";
import { App } from "../core/App";
import { GameStateService } from "../services/GameStateService";

export class GamePage extends AbstractComponent {
    private renderer: GameRenderer | null = null;
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
            if (this.renderer) this.renderer.render(state, setup.mode);

            // Update Status Text once
            if (state && state.gameState === 'playing') {
                const status = this.$('#game-status-text');
                if (status) status.innerText = "LIVE COMBAT";
            } else if (state && state.gameState === 'finished') {
                // handled by renderer, but maybe update HUD text
                const status = this.$('#game-status-text');
                if (status) status.innerText = "MISSION COMPLETE";
            }
        });
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        GameService.getInstance().handleKeyDown(e.key);
    }

    private handleKeyUp = (e: KeyboardEvent) => {
        GameService.getInstance().handleKeyUp(e.key);
    }

    private exitGame(): void {
        const setup = GameStateService.getInstance().getSetup();
        GameService.getInstance().disconnect();

        let nextRoute = '/';
        if (setup && (setup as any).tournamentContext) {
            nextRoute = '/tournament';
        }

        GameStateService.getInstance().clearSetup();
        App.getInstance().router.navigateTo(nextRoute);
    }

    onDestroy(): void {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        GameService.getInstance().disconnect();
    }
}
