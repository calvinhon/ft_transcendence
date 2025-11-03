// frontend/src/app.ts - TypeScript version of main app controller

// Type definitions
interface User {
  userId: number;
  username: string;
  email?: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
  data?: User;
}

interface GameSettings {
  gameMode: "coop" | "arcade" | "tournament";
  aiDifficulty: "easy" | "medium" | "hard";
  ballSpeed: "slow" | "medium" | "fast";
  paddleSpeed: "slow" | "medium" | "fast";
  powerupsEnabled: boolean;
  accelerateOnHit: boolean;
  scoreToWin?: number; // Only for arcade mode
}

interface LocalPlayer {
  id: string;
  username: string;
  isCurrentUser: boolean;
  userId: number;
  token: string;
}

interface Route {
  path: string;
  screen: string;
  requiresAuth: boolean;
  title: string;
}

// Simple Router class for SPA navigation
class Router {
  private routes: Route[] = [];
  private currentRoute: Route | null = null;
  private app: SpiritualAscensionApp;

  constructor(app: SpiritualAscensionApp) {
    this.app = app;
    this.setupRoutes();
    this.setupEventListeners();
  }

  private setupRoutes(): void {
    this.routes = [
      {
        path: "/",
        screen: "login",
        requiresAuth: false,
        title: "SpritualAscension - Login",
      },
      {
        path: "/login",
        screen: "login",
        requiresAuth: false,
        title: "SpritualAscension - Login",
      },
      {
        path: "/register",
        screen: "register",
        requiresAuth: false,
        title: "SpritualAscension - Register",
      },
      {
        path: "/forgot-password",
        screen: "forgot-password",
        requiresAuth: false,
        title: "SpritualAscension - Reset Password",
      },
      {
        path: "/main-menu",
        screen: "main-menu",
        requiresAuth: true,
        title: "SpritualAscension - Main Menu",
      },
      {
        path: "/play",
        screen: "play-config",
        requiresAuth: true,
        title: "SpritualAscension - Game Setup",
      },
      {
        path: "/profile",
        screen: "profile",
        requiresAuth: true,
        title: "SpritualAscension - Profile",
      },
      {
        path: "/settings",
        screen: "settings",
        requiresAuth: true,
        title: "SpritualAscension - Settings",
      },
      {
        path: "/game",
        screen: "game",
        requiresAuth: true,
        title: "SpritualAscension - Playing",
      },
    ];
  }

  private setupEventListeners(): void {
    // Handle browser back/forward buttons
    window.addEventListener("popstate", (e) => {
      const path = e.state?.path || window.location.pathname;
      this.navigateToPath(path, false); // false = don't push to history
    });
  }

  navigateToPath(path: string, pushState: boolean = true): void {
    const route = this.findRoute(path);
    if (!route) {
      console.warn(`Route not found for path: ${path}`);
      this.navigateToPath("/login");
      return;
    }

    // Check authentication requirement
    if (route.requiresAuth && !this.app.isAuthenticated()) {
      this.navigateToPath("/login");
      return;
    }

    // Update browser history
    if (pushState) {
      window.history.pushState({ path }, route.title, path);
    }

    // Update page title
    document.title = route.title;

    // Show the appropriate screen
    this.currentRoute = route;
    this.app.showScreenDirect(route.screen);
  }

  private findRoute(path: string): Route | null {
    return this.routes.find((route) => route.path === path) || null;
  }

  getCurrentRoute(): Route | null {
    return this.currentRoute;
  }

  // Navigate programmatically (used by the app)
  navigate(screen: string): void {
    const route = this.routes.find((r) => r.screen === screen);
    if (route) {
      this.navigateToPath(route.path);
    }
  }

  // Get initial route based on current URL
  getInitialRoute(): string {
    const path = window.location.pathname;
    const route = this.findRoute(path);

    if (route) {
      if (route.requiresAuth && !this.app.isAuthenticated()) {
        return "/login";
      }
      return path;
    }

    return "/login";
  }
}

class SpiritualAscensionApp {
  /**
   * Submit game results for all selected players (host and local)
   * @param results Array of { userId, stats } for each player
   */
  async submitGameResults(
    results: Array<{ userId: number; stats: any }>
  ): Promise<void> {
    // Host player
    const authManager = (window as any).authManager;
    const hostUser = authManager?.getCurrentUser();
    const hostToken = localStorage.getItem("token");
    if (hostUser && hostToken) {
      await this.submitResultForUser(
        hostUser.userId,
        results.find((r) => r.userId === hostUser.userId)?.stats,
        hostToken
      );
    }

    // Local players
    for (const player of this.localPlayers) {
      if (player.token && player.userId) {
        await this.submitResultForUser(
          player.userId,
          results.find((r) => r.userId === player.userId)?.stats,
          player.token
        );
      }
    }
  }

  /**
   * Submit result for a single user
   */
  async submitResultForUser(
    userId: number,
    stats: any,
    token: string
  ): Promise<void> {
    try {
      const response = await fetch(`/api/game/update-stats/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(stats),
      });
      if (!response.ok) {
        console.error(`Failed to update stats for user ${userId}`);
      }
    } catch (error) {
      console.error(`Error updating stats for user ${userId}:`, error);
    }
  }
  private currentScreen: string = "login";
  private router: Router;
  private gameSettings: GameSettings = {
    gameMode: "coop",
    aiDifficulty: "easy",
    ballSpeed: "medium",
    paddleSpeed: "medium",
    powerupsEnabled: false,
    accelerateOnHit: false,
    scoreToWin: 5,
  };
  private localPlayers: LocalPlayer[] = [];

  // Screen elements
  private loginScreen!: HTMLElement;
  private registerScreen!: HTMLElement;
  private mainMenuScreen!: HTMLElement;
  private playConfigScreen!: HTMLElement;
  private gameScreen!: HTMLElement;
  private settingsScreen!: HTMLElement;

  // Form elements
  private loginForm!: HTMLFormElement;
  private registerForm!: HTMLFormElement;
  private forgotPasswordForm!: HTMLFormElement;

  constructor() {
    this.router = new Router(this);
    this.init();
  }

  async init(): Promise<void> {
    // IMMEDIATELY hide chat widget before any other logic
    this.forceHideChatWidget();

    // Set initial body attribute to login screen
    document.body.setAttribute("data-current-screen", "login");

    // Get screen elements
    this.loginScreen = document.getElementById("login-screen") as HTMLElement;
    this.registerScreen = document.getElementById(
      "register-screen"
    ) as HTMLElement;
    this.mainMenuScreen = document.getElementById(
      "main-menu-screen"
    ) as HTMLElement;
    this.playConfigScreen = document.getElementById(
      "play-config-screen"
    ) as HTMLElement;
    this.gameScreen = document.getElementById("game-screen") as HTMLElement;
    this.settingsScreen = document.getElementById(
      "settings-screen"
    ) as HTMLElement;

    // Get form elements
    this.loginForm = document.getElementById("login-form") as HTMLFormElement;
    this.registerForm = document.getElementById(
      "register-form"
    ) as HTMLFormElement;
    this.forgotPasswordForm = document.getElementById(
      "forgot-password-form"
    ) as HTMLFormElement;

    // Setup all event listeners
    this.setupEventListeners();

    // Setup chat widget (this will also hide it again)
    this.setupChatWidget();

    // Initialize local players with current user
    this.initializeLocalPlayers();

    // Check authentication and update chat visibility
    await this.checkExistingLogin();

    // Navigate to initial route based on URL and auth state
    const initialRoute = this.router.getInitialRoute();
    this.router.navigateToPath(initialRoute, false);
  }

  setupEventListeners(): void {
    // Login form
    this.loginForm.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      this.handleLogin();
    });

    // Register form
    this.registerForm.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      this.handleRegister();
    });

    // Forgot password form
    this.forgotPasswordForm.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      this.handleForgotPassword();
    });

    // Navigation links
    document
      .getElementById("create-account-link")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.router.navigate("register");
      });

    document
      .getElementById("forgot-password-link")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.router.navigate("forgot-password");
      });

    document
      .getElementById("back-to-login-link")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.router.navigate("login");
      });

    document
      .getElementById("back-to-login-from-forgot-link")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.router.navigate("login");
      });

    // Main menu buttons
    document.getElementById("play-btn")?.addEventListener("click", () => {
      this.router.navigate("play-config");
    });

    document.getElementById("profile-btn")?.addEventListener("click", () => {
      this.router.navigate("profile");
    });

    document.getElementById("settings-btn")?.addEventListener("click", () => {
      this.router.navigate("settings");
    });

    document
      .getElementById("main-menu-logout-btn")
      ?.addEventListener("click", () => {
        this.handleLogout();
      });

    // Play config buttons
    document
      .getElementById("back-to-main-btn")
      ?.addEventListener("click", () => {
        this.router.navigate("main-menu");
      });

    document.getElementById("start-game-btn")?.addEventListener("click", () => {
      this.startGame();
    });

    document.getElementById("add-player-btn")?.addEventListener("click", () => {
      this.showAddPlayerDialog();
    });

    // Settings buttons
    document
      .getElementById("back-to-main-settings-btn")
      ?.addEventListener("click", () => {
        this.router.navigate("main-menu");
      });

    document
      .getElementById("back-to-main-settings-bottom-btn")
      ?.addEventListener("click", () => {
        this.router.navigate("main-menu");
      });

    // Profile buttons
    document
      .getElementById("back-to-main-profile-btn")
      ?.addEventListener("click", () => {
        this.router.navigate("main-menu");
      });

    document
      .getElementById("back-to-main-profile-bottom-btn")
      ?.addEventListener("click", () => {
        this.router.navigate("main-menu");
      });

    // Game control buttons
    document.getElementById("stop-game-btn")?.addEventListener("click", () => {
      this.stopGame();
    });

    document.getElementById("pause-game-btn")?.addEventListener("click", () => {
      this.pauseGame();
    });

    // Add Player Modal event listeners
    document
      .getElementById("add-player-form")
      ?.addEventListener("submit", (e) => {
        this.handleAddPlayerSubmit(e);
      });

    document
      .getElementById("close-add-player-modal")
      ?.addEventListener("click", () => {
        this.hideAddPlayerDialog();
      });

    document
      .getElementById("cancel-add-player")
      ?.addEventListener("click", () => {
        this.hideAddPlayerDialog();
      });

    document
      .getElementById("add-player-modal-overlay")
      ?.addEventListener("click", () => {
        this.hideAddPlayerDialog();
      });

    // Config option buttons
    document
      .querySelectorAll(".config-option, .setting-option")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          this.handleConfigOption(btn as HTMLElement);
        });
      });

    // Game mode tabs
    document.querySelectorAll(".game-mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        this.handleGameModeChange(tab as HTMLElement);
      });
    });

    // Initialize the UI with default CO-OP mode
    const defaultTab = document.querySelector(
      ".game-mode-tab.active"
    ) as HTMLElement;
    if (defaultTab) {
      this.handleGameModeChange(defaultTab);
    }

    // Score increment/decrement buttons
    document
      .getElementById("score-increment")
      ?.addEventListener("click", () => {
        this.changeScoreToWin(1);
      });

    document
      .getElementById("score-decrement")
      ?.addEventListener("click", () => {
        this.changeScoreToWin(-1);
      });

    // Checkbox settings
    document
      .getElementById("powerups-enabled")
      ?.addEventListener("change", (e) => {
        this.gameSettings.powerupsEnabled = (
          e.target as HTMLInputElement
        ).checked;
      });

    document
      .getElementById("accelerate-on-hit")
      ?.addEventListener("change", (e) => {
        this.gameSettings.accelerateOnHit = (
          e.target as HTMLInputElement
        ).checked;
      });

    // Global keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Zoom functionality
    this.setupZoomControl();
  }

  setupZoomControl(): void {
    let currentZoom = 1.0;
    const minZoom = 0.5;
    const maxZoom = 3.0;
    const zoomStep = 0.1;

    // Handle Ctrl + Mouse Wheel for zoom
    document.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        // Only zoom when Ctrl key is pressed
        if (e.ctrlKey) {
          e.preventDefault();

          // Determine zoom direction
          const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
          const newZoom = Math.max(
            minZoom,
            Math.min(maxZoom, currentZoom + delta)
          );

          if (newZoom !== currentZoom) {
            currentZoom = newZoom;
            this.applyZoom(currentZoom);
          }
        }
      },
      { passive: false }
    );

    // Handle Ctrl + Plus/Minus for zoom (keyboard shortcuts)
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          const newZoom = Math.min(maxZoom, currentZoom + zoomStep);
          if (newZoom !== currentZoom) {
            currentZoom = newZoom;
            this.applyZoom(currentZoom);
          }
        } else if (e.key === "-") {
          e.preventDefault();
          const newZoom = Math.max(minZoom, currentZoom - zoomStep);
          if (newZoom !== currentZoom) {
            currentZoom = newZoom;
            this.applyZoom(currentZoom);
          }
        } else if (e.key === "0") {
          e.preventDefault();
          currentZoom = 1.0;
          this.applyZoom(currentZoom);
        }
      }
    });
  }

  applyZoom(zoomLevel: number): void {
    const app = document.getElementById("app");
    if (app) {
      app.style.transform = `scale(${zoomLevel})`;
      app.style.transformOrigin = "top left";

      // Adjust body size to accommodate zoom
      document.body.style.width = `${100 / zoomLevel}%`;
      document.body.style.height = `${100 / zoomLevel}%`;

      // Show zoom level indicator (optional)
      this.showZoomIndicator(zoomLevel);
    }
  }

  showZoomIndicator(zoomLevel: number): void {
    // Remove existing indicator
    const existingIndicator = document.getElementById("zoom-indicator");
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Create and show new indicator
    const indicator = document.createElement("div");
    indicator.id = "zoom-indicator";
    indicator.textContent = `${Math.round(zoomLevel * 100)}%`;
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: var(--accent);
      padding: 8px 12px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: 700;
      z-index: 10000;
      border: 1px solid var(--accent);
      box-shadow: 0 0 10px rgba(119, 230, 255, 0.3);
      pointer-events: none;
      transition: opacity 0.3s ease;
    `;

    document.body.appendChild(indicator);

    // Auto-hide after 2 seconds
    setTimeout(() => {
      indicator.style.opacity = "0";
      setTimeout(() => {
        indicator.remove();
      }, 300);
    }, 2000);
  }

  setupKeyboardShortcuts(): void {
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      const currentScreen = document.querySelector(".screen.active")?.id;

      switch (e.key) {
        case "Backspace":
          e.preventDefault();
          this.handleBackspaceShortcut(currentScreen);
          break;

        case "Enter":
          e.preventDefault();
          this.handleEnterShortcut(currentScreen);
          break;
      }
    });
  }

  private handleBackspaceShortcut(currentScreen: string | undefined): void {
    switch (currentScreen) {
      case "register-screen":
      case "forgot-password-screen":
        this.router.navigate("login");
        break;
      case "main-menu-screen":
        this.handleLogout();
        break;
      case "play-config-screen":
      case "settings-screen":
      case "profile-screen":
        this.router.navigate("main-menu");
        break;
      case "game-screen":
        this.stopGame();
        break;
    }
  }

  private handleEnterShortcut(currentScreen: string | undefined): void {
    switch (currentScreen) {
      case "login-screen":
        const loginSubmitBtn = document.querySelector(
          '#login-form button[type="submit"]'
        ) as HTMLButtonElement;
        if (loginSubmitBtn) loginSubmitBtn.click();
        break;

      case "register-screen":
        const registerSubmitBtn = document.querySelector(
          '#register-form button[type="submit"]'
        ) as HTMLButtonElement;
        if (registerSubmitBtn) registerSubmitBtn.click();
        break;

      case "forgot-password-screen":
        const forgotSubmitBtn = document.querySelector(
          '#forgot-password-form button[type="submit"]'
        ) as HTMLButtonElement;
        if (forgotSubmitBtn) forgotSubmitBtn.click();
        break;

      case "main-menu-screen":
        const playBtn = document.getElementById(
          "play-btn"
        ) as HTMLButtonElement;
        if (playBtn) playBtn.click();
        break;

      case "play-config-screen":
        const startGameBtn = document.getElementById(
          "start-game-btn"
        ) as HTMLButtonElement;
        if (startGameBtn) startGameBtn.click();
        break;
    }
  }

  setupChatWidget(): void {
    const chatWidget = document.getElementById("chat-widget");
    const chatButton = document.getElementById("chat-button");
    const chatCloseBtn = document.getElementById("chat-close-btn");

    if (!chatWidget || !chatButton || !chatCloseBtn) return;

    // Show chat button when clicking the chat button
    chatButton.addEventListener("click", () => {
      this.expandChatWidget();
    });

    // Hide chat widget when clicking close button
    chatCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.collapseChatWidget();
    });

    // Handle Enter key in  input
    const chatInput = document.getElementById("chat-input") as HTMLInputElement;
    if (chatInput) {
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const chatForm = document.getElementById(
            "chat-form"
          ) as HTMLFormElement;
          if (chatForm) {
            chatForm.dispatchEvent(new Event("submit"));
          }
        }
      });
    }

    // Handle chat form submission
    const chatForm = document.getElementById("chat-form") as HTMLFormElement;
    if (chatForm) {
      chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.sendChatMessage();
      });
    }

    // Initially hide chat widget and update based on auth status
    this.hideChatWidget();
    this.updateChatVisibility();
  }

  private sendChatMessage(): void {
    const chatInput = document.getElementById("chat-input") as HTMLInputElement;
    const chatMessages = document.getElementById("chat-messages");

    if (chatInput && chatMessages) {
      const message = chatInput.value.trim();
      if (message) {
        // Add message to chat (basic implementation)
        const messageDiv = document.createElement("div");
        messageDiv.className = "chat-message";
        messageDiv.textContent = `You: ${message}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Clear input
        chatInput.value = "";

        // Here you would typically send to WebSocket/server
        console.log("Chat message:", message);
      }
    }
  }

  showChatWidget(): void {
    const chatWidget = document.getElementById("chat-widget");
    if (chatWidget) {
      chatWidget.classList.remove("hidden");
      // Remove inline styles to allow CSS to take over
      chatWidget.style.display = "";
      chatWidget.style.visibility = "";
      chatWidget.style.opacity = "";
    }
  }

  hideChatWidget(): void {
    const chatWidget = document.getElementById("chat-widget");
    if (chatWidget) {
      chatWidget.classList.add("hidden");
      chatWidget.classList.remove("expanded");
      // Force hide with inline style as backup
      chatWidget.style.display = "none";
    }
  }

  // Force hide chat widget immediately, even before DOM is fully loaded
  forceHideChatWidget(): void {
    const chatWidget = document.getElementById("chat-widget");
    if (chatWidget) {
      chatWidget.classList.add("hidden");
      chatWidget.classList.remove("expanded");
      chatWidget.style.display = "none";
      chatWidget.style.visibility = "hidden";
      chatWidget.style.opacity = "0";
    }
  }

  expandChatWidget(): void {
    const chatWidget = document.getElementById("chat-widget");
    if (chatWidget) {
      chatWidget.classList.add("expanded");
    }
  }

  collapseChatWidget(): void {
    const chatWidget = document.getElementById("chat-widget");
    if (chatWidget) {
      chatWidget.classList.remove("expanded");
    }
  }

  updateChatVisibility(): void {
    // Always hide chat widget on login and register screens
    const currentScreen = this.getCurrentScreen();
    if (
      currentScreen === "login-screen" ||
      currentScreen === "register-screen"
    ) {
      this.hideChatWidget();
      return;
    }

    if (this.isAuthenticated()) {
      this.showChatWidget();
    } else {
      this.hideChatWidget();
    }
  }

  // Get current active screen
  private getCurrentScreen(): string | null {
    const activeScreen = document.querySelector(".screen.active");
    return activeScreen ? activeScreen.id : null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const authManager = (window as any).authManager;
    if (!authManager) return false;

    const user = authManager.getCurrentUser();
    const token = localStorage.getItem("token");
    return !!(user && user.userId && token);
  }

  // Show screen directly (used by router)
  showScreenDirect(screenName: string): void {
    // Hide all screens
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });

    // Show target screen
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
      targetScreen.classList.add("active");
      this.currentScreen = screenName;
    }

    // Set body data attribute for CSS targeting
    document.body.setAttribute("data-current-screen", screenName);

    // Update chat visibility based on current screen and auth status
    this.updateChatVisibility();

    // Update UI based on screen
    if (screenName === "play-config") {
      this.updatePlayConfigUI();
    } else if (screenName === "profile") {
      this.loadProfileData();
    }
  }

  // Legacy method for backwards compatibility - now uses router
  showScreen(screenName: string): void {
    this.router.navigate(screenName);
  }

  async handleLogin(): Promise<void> {
    const usernameInput = document.getElementById(
      "login-username"
    ) as HTMLInputElement;
    const passwordInput = document.getElementById(
      "login-password"
    ) as HTMLInputElement;

    const username = usernameInput.value;
    const password = passwordInput.value;

    if (!username || !password) {
      alert("Please fill in all fields");
      return;
    }

    console.log("Attempting login:", { username });

    try {
      const authManager = (window as any).authManager;
      const result: AuthResult = await authManager.login(username, password);
      console.log("Login result:", result);

      if (result.success) {
        console.log("Login successful, user data:", result.data);
        this.router.navigate("main-menu");
        this.updateUserDisplay();
        this.updateHostPlayerDisplay();
        this.updateChatVisibility(); // Show chat widget after login
        this.loginForm.reset();
      } else {
        console.log("Login failed:", result.error);
        authManager.currentUser = null;
        localStorage.removeItem("token");
        alert("Login failed: " + result.error);
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed: Network error");
    }
  }

  async handleRegister(): Promise<void> {
    const usernameInput = document.getElementById(
      "register-username"
    ) as HTMLInputElement;
    const emailInput = document.getElementById(
      "register-email"
    ) as HTMLInputElement;
    const passwordInput = document.getElementById(
      "register-password"
    ) as HTMLInputElement;

    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!username || !email || !password) {
      alert("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    console.log("Attempting registration:", { username, email });

    try {
      const authManager = (window as any).authManager;
      const result: AuthResult = await authManager.register(
        username,
        email,
        password
      );

      if (result.success) {
        this.router.navigate("main-menu");
        this.updateUserDisplay();
        this.updateHostPlayerDisplay();
        this.updateChatVisibility(); // Show chat widget after registration
        this.registerForm.reset();
        console.log("Registration successful");
      } else {
        alert("Registration failed: " + result.error);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed: Network error");
    }
  }

  async handleForgotPassword(): Promise<void> {
    const emailInput = document.getElementById(
      "forgot-password-email"
    ) as HTMLInputElement;
    const email = emailInput.value.trim();

    if (!email) {
      alert("Please enter your email address");
      return;
    }

    if (!email.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }

    try {
      const authManager = (window as any).authManager;
      const result: AuthResult = await authManager.forgotPassword(email);

      if (result.success) {
        alert("Password reset link sent! Please check your email.");
        this.forgotPasswordForm.reset();
        this.router.navigate("login");
      } else {
        alert("Failed to send reset email: " + result.error);
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      alert("Failed to send reset email: Network error");
    }
  }

  handleLogout(): void {
    const authManager = (window as any).authManager;
    authManager.logout();
    this.router.navigate("login");
    this.localPlayers = [];
    this.updateChatVisibility(); // Hide chat widget after logout
  }

  async checkExistingLogin(): Promise<void> {
    const authManager = (window as any).authManager;
    if (!authManager) return;

    const isValid = await authManager.verifyToken();
    if (isValid) {
      const user = authManager.getCurrentUser();
      if (user) {
        this.router.navigate("main-menu");
        this.updateUserDisplay();
        this.updateHostPlayerDisplay();
        this.updateChatVisibility(); // Show chat widget if already logged in
      }
    }
  }

  updateUserDisplay(): void {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();

    const userDisplay = document.getElementById("main-menu-user-display");
    if (userDisplay && user) {
      userDisplay.textContent = `Welcome, ${user.username}!`;
    }
  }

  updateHostPlayerDisplay(): void {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();

    const hostPlayerName = document.getElementById("host-player-name");
    if (hostPlayerName && user) {
      hostPlayerName.textContent = user.username;
    }
  }

  initializeLocalPlayers(): void {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    const token = localStorage.getItem("token") || "";
    if (user) {
      this.localPlayers = [
        {
          id: user.userId.toString(),
          username: user.username,
          isCurrentUser: true,
          userId: user.userId,
          token: token,
        },
      ];
    }
    this.updateLocalPlayersDisplay();
  }

  updateLocalPlayersDisplay(): void {
    const container = document.getElementById("local-players-list");
    if (!container) return;

    container.innerHTML = this.localPlayers
      .map(
        (player) => `
      <div class="player-item">
        <div class="player-info">
          <div class="player-name">${player.username}${
          player.isCurrentUser ? " (You)" : ""
        }</div>
          <div class="player-status">${
            player.isCurrentUser ? "Host" : "Local Player"
          }</div>
        </div>
        ${
          !player.isCurrentUser
            ? '<button class="remove-player-btn" data-player-id="' +
              player.id +
              '">Remove</button>'
            : ""
        }
      </div>
    `
      )
      .join("");

    // Add remove button listeners
    container.querySelectorAll(".remove-player-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const playerId = btn.getAttribute("data-player-id");
        this.removeLocalPlayer(playerId || "");
      });
    });
  }

  handleConfigOption(button: HTMLElement): void {
    const setting = button.getAttribute("data-setting");
    const value = button.getAttribute("data-value");

    if (!setting || !value) return;

    // Remove active class from siblings
    const siblings =
      button.parentElement?.querySelectorAll(
        ".config-option, .setting-option"
      ) || [];
    siblings.forEach((sibling) => sibling.classList.remove("active"));

    // Add active class to clicked button
    button.classList.add("active");

    // Update settings
    switch (setting) {
      case "ai-difficulty":
        this.gameSettings.aiDifficulty = value as "easy" | "medium" | "hard";
        break;
      case "ball-speed":
        this.gameSettings.ballSpeed = value as "slow" | "medium" | "fast";
        break;
      case "paddle-speed":
        this.gameSettings.paddleSpeed = value as "slow" | "medium" | "fast";
        break;
    }
  }

  handleGameModeChange(tab: HTMLElement): void {
    const mode = tab.getAttribute("data-mode") as
      | "coop"
      | "arcade"
      | "tournament";
    if (!mode) return;

    // Remove active class from all tabs
    document
      .querySelectorAll(".game-mode-tab")
      .forEach((t) => t.classList.remove("active"));

    // Add active class to clicked tab
    tab.classList.add("active");

    // Update game settings
    this.gameSettings.gameMode = mode;

    // Show/hide mode descriptions
    document
      .querySelectorAll(".mode-desc")
      .forEach((desc) => desc.classList.remove("active"));
    const activeDesc = document.getElementById(`mode-desc-${mode}`);
    if (activeDesc) {
      activeDesc.classList.add("active");
    }

    // Show/hide arcade-specific settings
    const arcadeOnlyElements = document.querySelectorAll(".arcade-only");
    arcadeOnlyElements.forEach((element) => {
      if (mode === "arcade") {
        (element as HTMLElement).style.display = "block";
        (element as HTMLElement).classList.add("active");
      } else {
        (element as HTMLElement).style.display = "none";
        (element as HTMLElement).classList.remove("active");
      }
    });

    // Update players section based on mode
    this.updatePlayersForMode(mode);
  }

  private updatePlayersForMode(mode: "coop" | "arcade" | "tournament"): void {
    const currentUserCard = document.getElementById("current-user-card");
    const onlinePlayersSection = document.querySelector(
      ".player-section:nth-child(2)"
    ) as HTMLElement;
    const localPlayersSection = document.querySelector(
      ".player-section:nth-child(3)"
    ) as HTMLElement;
    const partySection = document.querySelector(
      ".player-section:nth-child(4)"
    ) as HTMLElement;

    // Update host player display with username
    const hostPlayerName = document.getElementById("host-player-name");
    const authManager = (window as any).authManager;
    if (hostPlayerName && authManager && authManager.getCurrentUser()) {
      hostPlayerName.textContent = authManager.getCurrentUser().username;
    }

    // Show/hide sections based on mode (simplified since we only have one party list now)
    switch (mode) {
      case "coop":
        this.populateOnlinePlayers();
        break;
      case "arcade":
        // Arcade mode - local players only
        break;
      case "tournament":
        this.populateOnlinePlayers();
        break;
    }

    // Initialize the game party display
    this.updateGamePartyDisplay();
  }

  private populateOnlinePlayers(): void {
    const onlinePlayersList = document.getElementById("online-players-list");
    const onlineCount = document.getElementById("online-count");

    if (!onlinePlayersList || !onlineCount) return;

    // Mock online players data - replace with real API call
    const mockOnlinePlayers = [
      { id: "2", username: "player2", status: "online" },
      { id: "3", username: "player3", status: "online" },
      { id: "4", username: "player4", status: "in-game" },
    ];

    onlineCount.textContent = mockOnlinePlayers.length.toString();

    if (mockOnlinePlayers.length === 0) {
      onlinePlayersList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <span>No other players online</span>
        </div>
      `;
    } else {
      onlinePlayersList.innerHTML = mockOnlinePlayers
        .map(
          (player) => `
        <div class="player-card" data-player-id="${player.id}">
          <div class="player-avatar">
            <i class="fas fa-user"></i>
          </div>
          <div class="player-info">
            <span class="player-name">${player.username}</span>
            <span class="player-status ${player.status}">${player.status}</span>
          </div>
        </div>
      `
        )
        .join("");

      // Add click listeners for online players
      onlinePlayersList.querySelectorAll(".player-card").forEach((card) => {
        card.addEventListener("click", () => {
          const playerId = card.getAttribute("data-player-id");
          const playerName = card.querySelector(".player-name")?.textContent;
          if (playerId && playerName) {
            this.invitePlayer(playerId, playerName);
          }
        });
      });
    }
  }

  private updatePartyList(): void {
    const partyPlayersList = document.getElementById("party-players-list");
    const partyCount = document.getElementById("party-count");

    if (!partyPlayersList || !partyCount) return;

    // Always include current user
    const authManager = (window as any).authManager;
    const currentUser = authManager?.getCurrentUser();
    let partyMembers = currentUser ? [currentUser] : [];

    // Add local players to party
    partyMembers = partyMembers.concat(this.localPlayers);

    partyCount.textContent = partyMembers.length.toString();

    partyPlayersList.innerHTML = partyMembers
      .map(
        (player) => `
      <div class="player-card ${player === currentUser ? "current-user" : ""}">
        <div class="player-avatar">
          <i class="fas fa-user"></i>
        </div>
        <div class="player-info">
          <span class="player-name">${player.username}</span>
          <span class="player-status ${
            player === currentUser ? "online" : "local"
          }">${player === currentUser ? "You" : "Local"}</span>
        </div>
      </div>
    `
      )
      .join("");
  }

  private invitePlayer(playerId: string, playerName: string): void {
    // TODO: Implement player invitation system
    console.log(`Inviting player ${playerName} (${playerId}) to game`);
    // For now, just show a notification
    alert(`Invitation sent to ${playerName}!`);
  }

  changeScoreToWin(delta: number): void {
    if (this.gameSettings.gameMode !== "arcade") return;

    const currentScore = this.gameSettings.scoreToWin || 5;
    const newScore = Math.max(1, Math.min(21, currentScore + delta)); // Limit between 1 and 21

    this.gameSettings.scoreToWin = newScore;

    // Update display
    const scoreDisplay = document.getElementById("score-value");
    if (scoreDisplay) {
      scoreDisplay.textContent = newScore.toString();
    }
  }

  updatePlayConfigUI(): void {
    // Update settings display based on current settings
    this.updateLocalPlayersDisplay();
    this.updateGamePartyDisplay();
    this.initializePlayerSelection();
  }

  showAddPlayerDialog(): void {
    const modal = document.getElementById("add-player-modal");
    const playerNicknameInput = document.getElementById(
      "player-nickname"
    ) as HTMLInputElement;

    // Clear previous input and show modal
    if (playerNicknameInput) {
      playerNicknameInput.value = "";
      playerNicknameInput.focus();
    }

    if (modal) {
      modal.classList.remove("hidden");
    }
  }

  hideAddPlayerDialog(): void {
    const modal = document.getElementById("add-player-modal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  handleAddPlayerSubmit(event: Event): void {
    event.preventDefault();
    const usernameInput = document.getElementById(
      "add-player-username"
    ) as HTMLInputElement;
    const passwordInput = document.getElementById(
      "add-player-password"
    ) as HTMLInputElement;
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }

    // Check for duplicate username against host and all local players
    const hostAuthManager = (window as any).authManager;
    const hostUser = hostAuthManager?.getCurrentUser();
    const allUsernames = [
      ...(hostUser ? [hostUser.username.toLowerCase()] : []),
      ...this.localPlayers.map((p) => p.username.toLowerCase()),
    ];
    if (allUsernames.includes(username.toLowerCase())) {
      alert("A player with this username is already logged in");
      return;
    }
    // Attempt to log in local player
    const authManager = (window as any).authManager;
    if (!authManager) {
      alert("Auth system not available");
      return;
    }
    authManager
      .login(username, password)
      .then((result: any) => {
        if (
          result.success &&
          result.data &&
          result.data.user &&
          result.data.token
        ) {
          // Store token and user info for this local player
          const newPlayer: LocalPlayer = {
            id: result.data.user.userId.toString(),
            username: result.data.user.username,
            isCurrentUser: false,
            userId: result.data.user.userId,
            token: result.data.token,
          };
          this.localPlayers.push(newPlayer);
          this.updateLocalPlayersDisplay();
          this.hideAddPlayerDialog();
          this.updateGamePartyDisplay();
          // Highlight/select the newly added local player as active
          setTimeout(() => {
            const partyList = document.getElementById("game-party-list");
            if (partyList) {
              const playerCards = partyList.querySelectorAll(
                ".player-card.local-player"
              );
              if (playerCards.length > 0) {
                const lastPlayerCard = playerCards[
                  playerCards.length - 1
                ] as HTMLElement;
                lastPlayerCard.classList.add("active");
              }
            }
          }, 100);
        } else {
          alert(result.error || "Login failed for local player");
        }
      })
      .catch(() => {
        alert("Network error during login");
      });
    // Modal links for forgot password and create account
    document
      .getElementById("add-player-forgot-password-link")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.hideAddPlayerDialog();
        this.router.navigate("forgot-password");
      });
    document
      .getElementById("add-player-create-account-link")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.hideAddPlayerDialog();
        this.showRegistrationForLocalPlayer();
      });
  }

  showRegistrationForLocalPlayer(): void {
    // Show registration screen
    this.router.navigate("register");
    // Listen for registration form submit
    const registerForm = document.getElementById(
      "register-form"
    ) as HTMLFormElement;
    if (registerForm) {
      const handler = async (event: Event) => {
        event.preventDefault();
        const usernameInput = document.getElementById(
          "register-username"
        ) as HTMLInputElement;
        const emailInput = document.getElementById(
          "register-email"
        ) as HTMLInputElement;
        const passwordInput = document.getElementById(
          "register-password"
        ) as HTMLInputElement;
        const username = usernameInput?.value.trim();
        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        const authManager = (window as any).authManager;
        if (!authManager) {
          alert("Auth system not available");
          return;
        }
        const result = await authManager.register(username, email, password);
        if (result.success && result.data) {
          alert("Account created!");
          // Switch host session to new local player
          const authManager = (window as any).authManager;
          authManager.currentUser = {
            userId: result.data.userId,
            username: result.data.username,
            email: result.data.email,
          };
          localStorage.setItem("token", result.data.token || "");
          this.initializeLocalPlayers();
          this.router.navigate("play-config");
          this.updateLocalPlayersDisplay();
        } else {
          alert(result.error || "Registration failed");
        }
        registerForm.removeEventListener("submit", handler);
      };
      registerForm.addEventListener("submit", handler);
    }
  }

  removeLocalPlayer(playerId: string): void {
    this.localPlayers = this.localPlayers.filter(
      (player) => player.id !== playerId
    );
    this.updateGamePartyDisplay();
  }

  updateGamePartyDisplay(): void {
    const gamePartyList = document.getElementById("game-party-list");
    if (!gamePartyList) return;

    // Clear existing players except the host
    const hostCard = document.getElementById("host-player-card");
    gamePartyList.innerHTML = "";

    // Re-add the host card with active state by default
    if (hostCard) {
      const newHostCard = hostCard.cloneNode(true) as HTMLElement;
      // Host is active by default
      newHostCard.classList.add("active");
      newHostCard.addEventListener("click", () =>
        this.togglePlayerSelection(newHostCard, "host")
      );
      gamePartyList.appendChild(newHostCard);
    }

    // Add AI player if AI difficulty is selected
    const aiDifficultyActive = document.querySelector(
      '.setting-option[data-setting="ai-difficulty"].active'
    );
    if (aiDifficultyActive) {
      const aiPlayerCard = this.createAIPlayerCard();
      gamePartyList.appendChild(aiPlayerCard);
    }

    // Add local players
    this.localPlayers.forEach((player) => {
      const playerCard = this.createPlayerCard(player);
      gamePartyList.appendChild(playerCard);
    });
  }

  createPlayerCard(player: any): HTMLElement {
    const playerCard = document.createElement("div");
    playerCard.className = "player-card local-player";
    playerCard.dataset.playerId = player.id;

    playerCard.innerHTML = `
      <div class="player-avatar">
        <i class="fas fa-home"></i>
      </div>
      <div class="player-info">
        <span class="player-name">${player.username}</span>
        <span class="role-badge local">Local</span>
      </div>
      <div class="player-actions">
        <button class="remove-btn" onclick="app.removeLocalPlayer('${player.id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    // Add click handler for player selection
    playerCard.addEventListener("click", (e) => {
      // Don't trigger selection if clicking the remove button
      if ((e.target as HTMLElement).closest(".remove-btn")) return;
      this.togglePlayerSelection(playerCard, "local");
    });

    return playerCard;
  }

  createAIPlayerCard(): HTMLElement {
    const playerCard = document.createElement("div");
    playerCard.className = "player-card ai-player active"; // AI player is active by default
    playerCard.dataset.playerId = "ai-player";

    playerCard.innerHTML = `
      <div class="player-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="player-info">
        <span class="player-name">AI Player</span>
        <span class="role-badge ai">Computer</span>
      </div>
    `;

    // Add click handler for AI player selection
    playerCard.addEventListener("click", () =>
      this.togglePlayerSelection(playerCard, "ai")
    );

    return playerCard;
  }

  togglePlayerSelection(playerCard: HTMLElement, playerType: string): void {
    playerCard.classList.toggle("active");

    // Update selected players state for game logic
    const playerId = playerCard.dataset.playerId || playerType;

    if (playerCard.classList.contains("active")) {
      console.log(`Player ${playerId} selected for game`);
    } else {
      console.log(`Player ${playerId} deselected from game`);
    }
  }

  initializePlayerSelection(): void {
    // Set up AI difficulty change handler to update AI player display
    const aiDifficultyButtons = document.querySelectorAll(
      '.setting-option[data-setting="ai-difficulty"]'
    );
    aiDifficultyButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Update display after AI difficulty changes
        setTimeout(() => this.updateGamePartyDisplay(), 100);
      });
    });
  }

  async startGame(): Promise<void> {
    console.log("Starting game with settings:", this.gameSettings);
    console.log("Local players:", this.localPlayers);

    // Update game UI with player information
    this.updateGameUI();

    // Show game screen
    this.showScreen("game");

    // Start the actual game
    const gameManager = (window as any).gameManager;
    if (gameManager && typeof gameManager.startBotMatch === "function") {
      await gameManager.startBotMatch();
    } else {
      console.error("GameManager not available");
      alert("Game system not available");
      this.showScreen("play-config");
    }
  }

  updateGameUI(): void {
    // All UI rendering is now handled directly on canvas in game.ts
    // No need to update HTML elements for player info and scores
    console.log("Game UI update - rendering handled on canvas");
  }

  stopGame(): void {
    console.log("Stopping game");

    const gameManager = (window as any).gameManager;
    if (gameManager && typeof gameManager.stopGame === "function") {
      gameManager.stopGame();
    }

    // Navigation is now handled by gameManager.stopGame()
  }

  pauseGame(): void {
    console.log("Pausing/Resuming game");

    const gameManager = (window as any).gameManager;
    if (gameManager && typeof gameManager.pauseGame === "function") {
      gameManager.pauseGame();
    }
  }

  async loadProfileData(): Promise<void> {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    if (!user) return;

    try {
      // Use the ProfileManager for comprehensive profile loading
      const profileManager = (window as any).profileManager;
      if (profileManager) {
        await profileManager.loadProfile();
      } else {
        // Fallback to basic loading if ProfileManager not available
        this.updateBasicProfileInfo(user);
        this.loadBasicStats(user.userId);
      }
    } catch (error) {
      console.error("Failed to load profile data:", error);
      // Fallback to basic user info
      this.updateBasicProfileInfo(user);
    }
  }

  private async loadBasicStats(userId: number): Promise<void> {
    const authManager = (window as any).authManager;
    const headers = authManager.getAuthHeaders();

    try {
      // Load profile stats
      const statsResponse = await fetch(`/api/game/stats/${userId}`, {
        headers,
      });
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        this.updateProfileStats(stats);
      } else {
        // Fallback to default stats
        this.updateProfileStats({
          total_games: 0,
          wins: 0,
          win_rate: 0,
          streak: 0,
          tournaments: 0,
          rank: "--",
        });
      }
    } catch (error) {
      console.error("Failed to load basic stats:", error);
    }
  }

  updateBasicProfileInfo(user: User): void {
    const usernameEl = document.getElementById("profile-username");
    const userIdEl = document.getElementById("profile-user-id");
    const memberSinceEl = document.getElementById("profile-member-since");

    if (usernameEl) usernameEl.textContent = user.username;
    if (userIdEl) userIdEl.textContent = `User ID: ${user.userId}`;
    if (memberSinceEl) memberSinceEl.textContent = "Member since: Recent";
  }

  updateProfileStats(stats: any): void {
    // Update stat values
    const totalGamesEl = document.getElementById("profile-total-games");
    const winsEl = document.getElementById("profile-wins");
    const winRateEl = document.getElementById("profile-win-rate");
    const streakEl = document.getElementById("profile-streak");
    const tournamentsEl = document.getElementById("profile-tournaments");
    const rankEl = document.getElementById("profile-rank");

    if (totalGamesEl)
      totalGamesEl.textContent = stats.total_games?.toString() || "0";
    if (winsEl) winsEl.textContent = stats.wins?.toString() || "0";
    if (winRateEl)
      winRateEl.textContent = `${Math.round(stats.win_rate || 0)}%`;
    if (streakEl) streakEl.textContent = stats.streak?.toString() || "0";
    if (tournamentsEl)
      tournamentsEl.textContent = stats.tournaments?.toString() || "0";
    if (rankEl) rankEl.textContent = stats.rank ? `#${stats.rank}` : "#--";

    // Update level and experience (calculated from total games)
    const level = Math.floor((stats.total_games || 0) / 10) + 1;
    const expInLevel = (stats.total_games || 0) % 10;
    const expNeeded = 10;
    const expPercentage = (expInLevel / expNeeded) * 100;

    const levelEl = document.getElementById("profile-level");
    const expBarEl = document.getElementById("profile-exp-bar");
    const expTextEl = document.getElementById("profile-exp-text");

    if (levelEl) levelEl.textContent = level.toString();
    if (expBarEl) expBarEl.style.width = `${expPercentage}%`;
    if (expTextEl)
      expTextEl.textContent = `${expInLevel * 100} / ${expNeeded * 100} XP`;
  }

  updateRecentActivity(activities: any[]): void {
    const container = document.getElementById("profile-recent-activity");
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = `
        <div class="activity-item">
          <span class="activity-text">No recent activity</span>
          <span class="activity-time">--</span>
        </div>
      `;
      return;
    }

    container.innerHTML = activities
      .slice(0, 5)
      .map((activity) => {
        const timeAgo = this.formatTimeAgo(
          new Date(activity.created_at || Date.now())
        );
        const result = activity.won ? "Won" : "Lost";
        const resultClass = activity.won ? "win" : "loss";

        return `
        <div class="activity-item">
          <span class="activity-text">
            <span class="${resultClass}">${result}</span> game vs ${
          activity.opponent || "AI"
        }
          </span>
          <span class="activity-time">${timeAgo}</span>
        </div>
      `;
      })
      .join("");
  }

  updateAchievements(): void {
    const container = document.getElementById("profile-achievements");
    if (!container) return;

    const achievements = [
      {
        icon: "🎮",
        title: "First Game",
        desc: "Play your first game",
        unlocked: true,
      },
      {
        icon: "🏆",
        title: "First Victory",
        desc: "Win your first game",
        unlocked: false,
      },
      {
        icon: "🔥",
        title: "Hot Streak",
        desc: "Win 5 games in a row",
        unlocked: false,
      },
      { icon: "💯", title: "Century", desc: "Play 100 games", unlocked: false },
      {
        icon: "🏅",
        title: "Champion",
        desc: "Win a tournament",
        unlocked: false,
      },
      {
        icon: "⚡",
        title: "Speed Demon",
        desc: "Win with fast ball speed",
        unlocked: false,
      },
    ];

    container.innerHTML = achievements
      .map(
        (achievement) => `
      <div class="achievement-card ${achievement.unlocked ? "" : "locked"}">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-info">
          <h4>${achievement.title}</h4>
          <p>${achievement.desc}</p>
        </div>
      </div>
    `
      )
      .join("");
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  }
}

// Initialize the app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  (window as any).app = new SpiritualAscensionApp();
});
