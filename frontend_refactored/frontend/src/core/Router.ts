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

    constructor(appContainerId: string = 'app') {
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

        // Fallback or 404
        if (!route) {
            route = this.routes.find(r => r.path === '/') || this.routes[0];
        }

        if (route) {
            // Cleanup old component
            if (this.currentComponent) {
                this.currentComponent.onDestroy();
            }

            // Load new component
            this.currentComponent = await route.handler();

            // Inject HTML
            this.appContainer.innerHTML = this.currentComponent.getHtml();

            // Mount lifecycle
            this.currentComponent.onMounted();
        }
    }

    public init(): void {
        this.handleRoute();
    }
}
