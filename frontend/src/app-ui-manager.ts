// frontend/src/app-ui-manager.ts
// UI management functionality for the App

export class AppUIManager {
  private currentScreen: string = 'login-screen';

  constructor() {
    this.initializeUI();
  }

  private initializeUI(): void {
    console.log('🔧 [UI] Initializing UI...');
    
    // Hide all screens initially
    this.hideAllScreens();

    // Show login screen by default
    console.log('🔧 [UI] Showing login screen by default');
    this.showScreen('login-screen');

    // Initialize navigation
    this.initializeNavigation();
  }

  private initializeNavigation(): void {
    // Add click handlers for navigation buttons
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const navButton = target.closest('[data-screen]') as HTMLElement;

      if (navButton) {
        const screenId = navButton.dataset.screen;
        if (screenId) {
          e.preventDefault();
          this.showScreen(screenId);
        }
      }
    });
  }

  public showScreen(screenId: string): void {
    console.log(`🔧 [UI] Attempting to show screen: ${screenId}`);
    
    // Hide current screen
    this.hideScreen(this.currentScreen);

    // Show new screen
    const screen = document.getElementById(screenId);
    console.log(`🔧 [UI] Found screen element:`, screen);
    
    if (screen) {
      screen.classList.add('active');
      this.currentScreen = screenId;
      console.log(`🔧 [UI] Added 'active' class to ${screenId}, current classes:`, screen.className);

      // Update navigation active state
      this.updateNavigationState(screenId);

      // Trigger screen-specific initialization
      this.onScreenShown(screenId);
    } else {
      console.error(`🔧 [UI] Screen element not found: ${screenId}`);
    }
  }

  private hideScreen(screenId: string): void {
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.remove('active');
    }
  }

  private hideAllScreens(): void {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
      screen.classList.remove('active');
    });
  }

  private updateNavigationState(activeScreen: string): void {
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // Add active class to current nav item
    const activeNavItem = document.querySelector(`[data-screen="${activeScreen}"]`);
    if (activeNavItem) {
      activeNavItem.classList.add('active');
    }
  }

  private onScreenShown(screenId: string): void {
    switch (screenId) {
      case 'main-menu-screen':
        this.onMainMenuShown();
        break;
      case 'play-config-screen':
        this.onGameModeSelectionShown();
        break;
      case 'tournament-setup':
        this.onTournamentSetupShown();
        break;
      case 'arcade-setup':
        this.onArcadeSetupShown();
        break;
      case 'profile-screen':
        this.onProfileShown();
        break;
      case 'leaderboard':
        this.onLeaderboardShown();
        break;
      case 'settings-screen':
        this.onSettingsShown();
        break;
    }
  }

  private onMainMenuShown(): void {
    // Update user info display
    const authManager = (window as any).authManager;
    const userInfo = document.getElementById('user-info');
    if (userInfo && authManager && authManager.getCurrentUser()) {
      const user = authManager.getCurrentUser();
      userInfo.innerHTML = `
        <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
        <div class="user-details">
          <div class="username">${user.username}</div>
          <div class="user-stats">Level ${user.level || 1} • ${user.xp || 0} XP</div>
        </div>
      `;
    }
  }

  private onGameModeSelectionShown(): void {
    // Initialize game mode selection
    const gameModeButtons = document.querySelectorAll('.game-mode-tab');
    gameModeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const mode = (button as HTMLElement).dataset.mode;
        if (mode) {
          this.selectGameMode(mode);
        }
      });
    });

    // Update the game party display to show host player name
    const app = (window as any).app;
    if (app && app.playerManager) {
      app.playerManager.updateGamePartyDisplay();
    }
  }

  private onTournamentSetupShown(): void {
    // Initialize tournament setup
    this.initializeTournamentSetup();
  }

  private onArcadeSetupShown(): void {
    // Initialize arcade setup
    this.initializeArcadeSetup();
  }

  private onProfileShown(): void {
    // Load and display user profile using ProfileManager
    const profileManager = (window as any).profileManager;
    if (profileManager && typeof profileManager.loadProfile === 'function') {
      profileManager.loadProfile();
    } else {
      // Fallback to basic profile loading
      this.loadUserProfile();
    }
  }

  private onLeaderboardShown(): void {
    // Load and display leaderboard
    this.loadLeaderboard();
  }

  private onSettingsShown(): void {
    // Load and display settings
    this.loadSettings();
  }

  private selectGameMode(mode: string): void {
    console.log(`🔧 [UI] Selecting game mode: ${mode}`);
    
    // Update game settings
    const app = (window as any).app;
    if (app && app.gameManager && app.gameManager.gameSettings) {
      app.gameManager.gameSettings.gameMode = mode;
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

    // Update the game party display after mode change
    if (app && app.playerManager) {
      app.playerManager.updateGamePartyDisplay();
    }

    console.log(`🔧 [UI] Game mode ${mode} selected, UI updated`);
  }

  private initializeTournamentSetup(): void {
    // Tournament setup logic
    const startTournamentBtn = document.getElementById('start-tournament-btn');
    if (startTournamentBtn) {
      startTournamentBtn.addEventListener('click', () => {
        this.startTournament();
      });
    }
  }

  private initializeArcadeSetup(): void {
    // Arcade setup logic
    const startArcadeBtn = document.getElementById('start-arcade-btn');
    if (startArcadeBtn) {
      startArcadeBtn.addEventListener('click', () => {
        this.startArcade();
      });
    }
  }

  private loadUserProfile(): void {
    // Profile loading logic
    const authManager = (window as any).authManager;
    if (authManager && authManager.getCurrentUser()) {
      const user = authManager.getCurrentUser();
      // Display profile information
      const profileContainer = document.getElementById('profile-container');
      if (profileContainer) {
        profileContainer.innerHTML = `
          <div class="profile-header">
            <div class="profile-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div class="profile-info">
              <h2>${user.username}</h2>
              <p>Level ${user.level || 1}</p>
              <p>${user.xp || 0} XP</p>
            </div>
          </div>
        `;
      }
    }
  }

  private loadLeaderboard(): void {
    // Leaderboard loading logic
    const leaderboardContainer = document.getElementById('leaderboard-container');
    if (leaderboardContainer) {
      leaderboardContainer.innerHTML = '<p>Loading leaderboard...</p>';
      // TODO: Implement leaderboard API call
    }
  }

  private loadSettings(): void {
    // Settings loading logic
    const settingsContainer = document.getElementById('settings-container');
    if (settingsContainer) {
      settingsContainer.innerHTML = `
        <div class="settings-section">
          <h3>Game Settings</h3>
          <div class="setting-item">
            <label for="sound-enabled">Sound Enabled</label>
            <input type="checkbox" id="sound-enabled" checked>
          </div>
          <div class="setting-item">
            <label for="music-enabled">Music Enabled</label>
            <input type="checkbox" id="music-enabled" checked>
          </div>
        </div>
      `;
    }
  }

  private startTournament(): void {
    // Tournament start logic
    const app = (window as any).app;
    if (app && app.tournamentManager) {
      app.tournamentManager.startTournament();
    }
  }

  private startArcade(): void {
    // Arcade start logic
    const app = (window as any).app;
    if (app && app.gameManager) {
      app.gameManager.startArcadeGame();
    }
  }

  public showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
      toastContainer.appendChild(toast);

      // Auto remove after 3 seconds
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }
  }

  public showModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'block';
    }
  }

  public hideModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }
}