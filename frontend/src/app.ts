import { showToast } from './toast';

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
    
    // Update the game settings with the new mode
    this.gameSettings.gameMode = mode;
    
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
    playerCard.dataset.email = player.email || ''; // Store email for duplicate checking
    
    // Make player card draggable in arcade mode
    playerCard.draggable = true;
    playerCard.dataset.team = (player as any).team || '1';
    
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
    
    // Add drag event listeners
    playerCard.addEventListener('dragstart', this.handleDragStart.bind(this));
    playerCard.addEventListener('dragend', this.handleDragEnd.bind(this));
    
    // Remove button event
    playerCard.querySelector('.remove-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeLocalPlayer(player.id);
    });
    // Selection is handled via event delegation on the party container
    return playerCard;
  }

  removeLocalPlayer(playerId: string): void {
    this.localPlayers = this.localPlayers.filter(player => player.id !== playerId);
    this.updateGamePartyDisplay();
  }
  updateGamePartyDisplay(): void {
    const team1List = document.getElementById('team1-list');
    const team2List = document.getElementById('team2-list');
    const tournamentLocalContainer = document.getElementById('tournament-local-players');
    
    console.log('[updateGamePartyDisplay] Current mode:', this.gameSettings.gameMode);
    console.log('[updateGamePartyDisplay] Tournament container exists:', !!tournamentLocalContainer);
    console.log('[updateGamePartyDisplay] Local players count:', this.localPlayers.length);
    
    // Clear tournament local players if it exists
    if (tournamentLocalContainer) {
      tournamentLocalContainer.innerHTML = '';
      console.log('[updateGamePartyDisplay] Cleared tournament local container');
    }

    // Check current game mode to determine which container to update
    const currentMode = this.gameSettings.gameMode;
    
    // If we're in tournament mode, show ALL local players (from any mode)
    if (currentMode === 'tournament' && tournamentLocalContainer) {
      console.log('[updateGamePartyDisplay] Adding ALL local players to tournament container');
      
      // CRITICAL: Ensure host name is correct before updating players
      const hostPlayerNameTournament = document.getElementById('host-player-name-tournament');
      const authManager = (window as any).authManager;
      if (hostPlayerNameTournament && authManager && authManager.getCurrentUser()) {
        const currentUsername = authManager.getCurrentUser().username;
        console.log('[updateGamePartyDisplay] Ensuring tournament host name is:', currentUsername);
        hostPlayerNameTournament.textContent = currentUsername;
      }
      
      this.localPlayers.forEach((player, index) => {
        const playerCard = this.createPlayerCard(player);
        const playerId = player.id?.toString();
        console.log(`[updateGamePartyDisplay] Adding player ${index}:`, player.username, 'ID:', playerId);
        tournamentLocalContainer.appendChild(playerCard);
        
        // Restore highlight if this player is selected
        if (playerId && this.selectedPlayerIds.has(playerId)) {
          playerCard.classList.add('active');
        } else {
          playerCard.classList.remove('active');
        }
      });
      console.log('[updateGamePartyDisplay] Tournament container children count:', tournamentLocalContainer.children.length);
      return;
    }

    // If we're not in arcade mode (coop or mode without team lists), return early
    if (!team1List || !team2List) {
      console.log('[updateGamePartyDisplay] Not in arcade mode, returning early');
      return;
    }

    // Clear local players from both teams (keep host and AI)
    const team1LocalContainer = document.getElementById('team1-local-players');
    if (team1LocalContainer) team1LocalContainer.innerHTML = '';

    // For TEAM 2, clear any local players after AI
    let team2LocalContainer = document.getElementById('team2-local-players');
    if (team2LocalContainer) {
      team2LocalContainer.innerHTML = '';
    } else {
      // Create container if it doesn't exist
      team2LocalContainer = document.createElement('div');
      team2LocalContainer.id = 'team2-local-players';
      team2LocalContainer.className = 'local-players';
      // Insert after AI card
      const aiCard = document.getElementById('ai-player-card');
      if (aiCard && aiCard.parentNode) {
        aiCard.parentNode.insertBefore(team2LocalContainer, aiCard.nextSibling);
      }
    }

    // Add local players to their respective teams (arcade mode only - filter out tournament players)
    this.localPlayers.forEach(player => {
      // Skip tournament players in arcade mode
      if ((player as any).team === 'tournament') {
        console.log('[updateGamePartyDisplay] Skipping tournament player in arcade mode:', player.username);
        return;
      }
      
      const playerCard = this.createPlayerCard(player);
      const playerId = player.id?.toString();
      
      // Determine which team container to use
      const team = (player as any).team || 1; // Default to team 1 if not specified
      const targetContainer = team === 2 ? team2LocalContainer : team1LocalContainer;
      
      if (targetContainer) {
        targetContainer.appendChild(playerCard);
        // Restore highlight if this player is selected
        if (playerId && this.selectedPlayerIds.has(playerId)) {
          playerCard.classList.add('active');
        } else {
          playerCard.classList.remove('active');
        }
      }
    });
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

    // NOTE: Co-op / campaign progression is handled inside the GameManager
    // (frontend/src/game.ts) when a campaign match ends. Avoid changing
    // campaign level or auto-starting the next match here to prevent
    // duplicate starts. This method only submits results to the backend.
  }

  // Note: campaign continuation is handled by the GameManager (game.ts).
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
  // Persisted set of selected player ids (used to restore highlights after re-renders)
  private selectedPlayerIds: Set<string> = new Set();
  // Prevent double-registration of party click handlers
  private playerSelectionInitialized: boolean = false;
  // Debounce map to prevent double-clicks on same card
  private lastClickTimestamps: Map<string, number> = new Map();
  // Debounce for start game button
  private lastStartGameClick: number = 0;
  // Prevent duplicate event listener setup
  private eventListenersInitialized: boolean = false;

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
    console.log('🏗️ [App] Constructor called - Creating new App instance');
    console.trace();
    this.router = new Router(this);
    this.init();
    // Setup local player modals (now directly in index.html)
    console.log('[App] Setting up local player modals...');
    setupLocalPlayerLoginModal(this);
    setupLocalPlayerRegisterModal(this);
    this.setupAddPlayerButtons();
    console.log('[App] Local player modal setup complete');
  }

  setupAddPlayerButtons() {
    console.log('[App] Setting up add player buttons...');

    // TEAM 1 add player button
    const addTeam1Btn = document.getElementById('add-team1-player-btn');
    if (addTeam1Btn) {
      // Remove old listener by cloning
      const newBtn1 = addTeam1Btn.cloneNode(true) as HTMLElement;
      addTeam1Btn.parentNode?.replaceChild(newBtn1, addTeam1Btn);
      
      newBtn1.addEventListener('click', () => {
        console.log('🎮 [App] TEAM 1 Add Player button clicked');
        (window as any).addPlayerTeam = 1;
        console.log('[App] Set addPlayerTeam = 1, calling showLocalPlayerLoginModal()');
        showLocalPlayerLoginModal();
      });
      console.log('✅ [App] TEAM 1 add player button listener registered');
    } else {
      console.warn('⚠️ [App] TEAM 1 add player button (#add-team1-player-btn) not found');
    }
    
    // TEAM 2 add player button
    const addTeam2Btn = document.getElementById('add-team2-player-btn');
    if (addTeam2Btn) {
      // Remove old listener by cloning
      const newBtn2 = addTeam2Btn.cloneNode(true) as HTMLElement;
      addTeam2Btn.parentNode?.replaceChild(newBtn2, addTeam2Btn);
      
      newBtn2.addEventListener('click', () => {
        console.log('🎮 [App] TEAM 2 Add Player button clicked');
        (window as any).addPlayerTeam = 2;
        console.log('[App] Set addPlayerTeam = 2, calling showLocalPlayerLoginModal()');
        showLocalPlayerLoginModal();
      });
      console.log('✅ [App] TEAM 2 add player button listener registered');
    } else {
      console.warn('⚠️ [App] TEAM 2 add player button (#add-team2-player-btn) not found');
    }
  }

  async init(): Promise<void> {
    // IMMEDIATELY hide chat widget before any other logic
    // forceHideChatWidget();
    
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

  // Ensure add-player buttons are wired immediately so UI is responsive
  // even before optional modal HTML is fetched/inserted.
  this.setupAddPlayerButtons();
    
    // Setup chat widget (this will also hide it again)
    // this.setupChatWidget();
    
    // Initialize local players with current user
    this.initializeLocalPlayers();
    
    // Initialize coop mode as default (ensure party list is visible)
    console.log('[App.init] Setting up default coop mode');
    this.gameSettings.gameMode = 'coop';
    this.setupCoopMode();

    // Check authentication and update chat visibility
    await this.checkExistingLogin();

    // Navigate to initial route based on URL and auth state
    const initialRoute = this.router.getInitialRoute();
    this.router.navigateToPath(initialRoute, false);

    // Pause game when user navigates away from the game screen or when
    // the page becomes hidden. Stop the game on page unload to ensure
    // no background matches continue running.
    document.addEventListener('visibilitychange', () => {
      try {
        const gm = (window as any).gameManager;
        if (document.hidden && gm && gm.isPlaying && !gm.isPaused && typeof gm.pauseGame === 'function') {
          console.log('App: Page hidden — pausing game');
          gm.pauseGame();
        }
      } catch (e) {
        console.warn('App: visibilitychange handler failed', e);
      }
    });

    window.addEventListener('pagehide', () => {
      try {
        const gm = (window as any).gameManager;
        if (gm && gm.isPlaying && typeof gm.pauseGame === 'function' && !gm.isPaused) {
          console.log('App: pagehide — pausing game');
          gm.pauseGame();
        }
      } catch (e) {
        console.warn('App: pagehide handler failed', e);
      }
    });

    window.addEventListener('beforeunload', (e) => {
      try {
        const gm = (window as any).gameManager;
        if (gm && gm.isPlaying && typeof gm.stopGame === 'function') {
          console.log('App: beforeunload — stopping game');
          gm.stopGame();
        }
      } catch (err) {
        console.warn('App: beforeunload handler failed', err);
      }
      // No need to call preventDefault; just allow unload.
    });
  }

  setupEventListeners(): void {
    // GUARD: Prevent duplicate event listener registration
    if (this.eventListenersInitialized) {
      console.warn('⚠️ setupEventListeners already called, skipping duplicate registration');
      return;
    }
    this.eventListenersInitialized = true;
    console.log('✅ Initializing event listeners for the first time');

    // Old add-player-modal event listeners removed - now using local-player modals
    
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
      console.log('🔵 [EventListener] start-game-btn clicked!');
      this.startGame();
    });

    // Team-specific add player buttons are now handled in setupAddPlayerButtons()
    // (called after modal setup in constructor)

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
      console.log('🛑 [UI] Stop button clicked');
      const gameManager = (window as any).gameManager;
      if (gameManager && typeof gameManager.stopGame === 'function') {
        gameManager.stopGame();
      }
    });

    // Pause button - don't wrap in DOMContentLoaded since we're already in setupEventListeners
    const pauseBtn = document.getElementById('pause-game-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        console.log('⏸️ [UI] Pause button clicked');
        const gameManager = (window as any).gameManager;
        if (gameManager && typeof gameManager.pauseGame === 'function') {
          gameManager.pauseGame();
        }
      });
    } else {
      console.warn('⚠️ [UI] Pause button not found during setup');
    }

    // Old Add Player Modal event listeners removed - now using local-player modals

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
          e.preventDefault();
          this.handleBackspaceShortcut(currentScreen);
          break;
        case 'Escape':
            e.preventDefault();
            // Clean up campaign modals and stop any running game
            const gameManager = (window as any).gameManager;
            if (gameManager) {
              // Clean up any campaign modals that might be visible
              if (typeof gameManager.cleanupCampaignModals === 'function') {
                gameManager.cleanupCampaignModals();
              }
              // Stop the game if it's running
              if (gameManager.isPlaying && typeof gameManager.stopGame === 'function') {
                gameManager.stopGame();
              }
            }
          this.router.navigate('login');
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
        if (gameManager) {
          // Clean up any campaign modals that might be visible
          if (typeof gameManager.cleanupCampaignModals === 'function') {
            gameManager.cleanupCampaignModals();
          }
          // Stop the game if it's running
          if (typeof gameManager.stopGame === 'function') {
            gameManager.stopGame();
          }
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
        if (startGameBtn) startGameBtn.focus();
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

    // When navigating away from play-config, hide all party frames
    if (screenName !== 'play-config') {
      const coopPartyFrame = document.getElementById('coop-party-frame');
      const tournamentPartyFrame = document.getElementById('tournament-party-frame');
      const teamsRow = document.getElementById('teams-row');
      
      if (coopPartyFrame) coopPartyFrame.style.display = 'none';
      if (tournamentPartyFrame) tournamentPartyFrame.style.display = 'none';
      if (teamsRow) teamsRow.style.display = 'none';
    } else {
      // When navigating TO play-config, show the party frame for the current mode
      console.log('[showScreenDirect] Showing party frame for mode:', this.gameSettings.gameMode);
      this.updatePlayersForMode(this.gameSettings.gameMode);
    }

    // Set body data attribute for CSS targeting
    document.body.setAttribute('data-current-screen', screenName);

    // Update chat visibility based on current screen and auth status
    // this.updateChatVisibility();

    // Update UI based on screen
    if (screenName === 'play-config') {
      this.updatePlayConfigUI();
    } else if (screenName === 'profile') {
      this.loadProfileData();
    }

    // If we navigated away from the game screen, ensure the game is stopped
    // (stop vs pause: stopping guarantees no background RAF/intervals/sockets remain)
    if (screenName !== 'game') {
      try {
        const gm = (window as any).gameManager;
        if (gm) {
          // Clean up any campaign modals that might be visible
          if (typeof gm.cleanupCampaignModals === 'function') {
            gm.cleanupCampaignModals();
          }
          // Stop the game if it's running
          if (gm.isPlaying && typeof gm.stopGame === 'function') {
            console.log('App: Navigated away from game screen — stopping game');
            gm.stopGame();
          }
        }
      } catch (e) {
        console.warn('App: failed to stop game on navigation', e);
      }
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
        // this.updateChatVisibility();
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
        // this.updateChatVisibility();
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
    // this.updateChatVisibility();
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
        // this.updateChatVisibility();
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

  // Helper to get the actual host user (not a local player)
  private getHostUser(): { userId: number; username: string } | null {
    const authManager = (window as any).authManager;
    if (!authManager) return null;
    
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return null;
    
    // Verify this user matches the stored token
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      // This is the host user (token holder)
      return currentUser;
    }
    
    return currentUser;
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
    
    // IMPORTANT: Do NOT add the host user to localPlayers array
    // The host is displayed separately in the host-player-card elements
    // localPlayers should only contain additional local players that are added via the "Add Player" button
    console.log('[App] Initializing localPlayers array (empty - host is not a local player)');
    this.localPlayers = [];
    
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

    // Convert hyphenated setting names to camelCase for gameSettings object
    const settingMap: { [key: string]: string } = {
      'ai-difficulty': 'aiDifficulty',
      'ball-speed': 'ballSpeed',
      'paddle-speed': 'paddleSpeed',
      'powerups-enabled': 'powerupsEnabled',
      'accelerate-on-hit': 'accelerateOnHit',
      'gameMode': 'gameMode'
    };
    
    const settingKey = settingMap[setting] || setting;

    // Update settings
    if (settingKey in this.gameSettings) {
      (this.gameSettings as any)[settingKey] = value;
      console.log(`⚙️ [SETTINGS] Updated ${settingKey} to ${value}`, this.gameSettings);
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
    console.log('[updatePlayersForMode] mode:', mode, 'authManager.currentUser:', authManager?.currentUser);
    if (hostPlayerName && authManager && authManager.getCurrentUser()) {
      const currentUsername = authManager.getCurrentUser().username;
      console.log('[updatePlayersForMode] Setting arcade host name to:', currentUsername);
      hostPlayerName.textContent = currentUsername;
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
    
    // Initialize the game party display and sync score
    this.updateGamePartyDisplay();
    this.updateScoreDisplay(); // Sync score display with gameSettings
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
    // CO-OP mode: Show single party frame with HOST and AI
    const coopPartyFrame = document.getElementById('coop-party-frame');
    const tournamentPartyFrame = document.getElementById('tournament-party-frame');
    const teamsRow = document.getElementById('teams-row');
    
    // Show coop frame, hide others
    if (coopPartyFrame) coopPartyFrame.style.display = 'block';
    if (tournamentPartyFrame) tournamentPartyFrame.style.display = 'none';
    if (teamsRow) teamsRow.style.display = 'none';
    
    // Activate host and AI cards in coop frame
    const hostPlayerCardCoop = document.getElementById('host-player-card-coop');
    const aiPlayerCardCoop = document.getElementById('ai-player-card-coop');
    const hostPlayerNameCoop = document.getElementById('host-player-name-coop');
    
    // Update host name in coop frame
    const authManager = (window as any).authManager;
    const hostUser = this.getHostUser();
    console.log('[setupCoopMode] hostUser:', hostUser);
    if (hostPlayerNameCoop && hostUser) {
      console.log('[setupCoopMode] Setting host name to:', hostUser.username);
      hostPlayerNameCoop.textContent = hostUser.username;
    }
    
    if (hostPlayerCardCoop) {
      hostPlayerCardCoop.classList.add('active');
      // persist host selection
      try {
        if (hostUser && hostUser.userId) this.selectedPlayerIds.add(String(hostUser.userId));
      } catch (e) { /* ignore */ }
    }
    if (aiPlayerCardCoop) {
      aiPlayerCardCoop.classList.add('active');
      this.selectedPlayerIds.add('ai-player');
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
    // Tournament mode: Show single party frame with host + add player button
    const coopPartyFrame = document.getElementById('coop-party-frame');
    const tournamentPartyFrame = document.getElementById('tournament-party-frame');
    const teamsRow = document.getElementById('teams-row');
    
    // Hide coop frame and teams, show tournament frame
    if (coopPartyFrame) coopPartyFrame.style.display = 'none';
    if (tournamentPartyFrame) tournamentPartyFrame.style.display = 'block';
    if (teamsRow) teamsRow.style.display = 'none';
    
    // Update host player name in tournament frame
    const hostPlayerNameTournament = document.getElementById('host-player-name-tournament');
    const hostUser = this.getHostUser();
    console.log('[setupTournamentMode] hostUser:', hostUser);
    if (hostPlayerNameTournament && hostUser) {
      console.log('[setupTournamentMode] Setting host name to:', hostUser.username);
      hostPlayerNameTournament.textContent = hostUser.username;
    }
    
    // Set host as active and selected by default
    const hostPlayerCardTournament = document.getElementById('host-player-card-tournament');
    if (hostPlayerCardTournament) {
      hostPlayerCardTournament.classList.add('active');
      try {
        if (hostUser && hostUser.userId) this.selectedPlayerIds.add(String(hostUser.userId));
      } catch (e) { /* ignore */ }
    }
    
    // Show the add player button for tournament mode
    const addTournamentPlayerBtn = document.getElementById('add-tournament-player-btn');
    if (addTournamentPlayerBtn) {
      addTournamentPlayerBtn.style.display = 'flex';
      
      // Attach event listener for tournament add player button
      addTournamentPlayerBtn.removeEventListener('click', this.handleAddTournamentPlayer);
      addTournamentPlayerBtn.addEventListener('click', this.handleAddTournamentPlayer.bind(this));
    }
    
    // Hide CO-OP campaign progress UI
    const coopProgress = document.getElementById('coop-campaign-progress');
    if (coopProgress) {
      coopProgress.style.display = 'none';
    }
    
    // Display local players that were added in arcade mode (they should appear in tournament too)
    this.updateGamePartyDisplay();
  }

  private handleAddTournamentPlayer = (e: Event) => {
    e.stopPropagation();
    console.log('[handleAddTournamentPlayer] Setting addPlayerTeam to "tournament"');
    (window as any).addPlayerTeam = 'tournament'; // Mark as tournament mode (not arcade team)
    showLocalPlayerLoginModal();
  };

  private setupArcadeMode(): void {
    // Arcade mode: Show team-based layout
    const coopPartyFrame = document.getElementById('coop-party-frame');
    const tournamentPartyFrame = document.getElementById('tournament-party-frame');
    const teamsRow = document.getElementById('teams-row');
    
    // Hide coop and tournament frames, show teams
    if (coopPartyFrame) coopPartyFrame.style.display = 'none';
    if (tournamentPartyFrame) tournamentPartyFrame.style.display = 'none';
    if (teamsRow) teamsRow.style.display = 'flex';
    
    // Arcade mode: Allow adding players, show add player buttons
    const addPlayerButtons = document.querySelectorAll('.add-player-btn');
    addPlayerButtons.forEach(btn => {
      (btn as HTMLElement).style.display = 'flex';
    });

    // Keep host selected by default (as per requirement)
    const hostPlayerCard = document.getElementById('host-player-card');
    const aiPlayerCard = document.getElementById('ai-player-card');

    // Ensure host is active by default in arcade mode
    if (hostPlayerCard) {
      hostPlayerCard.classList.add('active');
      try {
        const hostUser = this.getHostUser();
        if (hostUser && hostUser.userId) this.selectedPlayerIds.add(String(hostUser.userId));
      } catch (e) { /* ignore */ }
    }
    
    // Remove AI player selection in arcade mode
    if (aiPlayerCard) {
      aiPlayerCard.classList.remove('active');
      this.selectedPlayerIds.delete('ai-player');
    }

    // Hide CO-OP campaign progress UI
    const coopProgress = document.getElementById('coop-campaign-progress');
    if (coopProgress) {
      coopProgress.style.display = 'none';
    }

    // Setup drag-and-drop for team lists
    this.setupDragAndDrop();
    
    // Setup drag for host and AI AFTER team lists are set up
    this.setupHostAndAIDrag();

    // Re-attach add player button listeners for arcade mode
    this.setupAddPlayerButtons();
  }
  
  private setupHostAndAIDrag(): void {
    // Make host draggable (re-query after potential DOM updates)
    const hostPlayerCard = document.getElementById('host-player-card');
    if (hostPlayerCard) {
      hostPlayerCard.addEventListener('dragstart', this.handleDragStart.bind(this));
      hostPlayerCard.addEventListener('dragend', this.handleDragEnd.bind(this));
      console.log('[DragDrop] Host player drag listeners attached');
    }
    
    // Make AI draggable (re-query after potential DOM updates)
    const aiPlayerCard = document.getElementById('ai-player-card');
    if (aiPlayerCard) {
      aiPlayerCard.addEventListener('dragstart', this.handleDragStart.bind(this));
      aiPlayerCard.addEventListener('dragend', this.handleDragEnd.bind(this));
      console.log('[DragDrop] AI player drag listeners attached');
    }
  }

  private setupDragAndDrop(): void {
    const team1List = document.getElementById('team1-list');
    const team2List = document.getElementById('team2-list');
    
    if (!team1List || !team2List) {
      console.warn('[DragDrop] Team lists not found');
      return;
    }
    
    // Add drop zone event listeners to both team lists
    // Note: We bind each time but the handlers are idempotent
    [team1List, team2List].forEach(list => {
      list.addEventListener('dragover', this.handleDragOver.bind(this));
      list.addEventListener('dragleave', this.handleDragLeave.bind(this));
      list.addEventListener('drop', this.handleDrop.bind(this));
    });
    
    console.log('[DragDrop] Setup complete for team lists');
  }

  private invitePlayer(playerId: string, playerName: string): void {
    // TODO: Implement player invitation system
    console.log(`Inviting player ${playerName} (${playerId}) to game`);
    // For now, just show a notification
  showToast(`Invitation sent to ${playerName}!`, 'info');
  }

  // Drag and Drop handlers for arcade mode team management
  private draggedElement: HTMLElement | null = null;
  
  private handleDragStart(e: DragEvent): void {
    const target = e.target as HTMLElement;
    this.draggedElement = target;
    target.classList.add('dragging');
    
    const playerId = target.dataset.playerId;
    if (e.dataTransfer && playerId) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', playerId);
    }
    
    console.log('[DragDrop] Started dragging player:', playerId);
  }
  
  private handleDragEnd(e: DragEvent): void {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
    this.draggedElement = null;
    
    // Remove drag-over styling from all team lists
    document.querySelectorAll('.team-list').forEach(list => {
      list.classList.remove('drag-over');
    });
    
    console.log('[DragDrop] Drag ended');
  }
  
  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }
  
  private handleDragLeave(e: DragEvent): void {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }
  
  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
    
    const playerId = e.dataTransfer?.getData('text/plain');
    if (!playerId || !this.draggedElement) {
      console.warn('[DragDrop] No player ID or dragged element');
      return;
    }
    
    // Determine which team this list belongs to
    const teamListId = target.id; // 'team1-list' or 'team2-list'
    const newTeam = teamListId === 'team1-list' ? 1 : 2;
    const targetTeamList = document.getElementById(teamListId);
    
    console.log('[DragDrop] Dropping player', playerId, 'into team', newTeam);
    
    // Handle special cases: host and AI players
    if (playerId === 'host-player' || playerId === 'ai-player') {
      const cardElement = this.draggedElement;
      const currentParent = cardElement.parentElement;
      const currentTeam = currentParent?.id === 'team1-list' ? 1 : 2;
      
      if (currentTeam === newTeam) {
        console.log('[DragDrop] Player already in this team');
        return;
      }
      
      // Move the card to the new team list (at the beginning)
      if (targetTeamList) {
        targetTeamList.insertBefore(cardElement, targetTeamList.firstChild);
        const playerName = playerId === 'host-player' ? 'Host' : 'AI';
        showToast(`${playerName} moved to Team ${newTeam}`, 'success');
        console.log(`[DragDrop] Moved ${playerName} to Team ${newTeam}`);
      }
      return;
    }
    
    // Handle regular local players
    const player = this.localPlayers.find(p => p.id === playerId);
    if (player) {
      const oldTeam = (player as any).team || 1;
      if (oldTeam === newTeam) {
        console.log('[DragDrop] Player already in this team');
        return;
      }
      
      (player as any).team = newTeam;
      console.log('[DragDrop] Updated player team from', oldTeam, 'to', newTeam);
      
      // Update the display
      this.updateGamePartyDisplay();
      
      showToast(`${player.username} moved to Team ${newTeam}`, 'success');
    } else {
      console.warn('[DragDrop] Player not found in localPlayers:', playerId);
    }
  }

  changeScoreToWin(delta: number): void {
    // Allow score changes in all modes
    const currentScore = this.gameSettings.scoreToWin || 3;
    const newScore = Math.max(1, Math.min(21, currentScore + delta)); // Limit between 1 and 21
    
    this.gameSettings.scoreToWin = newScore;
    
    // Update display
    const scoreDisplay = document.getElementById('score-value');
    if (scoreDisplay) {
      scoreDisplay.textContent = newScore.toString();
    }
  }

  // Sync score display with gameSettings
  updateScoreDisplay(): void {
    const scoreDisplay = document.getElementById('score-value');
    if (scoreDisplay && this.gameSettings.scoreToWin !== undefined) {
      scoreDisplay.textContent = this.gameSettings.scoreToWin.toString();
    }
  }

  updatePlayConfigUI(): void {
    // Update settings display based on current settings
    this.updateLocalPlayersDisplay();
    this.updateGamePartyDisplay();
    this.initializePlayerSelection();
    this.updateScoreDisplay(); // Sync score display
  }

  // showAddPlayerDialog is deprecated - now using showLocalPlayerLoginModal from local-player.ts
  // hideAddPlayerDialog is deprecated - now using hideLocalPlayerLoginModal from local-player.ts
  // handleAddPlayerSubmit is deprecated - now handled in setupLocalPlayerLoginModal

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
  // Selection handled via event delegation on the party container
    // ensure AI is tracked as selected by default
    this.selectedPlayerIds.add('ai-player');
    return playerCard;
  }

  togglePlayerSelection(playerCard: HTMLElement, playerType: string): void {
    // Update selected players state for game logic and persist selection
    const playerId = playerCard.dataset.playerId || playerType;
    if (!playerId) return;

    // GUARD: Prevent re-entrant calls during same tick
    const processingKey = `toggle-${playerId}`;
    const now = Date.now();
    const lastProcess = this.lastClickTimestamps.get(processingKey) || 0;
    if (now - lastProcess < 50) { // 50ms guard window
      console.warn('[togglePlayerSelection] Re-entrant call blocked for', playerId);
      return;
    }
    this.lastClickTimestamps.set(processingKey, now);

    // Check current state BEFORE toggling
    const wasActive = playerCard.classList.contains('active');
    
    // Toggle the active class
    playerCard.classList.toggle('active');
    
    // Force immediate reflow to ensure DOM updates before checking state
    void playerCard.offsetHeight;
    
    const isNowActive = playerCard.classList.contains('active');

    // Update state based on NEW active status
    if (isNowActive) {
      this.selectedPlayerIds.add(playerId);
      console.log(`✅ Player ${playerId} selected for game`);
    } else {
      this.selectedPlayerIds.delete(playerId);
      console.log(`❌ Player ${playerId} deselected from game`);
    }

    // Debug: log classes and computed styles
    try {
      const cs = window.getComputedStyle(playerCard);
      console.log('[toggle]', wasActive ? 'WAS active' : 'was INACTIVE', '→', isNowActive ? 'NOW active' : 'now INACTIVE', 
                  'classList=', Array.from(playerCard.classList), 
                  'bg=', cs.backgroundColor, 'transform=', cs.transform);
    } catch (e) {
      // ignore
    }
  }

  initializePlayerSelection(): void {
    // Host and AI selection are handled by event delegation on the party container
    if (this.playerSelectionInitialized) return;
    this.playerSelectionInitialized = true;

    // Set up AI difficulty change handler to update AI player display (only once)
    const aiDifficultyButtons = document.querySelectorAll('.setting-option[data-setting="ai-difficulty"]');
    aiDifficultyButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update display after AI difficulty changes
        setTimeout(() => this.updateGamePartyDisplay(), 100);
      });
    });

    const partyContainer = document.getElementById('game-party-list') || document;
    partyContainer.addEventListener('click', (e: Event) => {
      const me = e as MouseEvent;
      const target = (me.target || (e as any).srcElement) as HTMLElement;
      
      // Allow clicks on add-player buttons to pass through
      if (target.closest('.add-player-btn')) {
        console.debug('[App] Add player button clicked, allowing event to propagate');
        return;
      }
      
      // Ignore clicks on remove buttons
      if (target.closest('.remove-player-btn') || target.closest('.remove-btn')) return;
      
      const card = target.closest('.player-card') as HTMLElement | null;
      if (!card) return;

      // IMMEDIATELY stop propagation to prevent double-firing (only for player cards)
      e.stopImmediatePropagation();
      e.preventDefault();

      // CRITICAL: Check if we're inside the party container to avoid processing
      // clicks that bubble up from outside
      const isInsideParty = card.closest('#game-party-list, #team1-list, #team2-list, #coop-party-frame, #tournament-party-frame');
      if (!isInsideParty) {
        console.debug('[App] Click outside party container, ignoring');
        return;
      }

      // DEBOUNCE: Ignore rapid clicks on same card (within 300ms)
      const cardId = card.id || card.dataset.playerId || 'unknown';
      const now = Date.now();
      const lastClick = this.lastClickTimestamps.get(cardId) || 0;
      if (now - lastClick < 300) {
        console.debug('[App] Ignoring duplicate click within 300ms');
        return;
      }
      this.lastClickTimestamps.set(cardId, now);

      // Debug: log click target and classes to help diagnose selection issues
      try {
        console.debug('[App] player-card clicked', card, 'classes=', Array.from(card.classList));
      } catch (e) { /* ignore */ }

      // Determine player type for togglePlayerSelection
      let playerType = 'local';
      if (card.id === 'host-player-card' || card.id === 'host-player-card-coop' || card.id === 'host-player-card-tournament' || card.classList.contains('host-player')) playerType = 'host';
      else if (card.id === 'ai-player-card' || card.id === 'ai-player-card-coop' || card.classList.contains('ai-player')) playerType = 'ai';

      // Delegate to the App's selection logic so logs and state updates run once
      try {
        this.togglePlayerSelection(card, playerType);
      } catch (err) {
        console.error('[App] togglePlayerSelection failed:', err);
        // As a fallback, toggle class directly
        card.classList.toggle('active');
      }
    }, { capture: true }); // Use capture phase to catch event early
  }

  async startGame(): Promise<void> {
    console.log('🚀 [App.startGame] === CALLED === Stack trace:');
    console.trace();
    
    // DEBOUNCE: Prevent rapid double-clicks on start button (within 1 second)
    const now = Date.now();
    if (now - this.lastStartGameClick < 1000) {
      console.warn('⚠️ App: Ignoring rapid start-game click (debounced)');
      return;
    }
    this.lastStartGameClick = now;

    // GUARD: Prevent double starts
    const gameManager = (window as any).gameManager;
    if (gameManager && gameManager.isPlaying) {
      console.warn('⚠️ App: Game already in progress, ignoring duplicate startGame call');
      return;
    }

    console.log('✅ [App.startGame] Guards passed - proceeding with game start');
    console.log('Starting game with settings:', this.gameSettings);
    console.log('Local players:', this.localPlayers);

    // TOURNAMENT MODE: Delegate to TournamentManager
    if (this.gameSettings.gameMode === 'tournament') {
      // If currentTournamentMatch exists, we're playing a match (not creating)
      if ((this as any).currentTournamentMatch) {
        console.log('🏆 [App.startGame] Tournament MATCH mode - starting actual game');
        // Continue to game start below (don't return)
      } else {
        // Create tournament via TournamentManager
        console.log('🏆 [App.startGame] Tournament CREATE mode - delegating to TournamentManager');
        await this.createTournamentFromParty();
        return;
      }
    }

    // Sync game settings with GameManager before starting
    if (gameManager && typeof gameManager.setGameSettings === 'function') {
      console.log('🎮 [App.startGame] Syncing game settings to GameManager');
      gameManager.setGameSettings(this.gameSettings);
    }

    // Update game UI with player information
    this.updateGameUI();

  // Show game screen
  this.router.navigate('game');

    // Start the actual game
    if (gameManager && typeof gameManager.startBotMatch === 'function') {
      console.log('🎮 [App.startGame] Calling gameManager.startBotMatch()');
      await gameManager.startBotMatch();
    } else {
      console.error('GameManager not available');
      showToast('Game system not available', 'error');
      this.router.navigate('play-config');
    }
    console.log('🏁 [App.startGame] === COMPLETED ===');
  }

  /**
   * Gather all players from party and delegate to TournamentManager
   */
  private async createTournamentFromParty(): Promise<void> {
    const tournamentManager = (window as any).tournamentManager;
    if (!tournamentManager) {
      showToast('Tournament system not available', 'error');
      return;
    }

    // Gather ALL participants (no selection needed - everyone in party plays)
    const participants: { userId: number; username: string }[] = [];

    // Add host player
    const authManager = (window as any).authManager;
    const hostUser = authManager?.getCurrentUser();
    if (hostUser) {
      participants.push({ userId: hostUser.userId, username: hostUser.username });
    }

    // Add all local players in the party
    for (const player of this.localPlayers) {
      const playerId = player.userId || Math.floor(Math.random() * 100000) + 10000;
      participants.push({ userId: playerId, username: player.username });
    }

    console.log('🏆 [Tournament] All participants:', participants);

    // Delegate to TournamentManager - it handles validation and API call
    await tournamentManager.startTournament(participants);
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
    console.log('[App] loadProfileData() called');
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    console.log('[App] Current user:', user);
    
    if (!user) {
      console.warn('[App] No user logged in');
      return;
    }

    try {
      // Use the ProfileManager for comprehensive profile loading
      const profileManager = (window as any).profileManager;
      console.log('[App] ProfileManager available:', !!profileManager);
      
      if (profileManager) {
        console.log('[App] Calling profileManager.loadProfile()');
        await profileManager.loadProfile();
        console.log('[App] ProfileManager.loadProfile() completed');
      } else {
        console.warn('[App] ProfileManager not available, using fallback');
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

// Note: App initialization is now handled in main.ts
// Removing duplicate DOMContentLoaded listener to prevent double initialization