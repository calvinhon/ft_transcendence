// frontend/src/managers/router/RouterCoordinator.ts
import { RouteManager, RouteConfig } from './route-manager';
import { NavigationManager, NavigationOptions } from './navigation-manager';
import { Route } from '../../types';

export class RouterCoordinator {
  private static instance: RouterCoordinator;
  private routeManager: RouteManager;
  private navigationManager: NavigationManager;
  private app: any;

  private constructor() {
    this.routeManager = RouteManager.getInstance();
    this.navigationManager = NavigationManager.getInstance();
  }

  public static getInstance(): RouterCoordinator {
    if (!RouterCoordinator.instance) {
      RouterCoordinator.instance = new RouterCoordinator();
    }
    return RouterCoordinator.instance;
  }

  public initialize(app: any): void {
    this.app = app;

    // Listen for route changes
    window.addEventListener('route-changed', (event: any) => {
      const { route } = event.detail;
      this.app.showScreenDirect(route.screen);
    });
  }

  // Route Management
  public getRoutes(): RouteConfig[] {
    return this.routeManager.getRoutes();
  }

  public findRoute(path: string): RouteConfig | null {
    return this.routeManager.findRoute(path);
  }

  public findRouteByScreen(screen: string): RouteConfig | null {
    return this.routeManager.findRouteByScreen(screen);
  }

  public addRoute(route: RouteConfig): void {
    this.routeManager.addRoute(route);
  }

  public removeRoute(path: string): void {
    this.routeManager.removeRoute(path);
  }

  public updateRoute(path: string, updates: Partial<RouteConfig>): void {
    this.routeManager.updateRoute(path, updates);
  }

  // Navigation
  public async navigateToPath(path: string, options?: NavigationOptions): Promise<void> {
    await this.navigationManager.navigateToPath(path, options);
  }

  public async navigateToScreen(screen: string, options?: NavigationOptions): Promise<void> {
    await this.navigationManager.navigateToScreen(screen, options);
  }

  /**
   * Legacy compatibility: `navigate(screen)` used by older code.
   * Calls async `navigateToScreen` and ignores the returned promise.
   */
  public navigate(screen: string): void {
    // Keep a lightweight warning so developers can see deprecated usage
    // but continue to function.
    // eslint-disable-next-line no-console
    console.warn('[RouterCoordinator] navigate() is deprecated - use navigateToScreen()');
    this.navigateToScreen(screen).catch((err) => {
      // Log error to avoid silent failures
      // eslint-disable-next-line no-console
      console.error('[RouterCoordinator] navigate() wrapper failed', err);
    });
  }

  public goBack(): void {
    this.navigationManager.goBack();
  }

  public goForward(): void {
    this.navigationManager.goForward();
  }

  // State
  public getCurrentRoute(): RouteConfig | null {
    return this.navigationManager.getCurrentRoute();
  }

  public getNavigationHistory(): string[] {
    return this.navigationManager.getNavigationHistory();
  }

  public clearHistory(): void {
    this.navigationManager.clearHistory();
  }

  public isNavigating(): boolean {
    return this.navigationManager.isCurrentlyNavigating();
  }

  // Legacy compatibility methods
  public getInitialRoute(): string {
    return this.routeManager.getInitialRoute();
  }

  // Convert to legacy Route interface for backward compatibility
  public getCurrentRouteLegacy(): Route | null {
    const current = this.getCurrentRoute();
    if (!current) return null;

    return {
      path: current.path,
      screen: current.screen,
      requiresAuth: current.requiresAuth,
      title: current.title
    };
  }
}