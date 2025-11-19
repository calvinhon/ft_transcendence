// frontend/src/match-manager.ts
// Main match manager - orchestrates all match modules

import { MatchDataManager } from './match-data-manager';
import { MatchUIManager } from './match-ui-manager';
import { MatchSearchManager } from './match-search';

export class MatchManager {
  public dataManager: MatchDataManager;
  public uiManager: MatchUIManager;
  public searchManager: MatchSearchManager;

  private currentMode: string = 'bot';
  private isStartingBotMatch: boolean = false;
  private startBotTimeoutId: number | null = null;

  constructor() {
    console.log('MatchManager: Constructor called');

    // Initialize all managers
    this.dataManager = new MatchDataManager();
    this.uiManager = new MatchUIManager();
    this.searchManager = new MatchSearchManager();

    // Make globally available
    (window as any).matchManager = this;
    (window as any).matchDataManager = this.dataManager;
    (window as any).matchUIManager = this.uiManager;
    (window as any).matchSearchManager = this.searchManager;

    // Setup additional event listeners
    this.setupAdditionalEventListeners();

    console.log('MatchManager: Constructor completed');
  }

  private setupAdditionalEventListeners(): void {
    // Challenge buttons for online players
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const challengeBtn = target.closest('.challenge-btn') as HTMLElement;

      if (challengeBtn) {
        e.preventDefault();
        const playerId = parseInt(challengeBtn.getAttribute('data-player-id') || '0');
        if (playerId) {
          this.challengePlayer(playerId);
        }
      }
    });

    // Search online players button
    document.getElementById('search-online-players-btn')?.addEventListener('click', () => {
      this.startOnlineSearch();
    });

    // Quick match button
    document.getElementById('quick-match-btn')?.addEventListener('click', () => {
      this.startQuickMatch();
    });

    // Ranked match button
    document.getElementById('ranked-match-btn')?.addEventListener('click', () => {
      this.startRankedMatch();
    });
  }

  private selectMode(mode: string): void {
    console.log('MatchManager: selectMode called with:', mode);
    this.currentMode = mode;

    if (mode === 'bot') {
      this.uiManager.showBotMatchScreen();
    } else if (mode === 'opponents') {
      this.uiManager.showOpponentSelectionScreen();
    }
  }

  private challengePlayer(playerId: number): void {
    console.log('MatchManager: Challenging player:', playerId);

    const player = this.dataManager.getOnlinePlayerById(playerId);
    if (!player) {
      console.error('MatchManager: Player not found:', playerId);
      return;
    }

    // Set as selected opponent
    this.dataManager.setSelectedOpponent({
      id: player.user_id,
      name: player.display_name || player.username || `Player ${player.user_id}`,
      type: 'online'
    });

    // Highlight in UI
    this.uiManager.highlightSelectedOpponent(playerId);

    // Show confirmation or start match
    this.promptDirectChallenge(player);
  }

  private promptDirectChallenge(player: any): void {
    const confirmed = confirm(`Challenge ${player.display_name || player.username}?`);
    if (confirmed) {
      this.startSelectedMatch();
    }
  }

  private startOnlineSearch(): void {
    console.log('MatchManager: Starting online search');
    this.searchManager.startSearch();
  }

  private startQuickMatch(): void {
    console.log('MatchManager: Starting quick match');
    this.searchManager.startQuickMatch();
  }

  private startRankedMatch(): void {
    console.log('MatchManager: Starting ranked match');
    this.searchManager.startRankedMatch();
  }

  public startBotMatch(): void {
    if (this.isStartingBotMatch) {
      console.warn('MatchManager: Bot match already starting, ignoring duplicate request');
      return;
    }

    console.log('MatchManager: Starting bot match');
    this.isStartingBotMatch = true;

    // Set bot as opponent
    this.dataManager.setSelectedOpponent({
      id: 'bot',
      name: 'AI Bot',
      type: 'local'
    });

    // Show loading or transition
    this.uiManager.showToast('Starting match against AI...', 'info');

    // Start the match after a short delay
    this.startBotTimeoutId = window.setTimeout(() => {
      this.launchGame();
      this.isStartingBotMatch = false;
      this.startBotTimeoutId = null;
    }, 1000);
  }

  public startSelectedMatch(): void {
    console.log('MatchManager: Starting selected match');

    if (!this.dataManager.canStartMatch()) {
      this.uiManager.showToast('No opponent selected', 'error');
      return;
    }

    const matchConfig = this.dataManager.getMatchConfig();
    console.log('MatchManager: Match config:', matchConfig);

    // Cancel any ongoing search
    this.searchManager.cancelSearch();

    // Launch the game
    this.launchGame();
  }

  private launchGame(): void {
    console.log('MatchManager: Launching game');

    // Get the game manager and start the game
    const gameManager = (window as any).gameManager;
    if (gameManager) {
      // Pass match configuration to game manager
      const matchConfig = this.dataManager.getMatchConfig();
      gameManager.startMatch(matchConfig);
    } else {
      console.error('MatchManager: Game manager not found');
      this.uiManager.showToast('Failed to start game', 'error');
    }
  }

  public cancelSearch(): void {
    this.searchManager.cancelSearch();
  }

  public showOnlinePlayers(): void {
    this.uiManager.showOnlinePlayers();
  }

  public showModeSelection(): void {
    this.uiManager.showModeSelection();
  }

  public showMatchSection(): void {
    this.uiManager.showMatchSection();
  }

  // Public API methods
  public getCurrentMode(): string {
    return this.currentMode;
  }

  public getSelectedOpponent(): any {
    return this.dataManager.getSelectedOpponent();
  }

  public async refreshOnlinePlayers(): Promise<void> {
    await this.dataManager.refreshOnlinePlayers();
    this.uiManager.refreshOnlinePlayersList();
  }

  public getOnlinePlayersCount(): number {
    return this.dataManager.getOnlinePlayersCount();
  }

  public getLocalPlayersCount(): number {
    return this.dataManager.getLocalPlayersCount();
  }

  // Cleanup
  public destroy(): void {
    if (this.startBotTimeoutId) {
      clearTimeout(this.startBotTimeoutId);
      this.startBotTimeoutId = null;
    }

    this.searchManager.cancelSearch();

    console.log('MatchManager: Destroyed');
  }
}