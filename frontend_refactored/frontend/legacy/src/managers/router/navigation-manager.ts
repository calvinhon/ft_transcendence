// frontend/src/managers/router/NavigationManager.ts
import { RouteConfig, RouteManager } from './route-manager';

export interface NavigationOptions {
  replace?: boolean;
  skipGuards?: boolean;
  state?: any;
}

export class NavigationManager {
  private static instance: NavigationManager;
  private navigationHistory: string[] = [];
  private currentRoute: RouteConfig | null = null;
  private isNavigating: boolean = false;

  private constructor() {
    this.setupBrowserNavigation();
  }

  public static getInstance(): NavigationManager {
    if (!NavigationManager.instance) {
      NavigationManager.instance = new NavigationManager();
    }
    return NavigationManager.instance;
  }

  private setupBrowserNavigation(): void {
    window.addEventListener('popstate', (event) => {
      const path = event.state?.path || window.location.pathname;
      this.handleBrowserNavigation(path, false);
    });
  }

  private async handleBrowserNavigation(path: string, pushState: boolean = true): Promise<void> {
    if (this.isNavigating) return;

    this.isNavigating = true;
    try {
      const routeManager = RouteManager.getInstance();
      const route = routeManager.findRoute(path);

      if (!route) {
        console.warn(`Route not found: ${path}, redirecting to login`);
        this.navigateToPath('/login');
        return;
      }

      const guardResult = routeManager.canActivateRoute(route);
      if (!guardResult.canActivate) {
        console.warn(`Route guard failed for ${path}, redirecting to ${guardResult.redirectTo}`);
        if (guardResult.redirectTo) {
          this.navigateToPath(guardResult.redirectTo);
        }
        return;
      }

      if (pushState) {
        window.history.pushState({ path, timestamp: Date.now() }, route.title, path);
        this.navigationHistory.push(path);
      }

      document.title = route.title;
      this.currentRoute = route;

      // Dispatch navigation event
      window.dispatchEvent(new CustomEvent('route-changed', {
        detail: { route, path }
      }));

    } finally {
      this.isNavigating = false;
    }
  }

  public async navigateToPath(path: string, options: NavigationOptions = {}): Promise<void> {
    const { replace = false, skipGuards = false } = options;

    if (replace) {
      window.history.replaceState({ path }, '', path);
    } else {
      await this.handleBrowserNavigation(path, !replace);
    }
  }

  public async navigateToScreen(screen: string, options: NavigationOptions = {}): Promise<void> {
    const routeManager = RouteManager.getInstance();
    const route = routeManager.findRouteByScreen(screen);

    if (route) {
      await this.navigateToPath(route.path, options);
    } else {
      console.warn(`Screen not found: ${screen}`);
    }
  }

  public goBack(): void {
    if (this.navigationHistory.length > 1) {
      this.navigationHistory.pop(); // Remove current
      const previousPath = this.navigationHistory[this.navigationHistory.length - 1];
      if (previousPath) {
        window.history.back();
      }
    }
  }

  public goForward(): void {
    window.history.forward();
  }

  public getCurrentRoute(): RouteConfig | null {
    return this.currentRoute;
  }

  public getNavigationHistory(): string[] {
    return [...this.navigationHistory];
  }

  public clearHistory(): void {
    this.navigationHistory = [];
  }

  public isCurrentlyNavigating(): boolean {
    return this.isNavigating;
  }
}