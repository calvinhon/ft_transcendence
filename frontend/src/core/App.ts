import { Router } from './Router';
import { User } from '../types';
import { AuthService } from '../services/AuthService';

enum StartState {
    SUCCESS,
    LOADING,
    FAILED
}

export class App {
    private static instance: App;
    public router: Router;
    public currentUser: User | null = null;

    private constructor() {
        this.router = new Router();
        this.setupRoutes();
    }

    public static getInstance(): App {
        if (!App.instance) {
            App.instance = new App();
        }
        return App.instance;
    }

    private setupRoutes(): void {
        // Guarded Home Route
        this.router.addRoute('/', async () => {
            // 1. Check Auth Layer FIRST
            // Since we support cookie auth, token might not be in localStorage.
            // Check currentUser instead (populated by checkSession).
            if (!AuthService.getInstance().getCurrentUser()) {
                const { LoginPage } = await import('../pages/LoginPage');
                return new LoginPage();
            }

            // 2. If Auth, then check campaign status
            const initialized = localStorage.getItem('ft_transcendence_initialized');
            if (!initialized) {
                const { LaunchSeqPage } = await import('../pages/LaunchSeqPage');
                return new LaunchSeqPage();
            }

            // 3. Otherwise Main Menu
            const { MainMenuPage } = await import('../pages/MainMenuPage');
            return new MainMenuPage();
        });

        this.router.addRoute('/tournament', async () => {
            const { TournamentBracketPage } = await import('../pages/TournamentBracketPage');
            return new TournamentBracketPage();
        }, { requiresAuth: true });

        this.router.addRoute('/main-menu', async () => {
            const { MainMenuPage } = await import('../pages/MainMenuPage');
            return new MainMenuPage();
        }, { requiresAuth: true });

        this.router.addRoute('/login', async () => {
            const { LoginPage } = await import('../pages/LoginPage');
            return new LoginPage();
        });

        this.router.addRoute('/register', async () => {
            const { RegisterPage } = await import('../pages/RegisterPage');
            return new RegisterPage();
        });

        this.router.addRoute('/match-details', async () => {
            const { MatchDetailsPage } = await import('../pages/MatchDetailsPage');
            return new MatchDetailsPage();
        }, { requiresAuth: true });

        this.router.addRoute('/game', async () => {
            const { GamePage } = await import('../pages/GamePage');
            return new GamePage();
        }, { requiresAuth: true });

        this.router.addRoute('/profile', async () => {
            const { ProfilePage } = await import('../pages/ProfilePage');
            return new ProfilePage();
        }, { requiresAuth: true });

        this.router.addRoute('/oauth/callback', async () => {
            const { OAuthCallbackPage } = await import('../pages/OAuthCallbackPage');
            return new OAuthCallbackPage();
        });

        this.router.addRoute('/settings', async () => {
            const { SettingsPage } = await import('../pages/SettingsPage');
            return new SettingsPage();
        }, { requiresAuth: true });

        // Global Navigation Interceptor - REMOVED
        // The Router now handles route guards internally via handleRoute().
        // This prevents double verification/conflicts.
    }

    public async start(): Promise<StartState> {
        // Remove loading screen
        const loading = document.getElementById('loading');
        if (loading) loading.remove();

        // Check initial session first to avoid redirect loops
        let res = await AuthService.getInstance().checkSession();

        // Wait for the router to finish the initial render
        await this.router.init();

        (window as any).app = this;

        if (res) {
            return Promise.resolve(StartState.SUCCESS);
        }

        return Promise.reject(StartState.FAILED);
    }
}
