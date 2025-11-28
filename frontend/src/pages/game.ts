export class GamePage {
    private router: any;
    private app: any;

    constructor(router: any, app: any) {
        this.router = router;
        this.app = app;
    }

    init(): void {
        document.getElementById('stop-game-btn')?.addEventListener('click', () => {
            this.app.stopGame();
        });

        document.getElementById('pause-game-btn')?.addEventListener('click', () => {
            this.app.pauseGame();
        });
    }

    cleanup(): void {
        // Game cleanup is likely handled by GameManager.stopGame() which might be called here or on navigation
        // But we should ensure we don't leave the game running if we navigate away via back button
    }
}
