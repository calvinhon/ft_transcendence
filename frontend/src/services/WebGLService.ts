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
  private static readonly STORAGE_KEY_3D_MODE = "ft_3d_mode_enabled";
  private static readonly STORAGE_KEY_POST_PROCESSING =
    "ft_post_processing_enabled";

  private webglSupported: boolean;
  private userPreference3DMode: boolean | null = null; // null = not set yet
  private userPreferencePostProcessing: boolean = false; // Default to disabled

  private constructor() {
    this.webglSupported = this.detectWebGL();
    this.loadUserPreferences();

    console.log("[WebGLService] WebGL supported:", this.webglSupported);
    console.log(
      "[WebGLService] 3D Mode preference:",
      this.userPreference3DMode
    );
    console.log(
      "[WebGLService] Post-Processing preference:",
      this.userPreferencePostProcessing
    );

    // Auto-enable 3D mode on first visit if WebGL is supported
    if (this.userPreference3DMode === null && this.webglSupported) {
      console.log("[WebGLService] First visit - auto-enabling 3D mode");
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
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      return !!gl;
    } catch (e) {
      console.warn("[WebGLService] WebGL detection failed:", e);
      return false;
    }
  }

  /**
   * Loads user preferences from localStorage
   */
  private loadUserPreferences(): void {
    const stored3D = localStorage.getItem(WebGLService.STORAGE_KEY_3D_MODE);
    if (stored3D !== null) {
      this.userPreference3DMode = stored3D === "true";
    }

    const storedPostProcessing = localStorage.getItem(
      WebGLService.STORAGE_KEY_POST_PROCESSING
    );
    if (storedPostProcessing !== null) {
      this.userPreferencePostProcessing = storedPostProcessing === "true";
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
    if (this.userPreference3DMode !== null) {
      return this.userPreference3DMode;
    }

    // Default: enabled if WebGL is supported
    return true;
  }

  /**
   * Sets user preference for 3D mode
   */
  public set3DModeEnabled(enabled: boolean): void {
    this.userPreference3DMode = enabled;
    localStorage.setItem(WebGLService.STORAGE_KEY_3D_MODE, enabled.toString());
  }

  /**
   * Returns true if post-processing effects should be active
   */
  public isPostProcessingEnabled(): boolean {
    return this.userPreferencePostProcessing;
  }

  /**
   * Sets user preference for post-processing effects
   */
  public setPostProcessingEnabled(enabled: boolean): void {
    this.userPreferencePostProcessing = enabled;
    localStorage.setItem(
      WebGLService.STORAGE_KEY_POST_PROCESSING,
      enabled.toString()
    );
  }

  /**
   * Gets the raw user preference for 3D mode (null if never set)
   */
  public getUserPreference3DMode(): boolean | null {
    return this.userPreference3DMode;
  }

  /**
   * Debug/reset: Clear all preferences from localStorage
   */
  public resetAllPreferences(): void {
    localStorage.removeItem(WebGLService.STORAGE_KEY_3D_MODE);
    localStorage.removeItem(WebGLService.STORAGE_KEY_POST_PROCESSING);
    this.userPreference3DMode = null;
    this.userPreferencePostProcessing = false;
    console.log("[WebGLService] All preferences reset");
  }
}
