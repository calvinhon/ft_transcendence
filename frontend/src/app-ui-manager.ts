// frontend/src/app-ui-manager.ts
// UI management functionality for the App

export class AppUIManager {
  private currentScreen: string = 'login-screen';

  constructor() {
    this.initializeUI();
  }

  private initializeUI(): void {
    // Hide all screens initially
    this.hideAllScreens();

    // Show login screen by default
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
    // Hide current screen
    this.hideScreen(this.currentScreen);

    // Show new screen
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active');
      this.currentScreen = screenId;

      // Update navigation active state
      this.updateNavigationState(screenId);

      // Trigger screen-specific initialization
      this.onScreenShown(screenId);
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
    const gameModeButtons = document.querySelectorAll('.game-mode-btn');
    gameModeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const mode = (button as HTMLElement).dataset.mode;
        if (mode) {
          this.selectGameMode(mode);
        }
      });
    });
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
    // Load and display user profile
    this.loadUserProfile();
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
    // Update game settings
    const app = (window as any).app;
    if (app && app.gameSettings) {
      app.gameSettings.gameMode = mode;
    }

    // Navigate to play configuration screen for all modes
    this.showScreen('play-config-screen');
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