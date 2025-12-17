export abstract class AbstractComponent {
    protected element: HTMLElement | null = null;

    protected container?: HTMLElement;

    constructor() { }

    /**
     * Returns the HTML string for this component.
     */
    public abstract getHtml(): string;

    /**
     * Called after the component's HTML is injected into the DOM.
     * Use this to attach event listeners.
     */
    public onMounted(): void { }

    /**
     * Called before the component is removed.
     * Use this to clean up listeners.
     */
    public onDestroy(): void { }

    /**
     * Sets the document title with a prefix.
     * @param title The specific title for the current page/component.
     */
    protected setTitle(title: string): void {
        document.title = `Spiritual Ascension - ${title}`;
    }

    /**
     * Helper to safely find an element within this component.
     */
    protected $(selector: string): HTMLElement | null {
        return this.element ? this.element.querySelector(selector) : document.querySelector(selector);
    }
}
