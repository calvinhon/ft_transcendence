import { showToast } from '../toast';
import { showLocalPlayerLoginModal } from '../local-player';
import { getCoopLevel } from '../state';

export class PlayConfigPage {
    private router: any;
    private app: any; // Reference to main App for shared state if needed, or we move state here

    constructor(router: any, app: any) {
        this.router = router;
        this.app = app;
    }

    init(): void {
        // Back button
        document.getElementById('back-to-main-btn')?.addEventListener('click', () => {
            this.router.navigate('main-menu');
        });

        // Start game button
        document.getElementById('start-game-btn')?.addEventListener('click', () => {
            this.app.startGame();
        });

        // Game mode tabs
        document.querySelectorAll('.game-mode-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                this.app.handleGameModeChange(tab as HTMLElement);
            });
        });

        // Config options
        document.querySelectorAll('.config-option, .setting-option').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.app.handleConfigOption(btn as HTMLElement);
            });
        });

        // Score increment/decrement
        document.getElementById('score-increment')?.addEventListener('click', () => {
            this.app.changeScoreToWin(1);
        });
        document.getElementById('score-decrement')?.addEventListener('click', () => {
            this.app.changeScoreToWin(-1);
        });

        // Checkboxes
        document.getElementById('powerups-enabled')?.addEventListener('change', (e) => {
            this.app.gameSettings.powerupsEnabled = (e.target as HTMLInputElement).checked;
        });
        document.getElementById('accelerate-on-hit')?.addEventListener('change', (e) => {
            this.app.gameSettings.accelerateOnHit = (e.target as HTMLInputElement).checked;
        });

        // Initialize UI
        const defaultTab = document.querySelector('.game-mode-tab.active') as HTMLElement;
        if (defaultTab) {
            this.app.handleGameModeChange(defaultTab);
        } else {
            // Default to coop if no tab is active (fallback)
            const coopTab = document.querySelector('.game-mode-tab[data-mode="coop"]') as HTMLElement;
            if (coopTab) this.app.handleGameModeChange(coopTab);
        }

        this.setupAddPlayerButtons();
    }

    cleanup(): void { }

    private setupAddPlayerButtons() {
        // TEAM 1 add player button
        const addTeam1Btn = document.getElementById('add-team1-player-btn');
        if (addTeam1Btn) {
            addTeam1Btn.addEventListener('click', () => {
                (window as any).addPlayerTeam = 1;
                showLocalPlayerLoginModal();
            });
        }

        // TEAM 2 add player button
        const addTeam2Btn = document.getElementById('add-team2-player-btn');
        if (addTeam2Btn) {
            addTeam2Btn.addEventListener('click', () => {
                (window as any).addPlayerTeam = 2;
                showLocalPlayerLoginModal();
            });
        }

        // Tournament add player button
        const addTournamentPlayerBtn = document.getElementById('add-tournament-player-btn');
        if (addTournamentPlayerBtn) {
            addTournamentPlayerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                (window as any).addPlayerTeam = 'tournament';
                showLocalPlayerLoginModal();
            });
        }
    }
}
