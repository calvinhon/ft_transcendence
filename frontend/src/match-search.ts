// frontend/src/match-search.ts
// Online player search functionality

interface OnlinePlayer {
  user_id: number;
  username?: string;
  display_name?: string | null;
  wins?: number;
  total_games?: number;
}

export class MatchSearchManager {
  private searchInterval: NodeJS.Timeout | null = null;
  private isSearching = false;
  private searchStartTime = 0;
  private maxSearchTime = 30000; // 30 seconds

  constructor() {
    // Initialize search functionality
  }

  public startSearch(): void {
    if (this.isSearching) {
      console.warn('MatchSearchManager: Search already in progress');
      return;
    }

    console.log('MatchSearchManager: Starting player search');
    this.isSearching = true;
    this.searchStartTime = Date.now();

    const uiManager = (window as any).matchUIManager;
    if (uiManager) {
      uiManager.showSearchingScreen();
      uiManager.updateSearchingStatus('Searching for players...');
    }

    // Start periodic search
    this.searchInterval = setInterval(() => {
      this.performSearch();
    }, 2000); // Search every 2 seconds

    // Set timeout for max search time
    setTimeout(() => {
      if (this.isSearching) {
        this.cancelSearch();
        this.showSearchTimeout();
      }
    }, this.maxSearchTime);
  }

  private async performSearch(): Promise<void> {
    try {
      const dataManager = (window as any).matchDataManager;
      if (!dataManager) return;

      // Refresh online players
      await dataManager.refreshOnlinePlayers();
      const players = dataManager.getOnlinePlayers();

      // Update UI with current player count
      const uiManager = (window as any).matchUIManager;
      if (uiManager) {
        const playerCount = players.length;
        uiManager.updateSearchingStatus(`Searching... Found ${playerCount} players online`);
      }

      // Check if we found suitable opponents
      const suitablePlayers = this.filterSuitablePlayers(players);
      if (suitablePlayers.length > 0) {
        this.foundOpponent(suitablePlayers[0]);
      }
    } catch (error) {
      console.error('MatchSearchManager: Search error:', error);
    }
  }

  private filterSuitablePlayers(players: OnlinePlayer[]): OnlinePlayer[] {
    // Filter players based on criteria (e.g., similar skill level, not blocked, etc.)
    // For now, just return all available players
    return players.filter(player => {
      // Add filtering logic here
      // For example: check if player is not in a game, has similar win rate, etc.
      return true;
    });
  }

  private foundOpponent(player: OnlinePlayer): void {
    console.log('MatchSearchManager: Found opponent:', player);

    this.cancelSearch();

    const dataManager = (window as any).matchDataManager;
    if (dataManager) {
      dataManager.setSelectedOpponent({
        id: player.user_id,
        name: player.display_name || player.username || `Player ${player.user_id}`,
        type: 'online'
      });
    }

    const uiManager = (window as any).matchUIManager;
    if (uiManager) {
      uiManager.showToast(`Found opponent: ${player.display_name || player.username}`, 'success');
      // Navigate to match setup or start match directly
      this.promptMatchStart(player);
    }
  }

  private promptMatchStart(player: OnlinePlayer): void {
    const uiManager = (window as any).matchUIManager;
    if (!uiManager) return;

    // Show confirmation dialog
    const confirmed = confirm(`Found opponent: ${player.display_name || player.username}. Start match?`);
    if (confirmed) {
      const matchManager = (window as any).matchManager;
      if (matchManager) {
        matchManager.startSelectedMatch();
      }
    } else {
      // Continue searching or go back
      uiManager.showOpponentSelectionScreen();
    }
  }

  public cancelSearch(): void {
    console.log('MatchSearchManager: Cancelling search');

    if (this.searchInterval) {
      clearInterval(this.searchInterval);
      this.searchInterval = null;
    }

    this.isSearching = false;

    const uiManager = (window as any).matchUIManager;
    if (uiManager) {
      uiManager.updateSearchingStatus('Search cancelled');
    }
  }

  private showSearchTimeout(): void {
    console.log('MatchSearchManager: Search timeout');

    const uiManager = (window as any).matchUIManager;
    if (uiManager) {
      uiManager.showToast('No opponents found within time limit', 'info');
      uiManager.showOpponentSelectionScreen();
    }
  }

  public isCurrentlySearching(): boolean {
    return this.isSearching;
  }

  public getSearchDuration(): number {
    if (!this.isSearching) return 0;
    return Date.now() - this.searchStartTime;
  }

  public getSearchStatus(): {
    isSearching: boolean;
    duration: number;
    timeRemaining: number;
  } {
    const duration = this.getSearchDuration();
    const timeRemaining = Math.max(0, this.maxSearchTime - duration);

    return {
      isSearching: this.isSearching,
      duration,
      timeRemaining
    };
  }

  // Advanced search options
  public startAdvancedSearch(criteria: {
    minWins?: number;
    maxWins?: number;
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    region?: string;
  }): void {
    console.log('MatchSearchManager: Starting advanced search with criteria:', criteria);

    // Store search criteria for filtering
    (this as any).searchCriteria = criteria;

    this.startSearch();
  }

  // Override filter method for advanced search
  private filterSuitablePlayersAdvanced(players: OnlinePlayer[]): OnlinePlayer[] {
    const criteria = (this as any).searchCriteria;
    if (!criteria) return this.filterSuitablePlayers(players);

    return players.filter(player => {
      const wins = player.wins || 0;

      if (criteria.minWins !== undefined && wins < criteria.minWins) return false;
      if (criteria.maxWins !== undefined && wins > criteria.maxWins) return false;

      // Add more criteria filtering as needed
      // if (criteria.skillLevel) { ... }
      // if (criteria.region) { ... }

      return true;
    });
  }

  // Quick match functionality
  public startQuickMatch(): void {
    console.log('MatchSearchManager: Starting quick match');
    this.startAdvancedSearch({
      minWins: 0, // Accept any skill level
      skillLevel: 'intermediate' // Prefer intermediate players
    });
  }

  // Ranked match functionality
  public startRankedMatch(): void {
    console.log('MatchSearchManager: Starting ranked match');

    // Get current user's skill level and find similar opponents
    const authManager = (window as any).authManager;
    if (authManager && authManager.getCurrentUser()) {
      const user = authManager.getCurrentUser();
      // This would need user stats from API
      // For now, use default criteria
      this.startAdvancedSearch({
        skillLevel: 'intermediate'
      });
    }
  }
}