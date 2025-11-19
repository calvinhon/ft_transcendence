// frontend/src/app-refactored.ts
// Refactored App class - Main orchestrator

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

  constructor() {
    // Initialize all managers
    this.playerManager = new AppPlayerManager();
    this.uiManager = new AppUIManager();
    this.gameManager = new AppGameManager();
    this.tournamentManager = new AppTournamentManager();
    this.apiManager = new AppAPIManager();

    // Make app globally available
    (window as any).app = this;

    this.initializeApp();
  }

  private initializeApp(): void {
    // Initialize app-level event listeners and setup
    this.setupGlobalEventListeners();
    this.checkAuthentication();

    console.log('App initialized with modular managers');
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

  private checkAuthentication(): void {
    // Check if user is authenticated
    const authManager = (window as any).authManager;
    if (authManager && authManager.isAuthenticated()) {
      this.uiManager.showScreen('main-menu');
    } else {
      this.uiManager.showScreen('login');
    }
  }

  // Public methods for external access
  public startGame(): void {
    const settings = this.gameManager.gameSettings;

    switch (settings.gameMode) {
      case 'coop':
        this.gameManager.startCoopGame();
        break;
      case 'tournament':
        this.tournamentManager.startTournament();
        break;
      case 'arcade':
        this.gameManager.startArcadeGame();
        break;
    }
  }

  public showScreen(screenId: string): void {
    this.uiManager.showScreen(screenId);
  }

  public showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.uiManager.showToast(message, type);
  }

  // Cleanup method
  public destroy(): void {
    // Clean up event listeners and resources
    (window as any).app = null;
    console.log('App destroyed');
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});