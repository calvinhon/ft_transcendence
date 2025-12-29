/**
 * WebGLService - Manages WebGL detection and 3D mode preferences
 * 
 * Provides:
 * - WebGL support detection
 * - User preference for 3D mode (stored in localStorage)
 * - Combined check for whether 3D mode should be active
 */
export class WebGLService {
    private static instance: WebGLService;
    private static readonly STORAGE_KEY = 'ft_3d_mode_enabled';

    private webglSupported: boolean;
    private userPreference: boolean | null = null; // null = not set yet

    private constructor() {
        this.webglSupported = this.detectWebGL();
        this.loadUserPreference();

        // Auto-enable 3D mode on first visit if WebGL is supported
        if (this.userPreference === null && this.webglSupported) {
            this.set3DModeEnabled(true);
        }
    }

    public static getInstance(): WebGLService {
        if (!WebGLService.instance) {
            WebGLService.instance = new WebGLService();
        }
        return WebGLService.instance;
    }

    /**
     * Detects if WebGL is supported by the browser
     */
    private detectWebGL(): boolean {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            console.warn('[WebGLService] WebGL detection failed:', e);
            return false;
        }
    }

    /**
     * Loads user preference from localStorage
     */
    private loadUserPreference(): void {
        const stored = localStorage.getItem(WebGLService.STORAGE_KEY);
        if (stored !== null) {
            this.userPreference = stored === 'true';
        }
    }

    /**
     * Returns true if the browser supports WebGL
     */
    public isWebGLSupported(): boolean {
        return this.webglSupported;
    }

    /**
     * Returns true if 3D mode should be active
     * (WebGL is supported AND user has not disabled it)
     */
    public is3DModeEnabled(): boolean {
        // If WebGL is not supported, 3D mode is never enabled
        if (!this.webglSupported) {
            return false;
        }

        // If user has explicitly set preference, use it
        if (this.userPreference !== null) {
            return this.userPreference;
        }

        // Default: enabled if WebGL is supported
        return true;
    }

    /**
     * Sets user preference for 3D mode
     */
    public set3DModeEnabled(enabled: boolean): void {
        this.userPreference = enabled;
        localStorage.setItem(WebGLService.STORAGE_KEY, enabled.toString());
    }

    /**
     * Gets the raw user preference (null if never set)
     */
    public getUserPreference(): boolean | null {
        return this.userPreference;
    }
}
