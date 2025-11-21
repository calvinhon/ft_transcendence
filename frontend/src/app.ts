// frontend/src/app.ts
// Main App class - Main orchestrator

import { AppPlayerManager } from './app-player-manager';
import { AppUIManager } from './app-ui-manager';
import { AppGameManager } from './app-game-manager';
import { AppTournamentManager } from './app-tournament-manager';
import { AppAPIManager } from './app-api';

export class App {
  public playerManager: AppPlayerManager;
  public uiManager: AppUIManager;
  public gameManager: AppGameManager;
  public tournamentManager: AppTournamentManager;
  public apiManager: AppAPIManager;
  public localPlayers: any[] = [];

  constructor() {
    console.log('🔧 [APP] App constructor called, initializing managers...');

    // Initialize all managers
    this.playerManager = new AppPlayerManager();
    this.uiManager = new AppUIManager();
    this.gameManager = new AppGameManager();
    this.tournamentManager = new AppTournamentManager();
    this.apiManager = new AppAPIManager();

    // Make app globally available
    (window as any).app = this;
    console.log('🔧 [APP] App instance stored in window.app');

    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    console.log('🔧 [APP] Initializing app-level event listeners and setup...');
    // Initialize app-level event listeners and setup
    this.setupGlobalEventListeners();
    this.setupFormEventListeners();
    await this.checkAuthentication();
  }

  private setupGlobalEventListeners(): void {
    // Global error handling
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
      this.uiManager.showToast('An error occurred', 'error');
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      // Handle navigation state changes
      console.log('Navigation state changed:', e.state);
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
      this.uiManager.showToast('Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
      this.uiManager.showToast('Connection lost', 'error');
    });
  }

  private setupFormEventListeners(): void {
    // Add keyboard shortcuts
    this.setupKeyboardShortcuts();
    // Login form
    const loginForm = document.getElementById('login-form') as HTMLFormElement;
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = (document.getElementById('login-username') as HTMLInputElement)?.value;
        const password = (document.getElementById('login-password') as HTMLInputElement)?.value;

        if (!username || !password) {
          this.uiManager.showToast('Please fill in all fields', 'error');
          return;
        }

        try {
          const result = await (window as any).authManager.login(username, password);
          if (result.success) {
            this.uiManager.showToast('Login successful!', 'success');
            this.uiManager.showScreen('main-menu-screen');
          } else {
            this.uiManager.showToast(result.error || 'Login failed', 'error');
          }
        } catch (error) {
          this.uiManager.showToast('Login failed', 'error');
        }
      });
    }

    // Register form
    const registerForm = document.getElementById('register-form') as HTMLFormElement;
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = (document.getElementById('register-username') as HTMLInputElement)?.value;
        const email = (document.getElementById('register-email') as HTMLInputElement)?.value;
        const password = (document.getElementById('register-password') as HTMLInputElement)?.value;

        if (!username || !email || !password) {
          this.uiManager.showToast('Please fill in all fields', 'error');
          return;
        }

        try {
          const result = await (window as any).authManager.register(username, email, password);
          if (result.success) {
            this.uiManager.showToast('Registration successful!', 'success');
            this.uiManager.showScreen('main-menu-screen');
          } else {
            this.uiManager.showToast(result.error || 'Registration failed', 'error');
          }
        } catch (error) {
          this.uiManager.showToast('Registration failed', 'error');
        }
      });
    }

    // Navigation links
    const createAccountLink = document.getElementById('create-account-link');
    if (createAccountLink) {
      createAccountLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.uiManager.showScreen('register-screen');
      });
    }

    const backToLoginLink = document.getElementById('back-to-login-link');
    if (backToLoginLink) {
      backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.uiManager.showScreen('login-screen');
      });
    }

    const forgotPasswordLink = document.getElementById('forgot-password-link');
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.uiManager.showScreen('forgot-password-screen');
      });
    }

    const backToLoginFromForgotLink = document.getElementById('back-to-login-from-forgot-link');
    if (backToLoginFromForgotLink) {
      backToLoginFromForgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.uiManager.showScreen('login-screen');
      });
    }

    // Main menu buttons
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.uiManager.showScreen('play-config-screen');
      });
    }

    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        this.uiManager.showScreen('profile-screen');
      });
    }

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.uiManager.showScreen('settings-screen');
      });
    }

    const mainMenuLogoutBtn = document.getElementById('main-menu-logout-btn');
    if (mainMenuLogoutBtn) {
      mainMenuLogoutBtn.addEventListener('click', () => {
        (window as any).authManager.logout();
        this.uiManager.showToast('Logged out', 'info');
        this.uiManager.showScreen('login-screen');
      });
    }

    // Play config screen buttons
    const backToMainBtn = document.getElementById('back-to-main-btn');
    if (backToMainBtn) {
      backToMainBtn.addEventListener('click', () => {
        this.uiManager.showScreen('main-menu-screen');
      });
    }

    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
      startGameBtn.addEventListener('click', () => {
        console.log('🎮 [APP] Start game button clicked');
        this.startGame();
      });
    } else {
      console.error('❌ [APP] Start game button not found!');
    }

    // Profile and settings back buttons
    const profileBackBtn = document.getElementById('back-to-main-profile-btn');
    if (profileBackBtn) {
      profileBackBtn.addEventListener('click', () => {
        this.uiManager.showScreen('main-menu-screen');
      });
    }

    const profileBackBottomBtn = document.getElementById('back-to-main-profile-bottom-btn');
    if (profileBackBottomBtn) {
      profileBackBottomBtn.addEventListener('click', () => {
        this.uiManager.showScreen('main-menu-screen');
      });
    }

    const settingsBackBtn = document.getElementById('back-to-main-settings-btn');
    if (settingsBackBtn) {
      settingsBackBtn.addEventListener('click', () => {
        this.uiManager.showScreen('main-menu-screen');
      });
    }

    const settingsBackBottomBtn = document.getElementById('back-to-main-settings-bottom-btn');
    if (settingsBackBottomBtn) {
      settingsBackBottomBtn.addEventListener('click', () => {
        this.uiManager.showScreen('main-menu-screen');
      });
    }

    // Setting option buttons
    this.setupSettingOptionHandlers();

    // Score increment/decrement buttons
    this.setupScoreHandlers();

    // Add player buttons
    this.setupAddPlayerButtons();
  }

  private setupAddPlayerButtons(): void {
    console.log('🔧 [APP] Setting up add player buttons...');

    // Check if AddPlayerModal is available
    if (!(window as any).AddPlayerModal) {
      console.error('❌ [APP] AddPlayerModal not found in window!');
      return;
    }

    console.log('✅ [APP] AddPlayerModal found, creating instance...');

    // Initialize add player modal
    const addPlayerModal = new (window as any).AddPlayerModal();
    console.log('✅ [APP] AddPlayerModal instance created');

    // Tournament add player button
    const addTournamentPlayerBtn = document.getElementById('add-tournament-player-btn');
    if (addTournamentPlayerBtn) {
      console.log('✅ [APP] Tournament add player button found');
      addTournamentPlayerBtn.addEventListener('click', () => {
        console.log('🎮 [APP] Tournament add player button clicked');
        (window as any).addPlayerTeam = 'tournament';
        
        // Set callback for successful authentication
        const modalManager = (window as any).localPlayerModalManager;
        if (modalManager) {
          modalManager.setAuthSuccessCallback((user: any, token: string) => {
            this.addAuthenticatedPlayer(user, token, 'tournament');
          });
        }
        
        this.showLocalPlayerLoginModal();
      });
    } else {
      console.error('❌ [APP] Tournament add player button not found!');
    }

    // Team 1 add player button
    const addTeam1PlayerBtn = document.getElementById('add-team1-player-btn');
    if (addTeam1PlayerBtn) {
      console.log('✅ [APP] Team 1 add player button found');
      addTeam1PlayerBtn.addEventListener('click', () => {
        console.log('🎮 [APP] Team 1 add player button clicked');
        (window as any).addPlayerTeam = 'team1';
        
        // Set callback for successful authentication
        const modalManager = (window as any).localPlayerModalManager;
        if (modalManager) {
          modalManager.setAuthSuccessCallback((user: any, token: string) => {
            this.addAuthenticatedPlayer(user, token, 'team1');
          });
        }
        
        this.showLocalPlayerLoginModal();
      });
    } else {
      console.error('❌ [APP] Team 1 add player button not found!');
    }

    // Team 2 add player button
    const addTeam2PlayerBtn = document.getElementById('add-team2-player-btn');
    if (addTeam2PlayerBtn) {
      console.log('✅ [APP] Team 2 add player button found');
      addTeam2PlayerBtn.addEventListener('click', () => {
        console.log('🎮 [APP] Team 2 add player button clicked');
        (window as any).addPlayerTeam = 'team2';
        
        // Set callback for successful authentication
        const modalManager = (window as any).localPlayerModalManager;
        if (modalManager) {
          modalManager.setAuthSuccessCallback((user: any, token: string) => {
            this.addAuthenticatedPlayer(user, token, 'team2');
          });
        }
        
        this.showLocalPlayerLoginModal();
      });
    } else {
      console.error('❌ [APP] Team 2 add player button not found!');
    }
  }

  private addLocalPlayer(username: string, target: 'tournament' | 'team1' | 'team2'): void {
    if (!this.playerManager) {
      console.error('Player manager not available');
      return;
    }

    try {
      // Create a local player object for the app player manager
      // Note: This uses a different LocalPlayer interface than the auth one
      const teamNumber = target === 'team1' ? 1 : target === 'team2' ? 2 : 1;
      const playerId = Date.now() + Math.floor(Math.random() * 1000); // Numeric ID
      const localPlayer = {
        id: `local_${playerId}`,
        username: username,
        email: `${username.toLowerCase().replace(/\s+/g, '_')}_${playerId}@local.player`, // Generate a unique placeholder email
        team: teamNumber,
        userId: playerId // Add numeric userId
      };

      this.playerManager.addLocalPlayer(localPlayer as any);
      
      // For tournaments, automatically select the player
      if (target === 'tournament') {
        this.playerManager.togglePlayerSelection(localPlayer.id);
      }
      
      // Update the UI to show the new player
      this.playerManager.updateGamePartyDisplay();
      
      this.showToast(`Added local player: ${username}`, 'success');
    } catch (error) {
      console.error('Failed to add local player:', error);
      this.showToast('Failed to add player', 'error');
    }
  }

  private addAuthenticatedPlayer(user: any, token: string, target: 'tournament' | 'team1' | 'team2'): void {
    if (!this.playerManager) {
      console.error('Player manager not available');
      return;
    }

    try {
      console.log('🎮 [APP] Adding authenticated player:', user, 'to target:', target);

      // Create a local player object from authenticated user
      const teamNumber = target === 'team1' ? 1 : target === 'team2' ? 2 : 1;
      const playerId = user.userId || user.id || Date.now();
      
      const localPlayer = {
        id: `user_${playerId}`,
        username: user.username,
        email: user.email,
        team: teamNumber,
        userId: playerId,
        token: token,
        isCurrentUser: false // This is a different user added to the session
      };

      this.playerManager.addLocalPlayer(localPlayer as any);
      
      // For tournaments, automatically select the player
      if (target === 'tournament') {
        this.playerManager.togglePlayerSelection(localPlayer.id);
      }
      
      // Update the UI to show the new player
      this.playerManager.updateGamePartyDisplay();
      
      this.showToast(`Added player: ${user.username}`, 'success');
    } catch (error) {
      console.error('Failed to add authenticated player:', error);
      this.showToast('Failed to add player', 'error');
    }
  }

  private showLocalPlayerLoginModal(): void {
    const modalManager = (window as any).localPlayerModalManager;
    if (modalManager && modalManager.showLoginModal) {
      modalManager.showLoginModal();
    } else {
      console.error('Local player modal manager not available');
    }
  }

  private setupSettingOptionHandlers(): void {
    // Handle setting option clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const settingOption = target.closest('.setting-option') as HTMLElement;

      if (settingOption && settingOption.dataset.setting && settingOption.dataset.value) {
        e.preventDefault();
        const setting = settingOption.dataset.setting;
        const value = settingOption.dataset.value;

        // Update game settings
        if (this.gameManager && this.gameManager.gameSettings) {
          (this.gameManager.gameSettings as any)[setting] = value;
        }

        // Sync settings to actual GameManager
        const actualGameManager = (window as any).gameManager;
        if (actualGameManager) {
          actualGameManager.setGameSettings({ [setting]: value });
        }

        // Update UI - remove active class from siblings and add to clicked option
        const settingGroup = settingOption.closest('.setting-group');
        if (settingGroup) {
          const options = settingGroup.querySelectorAll('.setting-option');
          options.forEach(option => option.classList.remove('active'));
          settingOption.classList.add('active');
        }

        console.log(`Setting ${setting} updated to ${value}`);
      }
    });
  }

  private setupScoreHandlers(): void {
    // Score decrement button
    const scoreDecrementBtn = document.getElementById('score-decrement');
    if (scoreDecrementBtn) {
      scoreDecrementBtn.addEventListener('click', () => {
        if (this.gameManager && this.gameManager.gameSettings) {
          const currentScore = this.gameManager.gameSettings.scoreToWin;
          const newScore = Math.max(1, currentScore - 1); // Minimum score of 1
          this.gameManager.gameSettings.scoreToWin = newScore;
          this.gameManager.updateGameSettings({ scoreToWin: newScore }); // Save to localStorage

          // Sync to actual GameManager
          const actualGameManager = (window as any).gameManager;
          if (actualGameManager) {
            actualGameManager.setGameSettings({ scoreToWin: newScore });
          }

          // Update displayed value
          const scoreDisplay = document.getElementById('score-value');
          if (scoreDisplay) {
            scoreDisplay.textContent = newScore.toString();
          }

          console.log(`Score to win decreased to ${newScore}`);
        }
      });
    }

    // Score increment button
    const scoreIncrementBtn = document.getElementById('score-increment');
    if (scoreIncrementBtn) {
      scoreIncrementBtn.addEventListener('click', () => {
        if (this.gameManager && this.gameManager.gameSettings) {
          const currentScore = this.gameManager.gameSettings.scoreToWin;
          const newScore = Math.min(10, currentScore + 1); // Maximum score of 10
          this.gameManager.gameSettings.scoreToWin = newScore;
          this.gameManager.updateGameSettings({ scoreToWin: newScore }); // Save to localStorage

          // Sync to actual GameManager
          const actualGameManager = (window as any).gameManager;
          if (actualGameManager) {
            actualGameManager.setGameSettings({ scoreToWin: newScore });
          }

          // Update displayed value
          const scoreDisplay = document.getElementById('score-value');
          if (scoreDisplay) {
            scoreDisplay.textContent = newScore.toString();
          }

          console.log(`Score to win increased to ${newScore}`);
        }
      });
    }
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      const currentScreen = this.uiManager ? (this.uiManager as any).currentScreen : null;

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
          this.uiManager.showScreen('login-screen');
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
        this.uiManager.showScreen('login-screen');
        break;
      case 'forgot-password-screen':
        this.uiManager.showScreen('login-screen');
        break;
      case 'main-menu-screen':
        this.handleLogout();
        break;
      case 'play-config-screen':
        this.uiManager.showScreen('main-menu-screen');
        break;
      case 'settings-screen':
        this.uiManager.showScreen('main-menu-screen');
        break;
      case 'profile-screen':
        this.uiManager.showScreen('main-menu-screen');
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
        const loginForm = document.getElementById('login-form') as HTMLFormElement;
        if (loginForm) loginForm.requestSubmit();
        break;
      }
      case 'register-screen': {
        const registerForm = document.getElementById('register-form') as HTMLFormElement;
        if (registerForm) registerForm.requestSubmit();
        break;
      }
      case 'forgot-password-screen': {
        const forgotForm = document.getElementById('forgot-password-form') as HTMLFormElement;
        if (forgotForm) forgotForm.requestSubmit();
        break;
      }
      case 'main-menu-screen': {
        // Navigate to play config screen (equivalent to clicking play button)
        this.uiManager.showScreen('play-config-screen');
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

  private selectGameMode(mode: string): void {
    // Update game settings
    if (this.gameManager && this.gameManager.gameSettings) {
      (this.gameManager.gameSettings as any).gameMode = mode;
    }

    // Sync settings to actual GameManager
    const actualGameManager = (window as any).gameManager;
    if (actualGameManager) {
      actualGameManager.setGameSettings({ gameMode: mode });
    }

    // Update active tab styling
    const gameModeTabs = document.querySelectorAll('.game-mode-tab');
    gameModeTabs.forEach(tab => {
      tab.classList.remove('active');
      if ((tab as HTMLElement).dataset.mode === mode) {
        tab.classList.add('active');
      }
    });

    // Update mode descriptions
    const modeDescriptions = document.querySelectorAll('.mode-desc');
    modeDescriptions.forEach(desc => {
      desc.classList.remove('active');
      if (desc.id === `mode-desc-${mode}`) {
        desc.classList.add('active');
      }
    });

    // Show/hide appropriate party frames based on mode
    const coopFrame = document.getElementById('coop-party-frame');
    const tournamentFrame = document.getElementById('tournament-party-frame');
    const teamsRow = document.getElementById('teams-row');

    if (coopFrame) coopFrame.style.display = mode === 'coop' ? 'block' : 'none';
    if (tournamentFrame) tournamentFrame.style.display = mode === 'tournament' ? 'block' : 'none';
    if (teamsRow) teamsRow.style.display = mode === 'arcade' ? 'flex' : 'none';

    // Show/hide arcade-only settings
    const arcadeOnlyElements = document.querySelectorAll('.arcade-only');
    arcadeOnlyElements.forEach(element => {
      (element as HTMLElement).style.display = mode === 'arcade' ? 'block' : 'none';
    });

    console.log(`🔧 [UI] Game mode ${mode} selected, UI updated`);
  }

  private async checkAuthentication(): Promise<void> {
    console.log('🔐 [AUTH] Checking authentication...');

    // Check if user is authenticated
    const authManager = (window as any).authManager;
    if (!authManager) {
      console.log('🔐 [AUTH] AuthManager not found, showing login');
      this.uiManager.showScreen('login-screen');
      return;
    }

    // Wait for token verification
    try {
      const verifyResponse = await authManager.verifyToken();
      const isAuthenticated = verifyResponse.valid;
      console.log('🔐 [AUTH] Token verification result:', isAuthenticated);

      if (isAuthenticated) {
        console.log('🔐 [AUTH] User authenticated, showing main menu');
        this.uiManager.showScreen('main-menu-screen');
      } else {
        console.log('🔐 [AUTH] User not authenticated, showing login');
        this.uiManager.showScreen('login-screen');
      }
    } catch (error) {
      console.error('🔐 [AUTH] Token verification failed:', error);
      console.log('🔐 [AUTH] Showing login due to verification error');
      this.uiManager.showScreen('login-screen');
    }
  }

  // Public methods for external access
  public startGame(): void {
    console.log('🎮 [APP] startGame() called');
    const settings = this.gameManager.gameSettings;
    console.log('🎮 [APP] Game settings:', settings);

    // Use the actual game manager instance for starting games
    const actualGameManager = (window as any).gameManager;
    if (!actualGameManager) {
      console.error('❌ [APP] Game manager not found in window.gameManager');
      return;
    }
    console.log('✅ [APP] Game manager found');

    // Sync settings from AppGameManager to actual GameManager
    actualGameManager.setGameSettings(settings);
    console.log('✅ [APP] Settings synced to game manager');

    switch (settings.gameMode) {
      case 'coop':
      case 'arcade':
        console.log(`🎮 [APP] Starting ${settings.gameMode} match`);
        actualGameManager.startBotMatch();
        break;
      case 'tournament':
        console.log('🏆 [APP] Starting tournament');
        this.tournamentManager.startTournament();
        break;
      default:
        console.error('❌ [APP] Unknown game mode:', settings.gameMode);
    }
  }

  // Getter for game settings (used by GameManager to sync settings)
  public get gameSettings() {
    return this.gameManager.gameSettings;
  }

  public showScreen(screenId: string): void {
    this.uiManager.showScreen(screenId);
  }

  public showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.uiManager.showToast(message, type);
  }

  handleLogout(): void {
    const authManager = (window as any).authManager;
    authManager.logout();
    this.uiManager.showScreen('login-screen');
    this.localPlayers = [];
    // this.updateChatVisibility();
  }

  // Cleanup method
  public destroy(): void {
    // Clean up event listeners and resources
    (window as any).app = null;
  }
}