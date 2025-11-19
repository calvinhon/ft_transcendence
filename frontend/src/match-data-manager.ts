// frontend/src/match-data-manager.ts
// Match data management and player handling

interface OnlinePlayer {
  user_id: number;
  username?: string;
  display_name?: string | null;
  wins?: number;
  total_games?: number;
}

interface LocalPlayer {
  user_id: string;
  username: string;
  isLocal: boolean;
  description: string;
}

interface SelectedOpponent {
  id: string | number;
  name: string;
  type: 'online' | 'local';
}

export class MatchDataManager {
  private onlinePlayers: OnlinePlayer[] = [];
  private localPlayers: LocalPlayer[] = [];
  private selectedOpponent: SelectedOpponent | null = null;

  constructor() {
    this.loadLocalPlayers();
  }

  // Online players management
  public async loadOnlinePlayers(): Promise<void> {
    try {
      console.log('MatchDataManager: Loading online players...');
      const response = await fetch('/api/players/online');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.onlinePlayers = await response.json();
      console.log('MatchDataManager: Loaded online players:', this.onlinePlayers.length);
    } catch (error) {
      console.error('MatchDataManager: Failed to load online players:', error);
      this.onlinePlayers = [];
    }
  }

  public getOnlinePlayers(): OnlinePlayer[] {
    return [...this.onlinePlayers];
  }

  public getOnlinePlayerById(userId: number): OnlinePlayer | undefined {
    return this.onlinePlayers.find(player => player.user_id === userId);
  }

  // Local players management
  private loadLocalPlayers(): void {
    try {
      const stored = localStorage.getItem('localPlayers');
      if (stored) {
        this.localPlayers = JSON.parse(stored);
        console.log('MatchDataManager: Loaded local players:', this.localPlayers.length);
      }
    } catch (error) {
      console.error('MatchDataManager: Failed to load local players:', error);
      this.localPlayers = [];
    }
  }

  public getLocalPlayers(): LocalPlayer[] {
    return [...this.localPlayers];
  }

  public addLocalPlayer(player: LocalPlayer): void {
    // Check for duplicates
    const existing = this.localPlayers.find(p => p.user_id === player.user_id);
    if (!existing) {
      this.localPlayers.push(player);
      this.saveLocalPlayers();
      console.log('MatchDataManager: Added local player:', player.username);
    }
  }

  public removeLocalPlayer(userId: string): void {
    this.localPlayers = this.localPlayers.filter(p => p.user_id !== userId);
    this.saveLocalPlayers();
    console.log('MatchDataManager: Removed local player:', userId);
  }

  private saveLocalPlayers(): void {
    try {
      localStorage.setItem('localPlayers', JSON.stringify(this.localPlayers));
    } catch (error) {
      console.error('MatchDataManager: Failed to save local players:', error);
    }
  }

  // Selected opponent management
  public getSelectedOpponent(): SelectedOpponent | null {
    return this.selectedOpponent;
  }

  public setSelectedOpponent(opponent: SelectedOpponent | null): void {
    this.selectedOpponent = opponent;
    console.log('MatchDataManager: Selected opponent:', opponent);
  }

  public clearSelectedOpponent(): void {
    this.selectedOpponent = null;
    console.log('MatchDataManager: Cleared selected opponent');
  }

  // Match creation helpers
  public canStartMatch(): boolean {
    return this.selectedOpponent !== null;
  }

  public getMatchConfig(): any {
    if (!this.selectedOpponent) {
      throw new Error('No opponent selected');
    }

    return {
      opponent: this.selectedOpponent,
      mode: this.selectedOpponent.type === 'online' ? 'online' : 'local',
      timestamp: new Date().toISOString()
    };
  }

  // Statistics
  public getOnlinePlayersCount(): number {
    return this.onlinePlayers.length;
  }

  public getLocalPlayersCount(): number {
    return this.localPlayers.length;
  }

  public getPlayerStats(playerId: number): { wins: number; totalGames: number; winRate: number } | null {
    const player = this.getOnlinePlayerById(playerId);
    if (!player) return null;

    const wins = player.wins || 0;
    const totalGames = player.total_games || 0;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    return { wins, totalGames, winRate };
  }

  // Search and filter
  public searchOnlinePlayers(query: string): OnlinePlayer[] {
    if (!query.trim()) return this.getOnlinePlayers();

    const lowerQuery = query.toLowerCase();
    return this.onlinePlayers.filter(player =>
      (player.username?.toLowerCase().includes(lowerQuery)) ||
      (player.display_name?.toLowerCase().includes(lowerQuery))
    );
  }

  public filterOnlinePlayersBySkill(minWins: number = 0): OnlinePlayer[] {
    return this.onlinePlayers.filter(player => (player.wins || 0) >= minWins);
  }

  // Data refresh
  public async refreshOnlinePlayers(): Promise<void> {
    await this.loadOnlinePlayers();
  }

  public refreshLocalPlayers(): void {
    this.loadLocalPlayers();
  }
}