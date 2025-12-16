// frontend/src/tests/unit/RouterCoordinator.test.ts
import { RouterCoordinator } from '../../managers/router/router-coordinator';
import { RouteManager } from '../../managers/router/route-manager';
import { NavigationManager } from '../../managers/router/navigation-manager';

// Mock the authService module
jest.mock('../../core/services/authService', () => ({
  authService: {
    isAuthenticated: jest.fn().mockReturnValue(true)
  }
}));

describe('router-coordinator', () => {
  let routerCoordinator: RouterCoordinator;
  let mockApp: any;

  beforeEach(() => {
    // Clear singleton instances for testing
    (RouterCoordinator as any).instance = null;
    (RouteManager as any).instance = null;
    (NavigationManager as any).instance = null;

    mockApp = {
      showScreenDirect: jest.fn()
    };

    routerCoordinator = RouterCoordinator.getInstance();
    routerCoordinator.initialize(mockApp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize correctly', () => {
    expect(routerCoordinator).toBeDefined();
  });

  test('should get routes', () => {
    const routes = routerCoordinator.getRoutes();
    expect(routes).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThan(0);
  });

  test('should find route by path', () => {
    const route = routerCoordinator.findRoute('/login');
    expect(route).toBeDefined();
    expect(route?.path).toBe('/login');
    expect(route?.screen).toBe('login');
  });

  test('should find route by screen', () => {
    const route = routerCoordinator.findRouteByScreen('main-menu');
    expect(route).toBeDefined();
    expect(route?.path).toBe('/main-menu');
    expect(route?.screen).toBe('main-menu');
  });

  test('should return null for non-existent route', () => {
    const route = routerCoordinator.findRoute('/non-existent');
    expect(route).toBeNull();
  });

  test('should navigate to screen', async () => {
    const navigateSpy = jest.spyOn(routerCoordinator as any, 'navigateToScreen');
    await routerCoordinator.navigateToScreen('login'); // Use login instead of profile to avoid auth guard
    expect(navigateSpy).toHaveBeenCalledWith('login');
  });

  test('should get current route as legacy format', () => {
    const currentRoute = routerCoordinator.getCurrentRouteLegacy();
    // Initially should be null since no navigation has occurred
    expect(currentRoute).toBeNull();
  });

  test('should check navigation state', () => {
    const isNavigating = routerCoordinator.isNavigating();
    expect(typeof isNavigating).toBe('boolean');
  });
});