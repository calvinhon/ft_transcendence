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
  campaign_level?: number;
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
      console.log('[ProfileManager] DOMContentLoaded - initial load');
      this.loadProfile();
    });
  }

  public async loadProfile(): Promise<void> {
    console.log('[ProfileManager] loadProfile() called');
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    console.log('[ProfileManager] Current user:', user);
    
    if (!user) {
      console.warn('[ProfileManager] No user logged in, cannot load profile');
      return;
    }

    try {
      console.log('[ProfileManager] Loading profile for user:', user.userId);
      
      // Load user profile info
      await this.loadUserInfo(user.userId);
      
      // Load game statistics
      await this.loadGameStats(user.userId);
      
      // Load recent games
      await this.loadRecentGames(user.userId);
      
      // Load tournament count
      await this.loadTournamentCount(user.userId);
      
      console.log('[ProfileManager] Profile loading complete');
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  private async loadUserInfo(userId: number): Promise<void> {
    try {
      console.log('[ProfileManager] Loading user info for userId:', userId);
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.baseURL}/profile/${userId}`, {
        headers: authManager.getAuthHeaders()
      });

      console.log('[ProfileManager] Profile API response status:', response.status);
      
      if (response.ok) {
        const userInfo: UserProfile = await response.json();
        console.log('[ProfileManager] Profile data received:', userInfo);
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
    console.log('[ProfileManager] Displaying user info:', userInfo);
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
    const campaignLevelEl = document.getElementById('profile-campaign-level');
    const profileLevelEl = document.getElementById('profile-level');
    
    console.log('[ProfileManager] Campaign level element found:', !!campaignLevelEl);
    console.log('[ProfileManager] Campaign level value:', userInfo.campaign_level);
    
    if (usernameEl) usernameEl.textContent = user?.username || 'Unknown';
    if (userIdEl) userIdEl.textContent = `User ID: ${user?.userId || 'Unknown'}`;
    if (memberSinceEl) memberSinceEl.textContent = `Member since: ${new Date(userInfo.created_at).toLocaleDateString()}`;
    if (displayNameEl) displayNameEl.textContent = userInfo.display_name || user?.username || 'Unknown';
    if (bioEl) bioEl.textContent = userInfo.bio || 'No bio provided';
    if (countryEl) countryEl.textContent = userInfo.country || 'Not specified';
    
    // Update campaign level in stats section
    if (campaignLevelEl) {
      const levelText = userInfo.campaign_level ? `Level ${userInfo.campaign_level}` : 'Level 1';
      campaignLevelEl.textContent = levelText;
      console.log('[ProfileManager] Set campaign level to:', levelText);
    } else {
      console.warn('[ProfileManager] Campaign level element not found in DOM!');
    }
    
    // Update big level number at top of dashboard
    if (profileLevelEl) {
      const level = userInfo.campaign_level || 1;
      profileLevelEl.textContent = level.toString();
      console.log('[ProfileManager] Set profile level to:', level);
    }
    
    if (avatarEl) {
      avatarEl.textContent = (userInfo.display_name || user?.username || 'U').charAt(0).toUpperCase();
    }
    
    console.log('[ProfileManager] User info display complete');
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
    const streakEl = document.getElementById('profile-streak');
    const bestStreakEl = document.getElementById('profile-best-streak');
    const rankEl = document.getElementById('profile-rank');
    const expBarEl = document.getElementById('profile-exp-bar') as HTMLElement;
    const expTextEl = document.getElementById('profile-exp-text');
    
    if (winsEl) winsEl.textContent = stats.wins.toString();
    if (lossesEl) lossesEl.textContent = stats.losses.toString();
    if (drawsEl) drawsEl.textContent = stats.draws.toString();
    if (totalGamesEl) totalGamesEl.textContent = stats.total_games.toString();
    if (winRateEl) winRateEl.textContent = `${stats.winRate}%`;
    if (avgDurationEl) avgDurationEl.textContent = `${Math.round(stats.averageGameDuration / 1000)}s`;
    
    // Update streak/rank/exp with placeholder values or calculated values
    // TODO: These should come from backend when implemented
    const currentStreak = Math.min(stats.wins, 5); // Simplified calculation
    const bestStreak = Math.max(stats.wins, currentStreak);
    
    if (streakEl) streakEl.textContent = currentStreak.toString();
    if (bestStreakEl) bestStreakEl.textContent = bestStreak.toString();
    if (rankEl) rankEl.textContent = stats.total_games > 0 ? '#--' : '#--'; // TODO: Get real rank from backend
    
    // Calculate XP based on wins (100 XP per win as example)
    const xp = stats.wins * 100;
    const xpForNextLevel = 1000;
    const xpProgress = (xp % xpForNextLevel);
    const xpPercentage = Math.min(100, (xpProgress / xpForNextLevel) * 100);
    
    if (expBarEl) expBarEl.style.width = `${xpPercentage}%`;
    if (expTextEl) expTextEl.textContent = `${xpProgress} / ${xpForNextLevel} XP`;
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