// Multi-page routing logic
import { Route } from './types';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';
import { ForgotPasswordPage } from './pages/forgot-password';
import { MainMenuPage } from './pages/main-menu';
import { PlayConfigPage } from './pages/play-config';
import { GamePage } from './pages/game';
import { SettingsPage } from './pages/settings';
import { ProfilePage } from './pages/profile';

export class Router {
  private routes: Route[] = [];
  private currentRoute: Route | null = null;
  private app: any;
  private currentPage: any = null;

  constructor(app: any) {
    this.app = app;
    this.setupRoutes();
    this.setupEventListeners();
  }

  private setupRoutes(): void {
    this.routes = [
      { path: '/', screen: 'login', requiresAuth: false, title: 'SpritualAscension - Login' },
      { path: '/login', screen: 'login', requiresAuth: false, title: 'SpritualAscension - Login' },
      { path: '/register', screen: 'register', requiresAuth: false, title: 'SpritualAscension - Register' },
      { path: '/forgot-password', screen: 'forgot-password', requiresAuth: false, title: 'SpritualAscension - Reset Password' },
      { path: '/main-menu', screen: 'main-menu', requiresAuth: true, title: 'SpritualAscension - Main Menu' },
      { path: '/play', screen: 'play-config', requiresAuth: true, title: 'SpritualAscension - Game Setup' },
      { path: '/profile', screen: 'profile', requiresAuth: true, title: 'SpritualAscension - Profile' },
      { path: '/settings', screen: 'settings', requiresAuth: true, title: 'SpritualAscension - Settings' },
      { path: '/game', screen: 'game', requiresAuth: true, title: 'SpritualAscension - Playing' }
    ];
  }

  private setupEventListeners(): void {
    window.addEventListener('popstate', (e) => {
      const path = e.state?.path || window.location.pathname;
      this.navigateToPath(path, false);
    });
  }

  async navigateToPath(path: string, pushState: boolean = true): Promise<void> {
    const route = this.findRoute(path);
    if (!route) {
      this.navigateToPath('/login');
      return;
    }

    // Check authentication before navigation
    if (route.requiresAuth && !this.app.isAuthenticated()) {
      this.navigateToPath('/login');
      return;
    }

    // Update URL
    if (pushState) {
      window.history.pushState({ path }, route.title, path);
    }
    document.title = route.title;
    this.currentRoute = route;

    // Fetch and inject HTML content
    await this.loadPageContent(route.screen);
  }

  private async loadPageContent(screen: string): Promise<void> {
    let fileName: string;
    switch (screen) {
      case 'login': fileName = 'login.html'; break;
      case 'register': fileName = 'register.html'; break;
      case 'forgot-password': fileName = 'forgot-password.html'; break;
      case 'main-menu': fileName = 'main-menu.html'; break;
      case 'play-config': fileName = 'play-config.html'; break;
      case 'game': fileName = 'game.html'; break;
      case 'settings': fileName = 'settings.html'; break;
      case 'profile': fileName = 'profile.html'; break;
      default: fileName = 'login.html';
    }

    try {
      const response = await fetch(`./${fileName}`);
      if (!response.ok) throw new Error(`Failed to load ${fileName}`);
      const htmlText = await response.text();

      // Parse HTML and extract #app content
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const newAppContent = doc.getElementById('app')?.innerHTML;

      if (newAppContent) {
        // Cleanup previous page
        if (this.currentPage && typeof this.currentPage.cleanup === 'function') {
          this.currentPage.cleanup();
        }

        // Inject new content
        const appElement = document.getElementById('app');
        if (appElement) {
          appElement.innerHTML = newAppContent;

          // Add 'active' class to the screen div to make it visible
          const screenElement = appElement.querySelector('.screen');
          if (screenElement) {
            // First remove 'active' class from any other screen that might have it
            const allScreens = appElement.querySelectorAll('.screen');
            allScreens.forEach(scr => scr.classList.remove('active'));
            // Then add 'active' class to the current screen
            screenElement.classList.add('active');
          }
        }

        // Initialize new page logic
        this.initPageLogic(screen);
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }

  private initPageLogic(screen: string): void {
    switch (screen) {
      case 'login':
        this.currentPage = new LoginPage(this);
        break;
      case 'register':
        this.currentPage = new RegisterPage(this);
        break;
      case 'forgot-password':
        this.currentPage = new ForgotPasswordPage(this);
        break;
      case 'main-menu':
        this.currentPage = new MainMenuPage(this);
        break;
      case 'play-config':
        this.currentPage = new PlayConfigPage(this, this.app);
        break;
      case 'game':
        this.currentPage = new GamePage(this, this.app);
        break;
      case 'settings':
        this.currentPage = new SettingsPage(this);
        break;
      case 'profile':
        this.currentPage = new ProfilePage(this, this.app);
        break;
      default:
        this.currentPage = null;
    }

    if (this.currentPage) {
      this.currentPage.init();
    }
  }

  private findRoute(path: string): Route | null {
    // Handle root path redirect to login or main menu based on auth
    if (path === '/') return this.routes.find(r => r.path === '/login') || null;
    return this.routes.find(route => route.path === path) || null;
  }

  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }

  navigate(screen: string): void {
    const route = this.routes.find(r => r.screen === screen);
    if (route) {
      this.navigateToPath(route.path);
    }
  }

  getInitialRoute(): string {
    const path = window.location.pathname;
    // If path is just / or /index.html, default to login or main menu
    if (path === '/' || path === '/index.html') return '/login';

    const route = this.findRoute(path);
    if (route) {
      if (route.requiresAuth && !this.app.isAuthenticated()) {
        return '/login';
      }
      return path;
    }
    return '/login';
  }
}
