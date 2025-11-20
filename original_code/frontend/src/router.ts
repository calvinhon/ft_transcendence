// SPA routing logic
import { Route } from './types';

export class Router {
  private routes: Route[] = [];
  private currentRoute: Route | null = null;
  private app: any;

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

  navigateToPath(path: string, pushState: boolean = true): void {
    const route = this.findRoute(path);
    if (!route) {
      this.navigateToPath('/login');
      return;
    }
    if (pushState) {
      window.history.pushState({ path }, route.title, path);
    }
    document.title = route.title;
    this.currentRoute = route;
    this.app.showScreenDirect(route.screen);
  }

  private findRoute(path: string): Route | null {
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
