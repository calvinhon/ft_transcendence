import { AbstractComponent } from "../components/AbstractComponent";

type RouteHandler = () => Promise<AbstractComponent>;

interface RouteOptions {
    requiresAuth?: boolean;
}

interface Route {
    path: string;
    handler: RouteHandler;
    options?: RouteOptions;
}

export class Router {
    private routes: Route[] = [];
    private currentComponent: AbstractComponent | null = null;
    private appContainer: HTMLElement;

    constructor(appContainerId: string = 'page-content') {
        const el = document.getElementById(appContainerId);
        if (!el) throw new Error(`App container #${appContainerId} not found`);
        this.appContainer = el;

        window.addEventListener('popstate', () => this.handleRoute());

        // Intercept global clicks for SPA navigation
        document.addEventListener('click', (e) => {
            const target = (e.target as HTMLElement).closest('a');
            if (target && target.matches('[data-link]')) {
                e.preventDefault();
                this.navigateTo(target.getAttribute('href')!);
            }
        });
    }

    public addRoute(path: string, handler: RouteHandler, options?: RouteOptions): void {
        this.routes.push({ path, handler, options });
    }

    public navigateTo(path: string): void {
        history.pushState(null, '', path);
        this.handleRoute();
    }

    private async handleRoute(): Promise<void> {
        const path = window.location.pathname;

        // Simple exact match for now
        let route = this.routes.find(r => r.path === path);

        // 404 Fallback - show ErrorPage for unknown routes
        if (!route) {
            // Cleanup old component
            if (this.currentComponent) {
                this.currentComponent.onDestroy();
            }

            // Dynamic import to avoid circular dependencies
            const { ErrorPage } = await import('../pages/ErrorPage');
            this.currentComponent = new ErrorPage(404, 'Page Not Found');
            this.currentComponent.setContainer(this.appContainer); // Set container
            this.appContainer.innerHTML = this.currentComponent.getHtml();
            this.currentComponent.onMounted();
            return;
        }

        // Auth Guard
        if (route.options?.requiresAuth) {
            // Need to import AuthService dynamically or assume global/singleton access works if imported at top
            // Since Router is in core, and AuthService in services, we can import AuthService.
            // But to avoid circular deps if AuthService uses Router (it does: App.router), 
            // we should access it via App or dynamic import.
            // However, AuthService.ts imports App, which imports Router. 
            // Router importing AuthService might be circular: Router -> AuthService -> App -> Router.
            // Safe bet: Dynamic import or depend on global state if necessary, 
            // OR checks are done via a passed callback. But plan said AuthService.
            // Let's try dynamic import of AuthService to be safe.
            const { AuthService } = await import('../services/AuthService');
            if (!AuthService.getInstance().getCurrentUser()) {
                console.warn(`[Router] Access denied to ${path}. Redirecting to /login`);
                history.replaceState(null, '', '/login');
                // Restart routing for /login
                return this.handleRoute();
            }
        }

        // Cleanup old component
        if (this.currentComponent) {
            this.currentComponent.onDestroy();
        }

        // Load new component
        this.currentComponent = await route.handler();
        this.currentComponent.setContainer(this.appContainer); // Set container

        // Inject HTML
        this.appContainer.innerHTML = this.currentComponent.getHtml();

        // Mount lifecycle
        this.currentComponent.onMounted();
    }

    public async init(): Promise<void> {
        await this.handleRoute();
    }
}
