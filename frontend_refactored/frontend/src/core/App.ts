import { Router } from './Router';
import { User } from '../types';
import { AuthService } from '../services/AuthService';

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
            const hasToken = !!localStorage.getItem('token');
            if (!hasToken) {
                const { LoginPage } = await import('../pages/LoginPage');
                return new LoginPage();
            }

            // 2. If Auth, then check FTUE
            const initialized = localStorage.getItem('ft_transcendence_initialized');
            if (!initialized) {
                const { LaunchSeqPage } = await import('../pages/LaunchSeqPage');
                return new LaunchSeqPage();
            }

            // 3. Otherwise Main Menu
            const { MainMenuPage } = await import('../pages/MainMenuPage');
            return new MainMenuPage();
        });

        this.router.addRoute('/main-menu', async () => {
            const { MainMenuPage } = await import('../pages/MainMenuPage');
            return new MainMenuPage();
        });

        this.router.addRoute('/login', async () => {
            const { LoginPage } = await import('../pages/LoginPage');
            return new LoginPage();
        });

        this.router.addRoute('/register', async () => {
            const { RegisterPage } = await import('../pages/RegisterPage');
            return new RegisterPage();
        });

        this.router.addRoute('/game', async () => {
            const { GamePage } = await import('../pages/GamePage');
            return new GamePage();
        });

        this.router.addRoute('/profile', async () => {
            const { ProfilePage } = await import('../pages/ProfilePage');
            return new ProfilePage();
        });

        // Global Navigation Interceptor
        const originalNavigate = this.router.navigateTo.bind(this.router);
        this.router.navigateTo = (path: string) => {
            const hasToken = !!localStorage.getItem('token');
            const publicPaths = ['/login', '/register'];

            // If trying to access private route without token, redirect login
            if (!publicPaths.includes(path) && !hasToken) {
                // But wait, if we are already at /login (implicit), don't loop. 
                // The router logic handles the render. But explicit navigation needs check.
                if (window.location.pathname !== '/login') {
                    originalNavigate('/login');
                }
                return;
            }
            originalNavigate(path);
        };
    }

    public async start(): Promise<void> {
        // Remove loading screen
        const loading = document.getElementById('loading');
        if (loading) loading.remove();

        // Check initial session first to avoid redirect loops
        await AuthService.getInstance().checkSession();

        this.router.init();
        (window as any).app = this;
    }
}
