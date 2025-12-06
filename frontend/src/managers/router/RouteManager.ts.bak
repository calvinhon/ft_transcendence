// frontend/src/managers/router/RouteManager.ts
import { Route } from '../../types';
import { authService } from '../../core/authService';

export interface RouteGuard {
  canActivate: (route: Route) => boolean;
  redirectTo?: string;
}

export interface RouteConfig extends Route {
  guards?: RouteGuard[];
  data?: Record<string, any>;
}

export class RouteManager {
  private static instance: RouteManager;
  private routes: RouteConfig[] = [];
  private routeGuards: RouteGuard[] = [];

  private constructor() {
    this.initializeRoutes();
  }

  public static getInstance(): RouteManager {
    if (!RouteManager.instance) {
      RouteManager.instance = new RouteManager();
    }
    return RouteManager.instance;
  }

  private initializeRoutes(): void {
    this.routes = [
      {
        path: '/',
        screen: 'login',
        requiresAuth: false,
        title: 'SpritualAscension - Login',
        guards: []
      },
      {
        path: '/login',
        screen: 'login',
        requiresAuth: false,
        title: 'SpritualAscension - Login',
        guards: []
      },
      {
        path: '/register',
        screen: 'register',
        requiresAuth: false,
        title: 'SpritualAscension - Register',
        guards: []
      },
      {
        path: '/forgot-password',
        screen: 'forgot-password',
        requiresAuth: false,
        title: 'SpritualAscension - Reset Password',
        guards: []
      },
      {
        path: '/main-menu',
        screen: 'main-menu',
        requiresAuth: true,
        title: 'SpritualAscension - Main Menu',
        guards: [this.createAuthGuard()]
      },
      {
        path: '/play',
        screen: 'play-config',
        requiresAuth: true,
        title: 'SpritualAscension - Game Setup',
        guards: [this.createAuthGuard()]
      },
      {
        path: '/profile',
        screen: 'profile',
        requiresAuth: true,
        title: 'SpritualAscension - Profile',
        guards: [this.createAuthGuard()]
      },
      {
        path: '/settings',
        screen: 'settings',
        requiresAuth: true,
        title: 'SpritualAscension - Settings',
        guards: [this.createAuthGuard()]
      },
      {
        path: '/game',
        screen: 'game',
        requiresAuth: true,
        title: 'SpritualAscension - Playing',
        guards: [this.createAuthGuard()]
      }
    ];
  }

  private createAuthGuard(): RouteGuard {
    return {
      canActivate: (route: Route): boolean => {
        if (!route.requiresAuth) return true;

        // Check authentication status
        return authService && authService.isAuthenticated && authService.isAuthenticated();
      },
      redirectTo: '/login'
    };
  }

  public getRoutes(): RouteConfig[] {
    return [...this.routes];
  }

  public findRoute(path: string): RouteConfig | null {
    return this.routes.find(route => route.path === path) || null;
  }

  public findRouteByScreen(screen: string): RouteConfig | null {
    return this.routes.find(route => route.screen === screen) || null;
  }

  public canActivateRoute(route: RouteConfig): { canActivate: boolean; redirectTo?: string } {
    if (!route.guards || route.guards.length === 0) {
      return { canActivate: true };
    }

    for (const guard of route.guards) {
      if (!guard.canActivate(route)) {
        return { canActivate: false, redirectTo: guard.redirectTo };
      }
    }

    return { canActivate: true };
  }

  public addRoute(route: RouteConfig): void {
    this.routes.push(route);
  }

  public removeRoute(path: string): void {
    this.routes = this.routes.filter(route => route.path !== path);
  }

  public updateRoute(path: string, updates: Partial<RouteConfig>): void {
    const index = this.routes.findIndex(route => route.path === path);
    if (index !== -1) {
      this.routes[index] = { ...this.routes[index], ...updates };
    }
  }

  public getInitialRoute(): string {
    const path = window.location.pathname;
    const route = this.findRoute(path);

    if (route) {
      const guardResult = this.canActivateRoute(route);
      if (!guardResult.canActivate && guardResult.redirectTo) {
        return guardResult.redirectTo;
      }
      return path;
    }

    return '/login';
  }
}