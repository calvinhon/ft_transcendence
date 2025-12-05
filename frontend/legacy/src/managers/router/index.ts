// frontend/src/managers/router/index.ts
export { RouteManager, type RouteConfig, type RouteGuard } from './route-manager';
export { NavigationManager, type NavigationOptions } from './navigation-manager';
export { RouterCoordinator } from './router-coordinator';

// Singleton instances for easy access
import { RouteManager } from './route-manager';
import { NavigationManager } from './navigation-manager';
import { RouterCoordinator } from './router-coordinator';

export const routeManager = RouteManager.getInstance();
export const navigationManager = NavigationManager.getInstance();
export const routerCoordinator = RouterCoordinator.getInstance();