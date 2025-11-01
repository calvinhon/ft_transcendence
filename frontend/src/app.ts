import { showToast } from './toast';
import { showChatWidget, hideChatWidget, forceHideChatWidget, expandChatWidget, collapseChatWidget } from './ui';
// frontend/src/app.ts - TypeScript version of main app controller

// Type definitions moved to types.ts

import { User, AuthResult, LocalPlayer, Route, GameSettings } from './types';
import { handleHostLogin, handleHostRegister } from './host-auth';
import { Router } from './router';
import { getCoopLevel, setCoopLevel, incrementCoopLevel } from './state';
import { setupLocalPlayerRegisterModal, showLocalPlayerRegisterModal, setupLocalPlayerLoginModal, showLocalPlayerLoginModal } from './local-player';


export class App {
  // Handles game mode tab click and initialization
  handleGameModeChange(tab: HTMLElement): void {
    const mode = tab.getAttribute('data-mode') as 'coop' | 'arcade' | 'tournament';
    if (!mode) return;
    // Remove active from all tabs
    document.querySelectorAll('.game-mode-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    // Show correct mode description
    document.querySelectorAll('.mode-desc').forEach(desc => desc.classList.remove('active'));
    const activeDesc = document.getElementById(`mode-desc-${mode}`);
    if (activeDesc) activeDesc.classList.add('active');
    // Show/hide arcade-only settings
    document.querySelectorAll('.arcade-only').forEach(element => {
      if (mode === 'arcade') {
        (element as HTMLElement).style.display = 'block';
        (element as HTMLElement).classList.add('active');
      } else {
        (element as HTMLElement).style.display = 'none';
        (element as HTMLElement).classList.remove('active');
      }
    });
    // Update players section based on mode
    this.updatePlayersForMode(mode);
  }
  createPlayerCard(player: any): HTMLElement {
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card local-player';
    playerCard.dataset.playerId = player.id;
    playerCard.innerHTML = [
      '<div class="player-avatar"><i class="fas fa-home"></i></div>',
      '<div class="player-info">',
        `<span class="player-name">${player.username}</span>`,
        '<span class="role-badge local">Local</span>',
      '</div>',
      '<div class="player-actions">',
        `<button class="remove-btn" type="button"><i class="fas fa-times"></i></button>`,
      '</div>'
    ].join('');
    // Remove button event
    playerCard.querySelector('.remove-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeLocalPlayer(player.id);
    });
    // Add click handler for player selection
    playerCard.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.remove-btn')) return;
      this.togglePlayerSelection(playerCard, 'local');
    });
    return playerCard;
  }

  removeLocalPlayer(playerId: string): void {
    this.localPlayers = this.localPlayers.filter(player => player.id !== playerId);
    this.updateGamePartyDisplay();
  }
  updateGamePartyDisplay(): void {
    const team1List = document.getElementById('team1-list');
    const team2List = document.getElementById('team2-list');
    if (!team1List || !team2List) return;

    // Clear local players from both teams (keep host and AI)
    const team1LocalContainer = document.getElementById('team1-local-players');
    if (team1LocalContainer) team1LocalContainer.innerHTML = '';

    // For TEAM 2, clear any local players after AI
    const team2LocalContainer = document.createElement('div');
    team2LocalContainer.id = 'team2-local-players';
    team2LocalContainer.className = 'local-players';
    // Remove existing local players container if exists
    const existingTeam2Local = document.getElementById('team2-local-players');
    if (existingTeam2Local) existingTeam2Local.remove();
    // Insert after AI card
    const aiCard = document.getElementById('ai-player-card');
    if (aiCard && aiCard.parentNode) {
      aiCard.parentNode.insertBefore(team2LocalContainer, aiCard.nextSibling);
    }

    // Add local players to TEAM 1
    this.localPlayers.forEach(player => {
      const playerCard = this.createPlayerCard(player);
      if (team1LocalContainer) team1LocalContainer.appendChild(playerCard);
    });

    // TEAM 2 has AI by default, no additional local players for now
    // (Can be extended later if needed)
  }
  /**
   * Submit game results for all selected players (host and local)
   * @param results Array of { userId, stats } for each player
   */
  async submitGameResults(results: Array<{ userId: number, stats: any }>): Promise<void> {
    // Host player
    const authManager = (window as any).authManager;
    const hostUser = authManager?.getCurrentUser();
    const hostToken = localStorage.getItem('token');
    if (hostUser && hostToken) {
      // Debug: log stats sent to user-service
      console.debug('Submitting host result:', {
        userId: hostUser.userId,
        stats: results.find(r => r.userId === hostUser.userId)?.stats,
        token: hostToken
      });
      await this.submitResultForUser(hostUser.userId, results.find(r => r.userId === hostUser.userId)?.stats, hostToken);
    }

    // Local players
    for (const player of this.localPlayers) {
      if (player.token && player.userId) {
        // Debug: log stats sent to user-service
        console.debug('Submitting local player result:', {
          userId: player.userId,
          stats: results.find(r => r.userId === player.userId)?.stats,
          token: player.token
        });
        await this.submitResultForUser(player.userId, results.find(r => r.userId === player.userId)?.stats, player.token);
      }
    }

    // Co-op level progression: if host won in co-op mode, increment level and update AI for next match
    if (this.gameSettings.gameMode === 'coop' && results.length > 0 && results[0].stats?.won) {
      incrementCoopLevel();
      this.updateCoopProgressUI();
      // Sync AI difficulty for next match
      const level = getCoopLevel();
      this.gameSettings.aiDifficulty = (level === 1 ? 'easy' : level === 2 ? 'medium' : 'hard');
      showToast('Congratulations! Next AI unlocked.', 'success');
      // Prompt user to continue to next match
      this.promptContinueCoopMatch();
    }
  }

  promptContinueCoopMatch(): void {
    // Show a modal or simple confirm dialog
    if (window.confirm('Continue to next CO-OP match with increased AI level?')) {
      this.startGame();
    } else {
      this.router.navigate('play-config');
    }
  }
  // --- Place this at the end of the class ---


  /**
   * Submit result for a single user
   */
  async submitResultForUser(userId: number, stats: any, token: string): Promise<void> {
    try {
      const response = await fetch(`/api/game/update-stats/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(stats)
      });
      if (!response.ok) {
        console.error(`Failed to update stats for user ${userId}`);
      }
    } catch (error) {
      console.error(`Error updating stats for user ${userId}:`, error);
    }
  }
  private currentScreen: string = 'login';
  private router: Router;
  private gameSettings: GameSettings = {
    gameMode: 'coop',
    aiDifficulty: 'easy',
    ballSpeed: 'medium',
    paddleSpeed: 'medium',
    powerupsEnabled: false,
    accelerateOnHit: false,
    scoreToWin: 5
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
    // Inject local player modals HTML
    Promise.all([
      fetch('local-player-login-modal.html').then(r => r.text()),
      fetch('local-player-register-modal.html').then(r => r.text())
    ]).then(([loginHtml, registerHtml]) => {
      document.body.insertAdjacentHTML('beforeend', loginHtml);
      document.body.insertAdjacentHTML('beforeend', registerHtml);
      // Setup modals via local-player.ts
      setupLocalPlayerLoginModal(this);
      setupLocalPlayerRegisterModal(this);
      this.setupAddPlayerButtons();
    });
  }

  setupAddPlayerButtons() {
    // TEAM 1 add player button
    const addTeam1Btn = document.getElementById('add-team1-player-btn');
    if (addTeam1Btn) {
      addTeam1Btn.addEventListener('click', () => {
        (window as any).addPlayerTeam = 1;
        showLocalPlayerLoginModal();
      });
    }
    // TEAM 2 add player button
    const addTeam2Btn = document.getElementById('add-team2-player-btn');
    if (addTeam2Btn) {
      addTeam2Btn.addEventListener('click', () => {
        (window as any).addPlayerTeam = 2;
        showLocalPlayerLoginModal();
      });
    }
  }

  async init(): Promise<void> {
    // IMMEDIATELY hide chat widget before any other logic
    forceHideChatWidget();
    
    // Set initial body attribute to login screen
    document.body.setAttribute('data-current-screen', 'login');
    
    // Get screen elements
    this.loginScreen = document.getElementById('login-screen') as HTMLElement;
    this.registerScreen = document.getElementById('register-screen') as HTMLElement;
    this.mainMenuScreen = document.getElementById('main-menu-screen') as HTMLElement;
    this.playConfigScreen = document.getElementById('play-config-screen') as HTMLElement;
    this.gameScreen = document.getElementById('game-screen') as HTMLElement;
    this.settingsScreen = document.getElementById('settings-screen') as HTMLElement;

    // Get form elements
    this.loginForm = document.getElementById('login-form') as HTMLFormElement;
    this.registerForm = document.getElementById('register-form') as HTMLFormElement;
    this.forgotPasswordForm = document.getElementById('forgot-password-form') as HTMLFormElement;

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
    // Add Player Modal: Create Account link opens local player register modal
    document.getElementById('add-player-create-account-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.hideAddPlayerDialog();
      // Use local-player.ts to show modal
      // showLocalPlayerRegisterModal();
    });
    // Login form
    this.loginForm.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      this.handleLogin();
    });

    // Register form
    this.registerForm.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      this.handleRegister();
    });

    // Forgot password form
    this.forgotPasswordForm.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      this.handleForgotPassword();
    });

    // Navigation links
    document.getElementById('create-account-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.router.navigate('register');
    });

    document.getElementById('forgot-password-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.router.navigate('forgot-password');
    });

    document.getElementById('back-to-login-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.router.navigate('login');
    });

    document.getElementById('back-to-login-from-forgot-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.router.navigate('login');
    });

    // Main menu buttons
    document.getElementById('play-btn')?.addEventListener('click', () => {
      this.router.navigate('play-config');
    });

    document.getElementById('profile-btn')?.addEventListener('click', () => {
      this.router.navigate('profile');
    });

    document.getElementById('settings-btn')?.addEventListener('click', () => {
      this.router.navigate('settings');
    });

    document.getElementById('main-menu-logout-btn')?.addEventListener('click', () => {
      this.handleLogout();
    });

    // Play config buttons
    document.getElementById('back-to-main-btn')?.addEventListener('click', () => {
      this.router.navigate('main-menu');
    });

    document.getElementById('start-game-btn')?.addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('add-player-btn')?.addEventListener('click', () => {
      this.showAddPlayerDialog();
    });

    // Settings buttons
    document.getElementById('back-to-main-settings-btn')?.addEventListener('click', () => {
      this.router.navigate('main-menu');
    });

    document.getElementById('back-to-main-settings-bottom-btn')?.addEventListener('click', () => {
      this.router.navigate('main-menu');
    });

    // Profile buttons
    document.getElementById('back-to-main-profile-btn')?.addEventListener('click', () => {
      this.router.navigate('main-menu');
    });

    document.getElementById('back-to-main-profile-bottom-btn')?.addEventListener('click', () => {
      this.router.navigate('main-menu');
    });

    // Game control buttons
    document.getElementById('stop-game-btn')?.addEventListener('click', () => {
      const gameManager = (window as any).gameManager;
      if (gameManager && typeof gameManager.stopGame === 'function') {
        gameManager.stopGame();
      }
    });

    document.addEventListener('DOMContentLoaded', () => {
      const pauseBtn = document.getElementById('pause-game-btn');
      if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
          const gameManager = (window as any).gameManager;
          if (gameManager && typeof gameManager.pauseGame === 'function') {
            gameManager.pauseGame();
          }
        });
      }
    });

    // Add Player Modal event listeners
    document.getElementById('add-player-form')?.addEventListener('submit', (e) => {
      this.handleAddPlayerSubmit(e);
    });

    document.getElementById('close-add-player-modal')?.addEventListener('click', () => {
      this.hideAddPlayerDialog();
    });

    document.getElementById('cancel-add-player')?.addEventListener('click', () => {
      this.hideAddPlayerDialog();
    });

    document.getElementById('add-player-modal-overlay')?.addEventListener('click', () => {
      this.hideAddPlayerDialog();
    });

    // Config option buttons
    document.querySelectorAll('.config-option, .setting-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleConfigOption(btn as HTMLElement);
      });
    });

    // Game mode tabs
    document.querySelectorAll('.game-mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.handleGameModeChange(tab as HTMLElement);
      });
    });

    // Initialize the UI with default CO-OP mode
    const defaultTab = document.querySelector('.game-mode-tab.active') as HTMLElement;
    if (defaultTab) {
      this.handleGameModeChange(defaultTab);
    }

    // Score increment/decrement buttons
    document.getElementById('score-increment')?.addEventListener('click', () => {
      this.changeScoreToWin(1);
    });

    document.getElementById('score-decrement')?.addEventListener('click', () => {
      this.changeScoreToWin(-1);
    });

    // Checkbox settings
    document.getElementById('powerups-enabled')?.addEventListener('change', (e) => {
      this.gameSettings.powerupsEnabled = (e.target as HTMLInputElement).checked;
    });

    document.getElementById('accelerate-on-hit')?.addEventListener('change', (e) => {
      this.gameSettings.accelerateOnHit = (e.target as HTMLInputElement).checked;
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
    document.addEventListener('wheel', (e: WheelEvent) => {
      // Only zoom when Ctrl key is pressed
      if (e.ctrlKey) {
        e.preventDefault();
        
        // Determine zoom direction
        const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
        const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + delta));
        
        if (newZoom !== currentZoom) {
          currentZoom = newZoom;
          this.applyZoom(currentZoom);
        }
      }
    }, { passive: false });

    // Handle Ctrl + Plus/Minus for zoom (keyboard shortcuts)
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          const newZoom = Math.min(maxZoom, currentZoom + zoomStep);
          if (newZoom !== currentZoom) {
            currentZoom = newZoom;
            this.applyZoom(currentZoom);
          }
        } else if (e.key === '-') {
          e.preventDefault();
          const newZoom = Math.max(minZoom, currentZoom - zoomStep);
          if (newZoom !== currentZoom) {
            currentZoom = newZoom;
            this.applyZoom(currentZoom);
          }
        } else if (e.key === '0') {
          e.preventDefault();
          currentZoom = 1.0;
          this.applyZoom(currentZoom);
        }
      }
    });
  }

  applyZoom(zoomLevel: number): void {
    const app = document.getElementById('app');
    if (app) {
      app.style.transform = `scale(${zoomLevel})`;
      app.style.transformOrigin = 'top left';
      
      // Adjust body size to accommodate zoom
      document.body.style.width = `${100 / zoomLevel}%`;
      document.body.style.height = `${100 / zoomLevel}%`;
      
      // Show zoom level indicator (optional)
      this.showZoomIndicator(zoomLevel);
    }
  }

  showZoomIndicator(zoomLevel: number): void {
    // Remove existing indicator
    const existingIndicator = document.getElementById('zoom-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

  }

  setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      const currentScreen = document.querySelector('.screen.active')?.id;

      switch (e.key) {
        case 'Backspace':
        case 'Escape':
          e.preventDefault();
          this.handleBackspaceShortcut(currentScreen);
          break;
        case 'Enter':
          e.preventDefault();
          this.handleEnterShortcut(currentScreen);
          break;
      }
    });
  }

  private handleBackspaceShortcut(currentScreen: string | undefined): void {
    if (!currentScreen) return;
    switch (currentScreen) {
      case 'register-screen':
        this.router.navigate('login');
        break;
      case 'forgot-password-screen':
        this.router.navigate('login');
        break;
      case 'main-menu-screen':
        this.handleLogout();
        break;
      case 'play-config-screen':
        this.router.navigate('main-menu');
        break;
      case 'settings-screen':
        this.router.navigate('main-menu');
        break;
      case 'profile-screen':
        this.router.navigate('main-menu');
        break;
      case 'game-screen': {
        const gameManager = (window as any).gameManager;
        if (gameManager && typeof gameManager.stopGame === 'function') {
          gameManager.stopGame();
        }
        break;
      }
    }
  }

  private handleEnterShortcut(currentScreen: string | undefined): void {
    switch (currentScreen) {
      case 'login-screen': {
        const loginSubmitBtn = document.querySelector('#login-form button[type="submit"]') as HTMLButtonElement;
        if (loginSubmitBtn) loginSubmitBtn.click();
        break;
      }
      case 'register-screen': {
        const registerSubmitBtn = document.querySelector('#register-form button[type="submit"]') as HTMLButtonElement;
        if (registerSubmitBtn) registerSubmitBtn.click();
        break;
      }
      case 'forgot-password-screen': {
        const forgotSubmitBtn = document.querySelector('#forgot-password-form button[type="submit"]') as HTMLButtonElement;
        if (forgotSubmitBtn) forgotSubmitBtn.click();
        break;
      }
      case 'main-menu-screen': {
        const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
        if (playBtn) playBtn.click();
        break;
      }
      case 'play-config-screen': {
        // Don't auto-start game with Enter - let user manually click start button
        // Focus on start game button for visual feedback
        const startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
        if (startGameBtn) startGameBtn.click();
        break;
      }
      case 'game-screen': {
        const pauseBtn = document.getElementById('pause-game-btn');
        if (pauseBtn instanceof HTMLButtonElement) {
          pauseBtn.click();
        }
        break;
      }
    }
  }

  setupChatWidget(): void {
    const chatButton = document.getElementById('chat-button');
    const chatCloseBtn = document.getElementById('chat-close-btn');
    if (!chatButton || !chatCloseBtn) return;
    chatButton.addEventListener('click', () => {
      expandChatWidget();
    });
    chatCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      collapseChatWidget();
    });
    // Handle Enter key in chat input
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const chatForm = document.getElementById('chat-form') as HTMLFormElement;
          if (chatForm) {
            chatForm.dispatchEvent(new Event('submit'));
          }
        }
      });
    }
    // Handle chat form submission
    const chatForm = document.getElementById('chat-form') as HTMLFormElement;
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendChatMessage();
      });
    }
    // Initially hide chat widget and update based on auth status
    hideChatWidget();
    this.updateChatVisibility();
  }

  private sendChatMessage(): void {
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const chatMessages = document.getElementById('chat-messages');
    
    if (chatInput && chatMessages) {
      const message = chatInput.value.trim();
      if (message) {
        // Add message to chat (basic implementation)
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.textContent = `You: ${message}`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Clear input
        chatInput.value = '';
        
        // Here you would typically send to WebSocket/server
        console.log('Chat message:', message);
      }
    }
  }

  // Chat widget helpers are now in ui.ts

  updateChatVisibility(): void {
    // Always hide chat widget on login and register screens
    const currentScreen = this.getCurrentScreen();
    if (currentScreen === 'login-screen' || currentScreen === 'register-screen') {
      hideChatWidget();
      return;
    }
    if (this.isAuthenticated()) {
      showChatWidget();
    } else {
      hideChatWidget();
    }
  }

  // Get current active screen
  private getCurrentScreen(): string | null {
    const activeScreen = document.querySelector('.screen.active');
    return activeScreen ? activeScreen.id : null;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const authManager = (window as any).authManager;
    if (!authManager) return false;
    
    const user = authManager.getCurrentUser();
    const token = localStorage.getItem('token');
    return !!(user && user.userId && token);
  }

  // Show screen directly (used by router)
  showScreenDirect(screenName: string): void {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Show target screen
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
      targetScreen.classList.add('active');
      this.currentScreen = screenName;
      // Debug: log when play-config-screen is activated
      if (screenName === 'play-config') {
        console.log('[DEBUG] play-config-screen activated');
        // Also visually highlight play-config-buttons for debug
        const playConfigButtons = document.querySelector('.play-config-buttons') as HTMLElement;
        if (playConfigButtons) {
          playConfigButtons.style.border = '4px solid lime';
          playConfigButtons.style.background = 'rgba(0,255,0,0.1)';
        }
      }
    }

    // Set body data attribute for CSS targeting
    document.body.setAttribute('data-current-screen', screenName);

    // Update chat visibility based on current screen and auth status
    this.updateChatVisibility();

    // Update UI based on screen
    if (screenName === 'play-config') {
      this.updatePlayConfigUI();
    } else if (screenName === 'profile') {
      this.loadProfileData();
    }
  }


  // Unified method: always use router.navigate(screenName) for screen changes
  // Remove any direct calls to showScreenDirect except from router

  async handleLogin(): Promise<void> {
    const usernameInput = document.getElementById('login-username') as HTMLInputElement;
    const passwordInput = document.getElementById('login-password') as HTMLInputElement;
    const username = usernameInput.value;
    const password = passwordInput.value;
    if (!username || !password) {
  showToast('Please fill in all fields', 'error');
      return;
    }
    try {
      const authManager = (window as any).authManager;
      const result: AuthResult = await handleHostLogin(username, password, authManager);
      if (result.success) {
        this.router.navigate('main-menu');
        this.updateUserDisplay();
        this.updateHostPlayerDisplay();
        this.updateChatVisibility();
        this.loginForm.reset();
      } else {
        authManager.currentUser = null;
        localStorage.removeItem('token');
  showToast('Login failed: ' + result.error, 'error');
      }
    } catch (error) {
  showToast('Login failed: Network error', 'error');
    }
  }

  async handleRegister(): Promise<void> {
    const usernameInput = document.getElementById('register-username') as HTMLInputElement;
    const emailInput = document.getElementById('register-email') as HTMLInputElement;
    const passwordInput = document.getElementById('register-password') as HTMLFormElement;
    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!username || !email || !password) {
  showToast('Please fill in all fields', 'error');
      return;
    }
    if (password.length < 6) {
  showToast('Password must be at least 6 characters long', 'error');
      return;
    }
    try {
      const authManager = (window as any).authManager;
      const result: AuthResult = await handleHostRegister(username, email, password, authManager);
      if (result.success) {
        this.router.navigate('main-menu');
        this.updateUserDisplay();
        this.updateHostPlayerDisplay();
        this.updateChatVisibility();
        this.registerForm.reset();
      } else {
  showToast('Registration failed: ' + result.error, 'error');
      }
    } catch (error) {
  showToast('Registration failed: Network error', 'error');
    }
  }

  async handleForgotPassword(): Promise<void> {
    const emailInput = document.getElementById('forgot-password-email') as HTMLInputElement;
    const email = emailInput.value.trim();
    if (!email) {
  showToast('Please enter your email address', 'error');
      return;
    }
    if (!email.includes('@')) {
  showToast('Please enter a valid email address', 'error');
      return;
    }
    try {
      const authManager = (window as any).authManager;
      const result: AuthResult = await authManager.forgotPassword(email);
      if (result.success) {
  showToast('Password reset link sent! Please check your email.', 'success');
        this.forgotPasswordForm.reset();
        this.router.navigate('login');
      } else {
  showToast('Failed to send reset email: ' + result.error, 'error');
      }
    } catch (error) {
  showToast('Failed to send reset email: Network error', 'error');
    }
  }

  handleLogout(): void {
    const authManager = (window as any).authManager;
    authManager.logout();
    this.router.navigate('login');
    this.localPlayers = [];
    this.updateChatVisibility();
  }

  async checkExistingLogin(): Promise<void> {
    const authManager = (window as any).authManager;
    if (!authManager) return;
    const isValid = await authManager.verifyToken();
    if (isValid) {
      const user = authManager.getCurrentUser();
      if (user) {
        this.router.navigate('main-menu');
        this.updateUserDisplay();
        this.updateHostPlayerDisplay();
        this.updateChatVisibility();
      }
    }
  }

  updateUserDisplay(): void {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    
    const userDisplay = document.getElementById('main-menu-user-display');
    if (userDisplay && user) {
      userDisplay.textContent = `Welcome, ${user.username}!`;
    }
  }

  updateHostPlayerDisplay(): void {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    
    const hostPlayerName = document.getElementById('host-player-name');
    if (hostPlayerName && user) {
      hostPlayerName.textContent = user.username;
    }
  }

  initializeLocalPlayers(): void {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    const token = localStorage.getItem('token') || '';
    if (user) {
      this.localPlayers = [{
        id: user.userId.toString(),
        username: user.username,
        isCurrentUser: true,
        userId: user.userId,
        token: token
      }];
    }
    this.updateLocalPlayersDisplay();
  }

  updateLocalPlayersDisplay(): void {
    const container = document.getElementById('local-players-list');
    if (!container) return;

    container.innerHTML = this.localPlayers.map(player => `
      <div class="player-item">
        <div class="player-info">
          <div class="player-name">${player.username}${player.isCurrentUser ? ' (You)' : ''}</div>
          <div class="player-status">${player.isCurrentUser ? 'Host' : 'Local Player'}</div>
        </div>
        ${!player.isCurrentUser ? '<button class="remove-player-btn" data-player-id="' + player.id + '">Remove</button>' : ''}
      </div>
    `).join('');

    // Add remove button listeners
    container.querySelectorAll('.remove-player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const playerId = btn.getAttribute('data-player-id');
        this.removeLocalPlayer(playerId || '');
      });
    });
  }

  handleConfigOption(button: HTMLElement): void {
    const setting = button.getAttribute('data-setting');
    const value = button.getAttribute('data-value');
    if (!setting || !value) return;

    // Remove active class from siblings
    const siblings = button.parentElement?.querySelectorAll('.config-option, .setting-option') || [];
    siblings.forEach(sibling => sibling.classList.remove('active'));
    button.classList.add('active');

    // Update settings (example: update gameSettings)
    if (setting in this.gameSettings) {
      (this.gameSettings as any)[setting] = value;
    }

    // Optionally trigger UI updates if needed
    // For mode changes, call handleGameModeChange
    if (setting === 'gameMode') {
      const tab = document.querySelector(`.game-mode-tab[data-mode="${value}"]`) as HTMLElement;
      if (tab) this.handleGameModeChange(tab);
    }
  }

  private updatePlayersForMode(mode: 'coop' | 'arcade' | 'tournament'): void {
    const currentUserCard = document.getElementById('current-user-card');
    const onlinePlayersSection = document.querySelector('.player-section:nth-child(2)') as HTMLElement;
    const localPlayersSection = document.querySelector('.player-section:nth-child(3)') as HTMLElement;
    const partySection = document.querySelector('.player-section:nth-child(4)') as HTMLElement;
    
    // Update host player display with username
    const hostPlayerName = document.getElementById('host-player-name');
    const authManager = (window as any).authManager;
    if (hostPlayerName && authManager && authManager.getCurrentUser()) {
      hostPlayerName.textContent = authManager.getCurrentUser().username;
    }

    // Handle mode-specific player setup
    switch (mode) {
      case 'coop':
        // CO-OP mode: HOST vs AI by default
        this.setupCoopMode();
        break;
      case 'arcade':
        // Arcade mode - local players only, allow adding players
        this.setupArcadeMode();
        break;
      case 'tournament':
        // Tournament mode - online players, allow adding players
        this.setupTournamentMode();
        this.populateOnlinePlayers();
        break;
    }
    
    // Initialize the game party display
    this.updateGamePartyDisplay();
  }

  private populateOnlinePlayers(): void {
    const onlinePlayersList = document.getElementById('online-players-list');
    const onlineCount = document.getElementById('online-count');
    
    if (!onlinePlayersList || !onlineCount) return;

    // Mock online players data - replace with real API call
    const mockOnlinePlayers = [
      { id: '2', username: 'player2', status: 'online' },
      { id: '3', username: 'player3', status: 'online' },
      { id: '4', username: 'player4', status: 'in-game' }
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
      onlinePlayersList.innerHTML = mockOnlinePlayers.map(player => `
        <div class="player-card" data-player-id="${player.id}">
          <div class="player-avatar">
            <i class="fas fa-user"></i>
          </div>
          <div class="player-info">
            <span class="player-name">${player.username}</span>
            <span class="player-status ${player.status}">${player.status}</span>
          </div>
        </div>
      `).join('');

      // Add click listeners for online players
      onlinePlayersList.querySelectorAll('.player-card').forEach(card => {
        card.addEventListener('click', () => {
          const playerId = card.getAttribute('data-player-id');
          const playerName = card.querySelector('.player-name')?.textContent;
          if (playerId && playerName) {
            this.invitePlayer(playerId, playerName);
          }
        });
      });
    }
  }

  private setupCoopMode(): void {
    // CO-OP mode: Ensure HOST and AI are active by default
    const hostPlayerCard = document.getElementById('host-player-card');
    const aiPlayerCard = document.getElementById('ai-player-card');
    
    if (hostPlayerCard) {
      hostPlayerCard.classList.add('active');
    }
    if (aiPlayerCard) {
      aiPlayerCard.classList.add('active');
    }
    
    // Hide add player buttons for CO-OP mode since it's HOST vs AI only
    const addPlayerButtons = document.querySelectorAll('.add-player-btn');
    addPlayerButtons.forEach(btn => {
      (btn as HTMLElement).style.display = 'none';
    });
    
    // Show CO-OP campaign progress UI
    const coopProgress = document.getElementById('coop-campaign-progress');
    if (coopProgress) {
      coopProgress.style.display = 'block';
    }
    
    // Update CO-OP progress UI to sync AI difficulty
    this.updateCoopProgressUI();
  }

  private setupTournamentMode(): void {
    // Tournament mode: Allow adding players, show add player buttons
    const addPlayerButtons = document.querySelectorAll('.add-player-btn');
    addPlayerButtons.forEach(btn => {
      (btn as HTMLElement).style.display = 'flex';
    });
    
    // Clear any default selections - let user choose
    const hostPlayerCard = document.getElementById('host-player-card');
    const aiPlayerCard = document.getElementById('ai-player-card');
    
    if (hostPlayerCard) {
      hostPlayerCard.classList.remove('active');
    }
    if (aiPlayerCard) {
      aiPlayerCard.classList.remove('active');
    }
    
    // Hide CO-OP campaign progress UI
    const coopProgress = document.getElementById('coop-campaign-progress');
    if (coopProgress) {
      coopProgress.style.display = 'none';
    }
  }

  private setupArcadeMode(): void {
    // Arcade mode: Allow adding players, show add player buttons
    const addPlayerButtons = document.querySelectorAll('.add-player-btn');
    addPlayerButtons.forEach(btn => {
      (btn as HTMLElement).style.display = 'flex';
    });

    // Clear any default selections - let user choose
    const hostPlayerCard = document.getElementById('host-player-card');
    const aiPlayerCard = document.getElementById('ai-player-card');

    if (hostPlayerCard) {
      hostPlayerCard.classList.remove('active');
    }
    if (aiPlayerCard) {
      aiPlayerCard.classList.remove('active');
    }

    // Hide CO-OP campaign progress UI
    const coopProgress = document.getElementById('coop-campaign-progress');
    if (coopProgress) {
      coopProgress.style.display = 'none';
    }

    // Re-attach add player button listeners for arcade mode
    this.setupAddPlayerButtons();
  }

  private invitePlayer(playerId: string, playerName: string): void {
    // TODO: Implement player invitation system
    console.log(`Inviting player ${playerName} (${playerId}) to game`);
    // For now, just show a notification
  showToast(`Invitation sent to ${playerName}!`, 'info');
  }

  changeScoreToWin(delta: number): void {
    if (this.gameSettings.gameMode !== 'arcade') return;

    const currentScore = this.gameSettings.scoreToWin || 5;
    const newScore = Math.max(1, Math.min(21, currentScore + delta)); // Limit between 1 and 21
    
    this.gameSettings.scoreToWin = newScore;
    
    // Update display
    const scoreDisplay = document.getElementById('score-value');
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
    const modal = document.getElementById('add-player-modal');
    const playerNicknameInput = document.getElementById('player-nickname') as HTMLInputElement;
    
    // Clear previous input and show modal
    if (playerNicknameInput) {
      playerNicknameInput.value = '';
      playerNicknameInput.focus();
    }
    
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  hideAddPlayerDialog(): void {
    const modal = document.getElementById('add-player-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // Local player registration is now handled in local-player.ts
  handleAddPlayerSubmit(event: Event): void {
    event.preventDefault();
    if ((window as any).registerAndHighlightLocalPlayer) {
      (window as any).registerAndHighlightLocalPlayer();
    } else {
  showToast('Local player registration system not available', 'error');
    }
  }

  // Local player registration modal logic is now handled in local-player.ts
  showRegistrationForLocalPlayer(): void {
    if ((window as any).showLocalPlayerRegisterModal) {
      (window as any).showLocalPlayerRegisterModal();
    } else {
  showToast('Local player registration modal not available', 'error');
    }
  }

  createAIPlayerCard(): HTMLElement {
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card ai-player active'; // AI player is active by default
    playerCard.dataset.playerId = 'ai-player';
    playerCard.innerHTML = [
      '<div class="player-avatar"><i class="fas fa-robot"></i></div>',
      '<div class="player-info">',
        '<span class="player-name">AI Player</span>',
        '<span class="role-badge ai">Computer</span>',
      '</div>'
    ].join('');
    // Add click handler for AI player selection
    playerCard.addEventListener('click', () => this.togglePlayerSelection(playerCard, 'ai'));
    return playerCard;
  }

  togglePlayerSelection(playerCard: HTMLElement, playerType: string): void {
    playerCard.classList.toggle('active');
    
    // Update selected players state for game logic
    const playerId = playerCard.dataset.playerId || playerType;
    
    if (playerCard.classList.contains('active')) {
      console.log(`Player ${playerId} selected for game`);
    } else {
      console.log(`Player ${playerId} deselected from game`);
    }
  }

  initializePlayerSelection(): void {
    // Set up AI difficulty change handler to update AI player display
    const aiDifficultyButtons = document.querySelectorAll('.setting-option[data-setting="ai-difficulty"]');
    aiDifficultyButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update display after AI difficulty changes
        setTimeout(() => this.updateGamePartyDisplay(), 100);
      });
    });

    // Add click handlers for host and AI player cards
    const hostPlayerCard = document.getElementById('host-player-card');
    if (hostPlayerCard) {
      hostPlayerCard.addEventListener('click', () => this.togglePlayerSelection(hostPlayerCard, 'host'));
    }

    const aiPlayerCard = document.getElementById('ai-player-card');
    if (aiPlayerCard) {
      aiPlayerCard.addEventListener('click', () => this.togglePlayerSelection(aiPlayerCard, 'ai'));
    }
  }

  async startGame(): Promise<void> {
    console.log('Starting game with settings:', this.gameSettings);
    console.log('Local players:', this.localPlayers);

    // Update game UI with player information
    this.updateGameUI();

  // Show game screen
  this.router.navigate('game');

    // Start the actual game
    const gameManager = (window as any).gameManager;
    if (gameManager && typeof gameManager.startBotMatch === 'function') {
      await gameManager.startBotMatch();
    } else {
      console.error('GameManager not available');
      showToast('Game system not available', 'error');
      this.router.navigate('play-config');
    }
  }

  updateGameUI(): void {
    // All UI rendering is now handled directly on canvas in game.ts
    // No need to update HTML elements for player info and scores
    console.log('Game UI update - rendering handled on canvas');
  }

  stopGame(): void {
    console.log('Stopping game');
    
    const gameManager = (window as any).gameManager;
    if (gameManager && typeof gameManager.stopGame === 'function') {
      gameManager.stopGame();
    }
    
    // Navigation is now handled by gameManager.stopGame()
  }

  pauseGame(): void {
    console.log('Pausing/Resuming game');
    
    const gameManager = (window as any).gameManager;
    if (gameManager && typeof gameManager.pauseGame === 'function') {
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
      console.error('Failed to load profile data:', error);
      // Fallback to basic user info
      this.updateBasicProfileInfo(user);
    }
  }

  private async loadBasicStats(userId: number): Promise<void> {
    const authManager = (window as any).authManager;
    const headers = authManager.getAuthHeaders();
    
    try {
      // Load profile stats
      const statsResponse = await fetch(`/api/game/stats/${userId}`, { headers });
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
          rank: '--'
        });
      }
    } catch (error) {
      console.error('Failed to load basic stats:', error);
    }
  }

  updateBasicProfileInfo(user: User): void {
    const usernameEl = document.getElementById('profile-username');
    const userIdEl = document.getElementById('profile-user-id');
    const memberSinceEl = document.getElementById('profile-member-since');

    if (usernameEl) usernameEl.textContent = user.username;
    if (userIdEl) userIdEl.textContent = `User ID: ${user.userId}`;
    if (memberSinceEl) memberSinceEl.textContent = 'Member since: Recent';
  }

  updateProfileStats(stats: any): void {
    // Update stat values
    const totalGamesEl = document.getElementById('profile-total-games');
    const winsEl = document.getElementById('profile-wins');
    const winRateEl = document.getElementById('profile-win-rate');
    const streakEl = document.getElementById('profile-streak');
    const tournamentsEl = document.getElementById('profile-tournaments');
    const rankEl = document.getElementById('profile-rank');

    if (totalGamesEl) totalGamesEl.textContent = stats.total_games?.toString() || '0';
    if (winsEl) winsEl.textContent = stats.wins?.toString() || '0';
    if (winRateEl) winRateEl.textContent = `${Math.round(stats.win_rate || 0)}%`;
    if (streakEl) streakEl.textContent = stats.streak?.toString() || '0';
    if (tournamentsEl) tournamentsEl.textContent = stats.tournaments?.toString() || '0';
    if (rankEl) rankEl.textContent = stats.rank ? `#${stats.rank}` : '#--';

    // Update level and experience (calculated from total games)
    const level = Math.floor((stats.total_games || 0) / 10) + 1;
    const expInLevel = (stats.total_games || 0) % 10;
    const expNeeded = 10;
    const expPercentage = (expInLevel / expNeeded) * 100;

    const levelEl = document.getElementById('profile-level');
    const expBarEl = document.getElementById('profile-exp-bar');
    const expTextEl = document.getElementById('profile-exp-text');
    // Add a combined level+XP element if present
    const levelXpEl = document.getElementById('profile-level-xp');

    if (levelEl) levelEl.textContent = `Level: ${level}`;
    if (expBarEl) expBarEl.style.width = `${expPercentage}%`;
    if (expTextEl) expTextEl.textContent = `XP: ${expInLevel * 100} / ${expNeeded * 100}`;
    if (levelXpEl) levelXpEl.textContent = `Level ${level} | XP: ${expInLevel * 100} / ${expNeeded * 100}`;
  }

  updateRecentActivity(activities: any[]): void {
    const container = document.getElementById('profile-recent-activity');
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

    container.innerHTML = activities.slice(0, 5).map(activity => {
      const timeAgo = this.formatTimeAgo(new Date(activity.created_at || Date.now()));
      const result = activity.won ? 'Won' : 'Lost';
      const resultClass = activity.won ? 'win' : 'loss';
      
      return `
        <div class="activity-item">
          <span class="activity-text">
            <span class="${resultClass}">${result}</span> game vs ${activity.opponent || 'AI'}
          </span>
          <span class="activity-time">${timeAgo}</span>
        </div>
      `;
    }).join('');
  }

  updateAchievements(): void {
    const container = document.getElementById('profile-achievements');
    if (!container) return;

    const achievements = [
      { icon: '🎮', title: 'First Game', desc: 'Play your first game', unlocked: true },
      { icon: '🏆', title: 'First Victory', desc: 'Win your first game', unlocked: false },
      { icon: '🔥', title: 'Hot Streak', desc: 'Win 5 games in a row', unlocked: false },
      { icon: '💯', title: 'Century', desc: 'Play 100 games', unlocked: false },
      { icon: '🏅', title: 'Champion', desc: 'Win a tournament', unlocked: false },
      { icon: '⚡', title: 'Speed Demon', desc: 'Win with fast ball speed', unlocked: false }
    ];

    container.innerHTML = achievements.map(achievement => `
      <div class="achievement-card ${achievement.unlocked ? '' : 'locked'}">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-info">
          <h4>${achievement.title}</h4>
          <p>${achievement.desc}</p>
        </div>
      </div>
    `).join('');
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
    return 'Just now';
  }

  updateCoopProgressUI(): void {
    const level = getCoopLevel();
    const levelLabel = document.getElementById('coop-level-label');
    const nextAI = document.getElementById('coop-next-ai');
    const desc = document.getElementById('coop-campaign-desc');
    let label = '', next = '', descText = '';
    if (level === 1) { label = 'Level 1: Easy'; next = 'Next: Medium AI'; descText = 'Easy'; }
    else if (level === 2) { label = 'Level 2: Medium'; next = 'Next: Hard AI'; descText = 'Medium'; }
    else { label = 'Level 3: Hard'; next = 'Max level!'; descText = 'Hard'; }
    if (levelLabel) levelLabel.textContent = label;
    if (nextAI) nextAI.textContent = next;
    if (desc) desc.textContent = descText;
    // Sync AI difficulty to level
    this.gameSettings.aiDifficulty = (level === 1 ? 'easy' : level === 2 ? 'medium' : 'hard');
    // Update AI difficulty button UI
    document.querySelectorAll('.setting-option[data-setting="ai-difficulty"]').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-value') === this.gameSettings.aiDifficulty) btn.classList.add('active');
    });
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  (window as any).app = new App();
});