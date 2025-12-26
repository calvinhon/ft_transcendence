import { AbstractComponent } from "../components/AbstractComponent";

type RouteHandler = () => Promise<AbstractComponent>;

interface Route {
    path: string;
    handler: RouteHandler;
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

    public addRoute(path: string, handler: RouteHandler): void {
        this.routes.push({ path, handler });
    }

    public navigateTo(path: string): void {
        history.pushState(null, '', path);
        this.handleRoute();
    }

    private async handleRoute(): Promise<void> {
        const path = window.location.pathname;

        // Simple exact match for now
        // TODO: Add regex support if needed
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
