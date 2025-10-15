// Stub file - profile module
// frontend/src/profile.ts - TypeScript version of profile manager

interface User {
  userId: number;
  username: string;
  email?: string;
}

interface UserProfile {
  id: number;
  user_id: number;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  preferred_language: string;
  theme_preference: string;
  created_at: string;
  updated_at: string;
}

interface GameStats {
  wins: number;
  losses: number;
  draws: number;
  total_games: number;
  winRate: number;
  averageGameDuration: number;
}

interface RecentGame {
  id: number;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  score: string;
  date: string;
  duration: number;
}

export class ProfileManager {
  private baseURL: string = '/api/user';
  private gameURL: string = '/api/game';
  private tournamentURL: string = '/api/tournament';

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Load profile data when profile section is shown
    document.addEventListener('DOMContentLoaded', () => {
      this.loadProfile();
    });
  }

  public async loadProfile(): Promise<void> {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    if (!user) return;

    try {
      // Load user profile info
      await this.loadUserInfo(user.userId);
      
      // Load game statistics
      await this.loadGameStats(user.userId);
      
      // Load recent games
      await this.loadRecentGames(user.userId);
      
      // Load tournament count
      await this.loadTournamentCount(user.userId);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  private async loadUserInfo(userId: number): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.baseURL}/profile/${userId}`, {
        headers: authManager.getAuthHeaders()
      });

      if (response.ok) {
        const userInfo: UserProfile = await response.json();
        this.displayUserInfo(userInfo);
      } else {
        console.error('Failed to load user profile:', response.status);
        // Display basic user info from auth if profile not found
        this.displayBasicUserInfo();
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
      this.displayBasicUserInfo();
    }
  }

  private displayBasicUserInfo(): void {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    
    // Update profile display elements with basic auth info
    const usernameEl = document.getElementById('profile-username');
    const userIdEl = document.getElementById('profile-user-id');
    const memberSinceEl = document.getElementById('profile-member-since');
    
    if (usernameEl) usernameEl.textContent = user?.username || 'Unknown';
    if (userIdEl) userIdEl.textContent = `User ID: ${user?.userId || 'Unknown'}`;
    if (memberSinceEl) memberSinceEl.textContent = `Member since: ${new Date().toLocaleDateString()}`;
  }

  private displayUserInfo(userInfo: UserProfile): void {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    
    // Update profile display elements
    const usernameEl = document.getElementById('profile-username');
    const userIdEl = document.getElementById('profile-user-id');
    const memberSinceEl = document.getElementById('profile-member-since');
    const displayNameEl = document.getElementById('profile-display-name');
    const bioEl = document.getElementById('profile-bio');
    const countryEl = document.getElementById('profile-country');
    const avatarEl = document.getElementById('profile-avatar');
    
    if (usernameEl) usernameEl.textContent = user?.username || 'Unknown';
    if (userIdEl) userIdEl.textContent = `User ID: ${user?.userId || 'Unknown'}`;
    if (memberSinceEl) memberSinceEl.textContent = `Member since: ${new Date(userInfo.created_at).toLocaleDateString()}`;
    if (displayNameEl) displayNameEl.textContent = userInfo.display_name || user?.username || 'Unknown';
    if (bioEl) bioEl.textContent = userInfo.bio || 'No bio provided';
    if (countryEl) countryEl.textContent = userInfo.country || 'Not specified';
    
    if (avatarEl) {
      avatarEl.textContent = (userInfo.display_name || user?.username || 'U').charAt(0).toUpperCase();
    }
  }

  private async loadGameStats(userId: number): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.gameURL}/stats/${userId}`, {
        headers: authManager.getAuthHeaders()
      });

      if (response.ok) {
        const stats: GameStats = await response.json();
        this.displayGameStats(stats);
      } else {
        // Display default stats if not available
        this.displayGameStats({
          wins: 0,
          losses: 0,
          draws: 0,
          total_games: 0,
          winRate: 0,
          averageGameDuration: 0
        });
      }
    } catch (error) {
      console.error('Failed to load game stats:', error);
      // Display default stats on error
      this.displayGameStats({
        wins: 0,
        losses: 0,
        draws: 0,
        total_games: 0,
        winRate: 0,
        averageGameDuration: 0
      });
    }
  }

  private displayGameStats(stats: GameStats): void {
    const winsEl = document.getElementById('profile-wins');
    const lossesEl = document.getElementById('profile-losses');
    const drawsEl = document.getElementById('profile-draws');
    const totalGamesEl = document.getElementById('profile-total-games');
    const winRateEl = document.getElementById('profile-win-rate');
    const avgDurationEl = document.getElementById('profile-avg-duration');
    
    if (winsEl) winsEl.textContent = stats.wins.toString();
    if (lossesEl) lossesEl.textContent = stats.losses.toString();
    if (drawsEl) drawsEl.textContent = stats.draws.toString();
    if (totalGamesEl) totalGamesEl.textContent = stats.total_games.toString();
    if (winRateEl) winRateEl.textContent = `${stats.winRate}%`;
    if (avgDurationEl) avgDurationEl.textContent = `${Math.round(stats.averageGameDuration / 1000)}s`;
  }

  private async loadRecentGames(userId: number): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.gameURL}/history/${userId}?limit=5`, {
        headers: authManager.getAuthHeaders()
      });

      if (response.ok) {
        const games: RecentGame[] = await response.json();
        this.displayRecentGames(games);
      } else {
        this.displayRecentGames([]);
      }
    } catch (error) {
      console.error('Failed to load recent games:', error);
      this.displayRecentGames([]);
    }
  }

  private displayRecentGames(games: RecentGame[]): void {
    const container = document.getElementById('profile-recent-games');
    if (!container) return;
    
    if (games.length === 0) {
      container.innerHTML = '<p class="muted">No recent games</p>';
      return;
    }

    container.innerHTML = games.map(game => `
      <div class="recent-game-item">
        <div class="game-info">
          <div class="opponent">vs ${this.escapeHtml(game.opponent)}</div>
          <div class="game-meta">
            <span class="result result-${game.result}">${game.result}</span>
            <span class="score">${game.score}</span>
          </div>
        </div>
        <div class="game-date">${new Date(game.date).toLocaleDateString()}</div>
      </div>
    `).join('');
  }

  private async loadTournamentCount(userId: number): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.tournamentURL}/user/${userId}/count`, {
        headers: authManager.getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        this.displayTournamentCount(data.count || 0);
      } else {
        this.displayTournamentCount(0);
      }
    } catch (error) {
      console.error('Failed to load tournament count:', error);
      this.displayTournamentCount(0);
    }
  }

  private displayTournamentCount(count: number): void {
    const tournamentsEl = document.getElementById('profile-tournaments');
    if (tournamentsEl) {
      tournamentsEl.textContent = count.toString();
    }
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }
}

// Global profile manager instance
(window as any).profileManager = new ProfileManager();