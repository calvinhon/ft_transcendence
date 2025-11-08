// Stub file - profile module
// frontend/src/profile.ts - TypeScript version of profile manager
// =============================================================================
// PROFILE MANAGER - VERSION 2.0 - UPDATED TO FIX CAMPAIGN LEVEL DISPLAY
// This module manages user profile data loading and display
// CRITICAL: Must be imported as named export to prevent tree-shaking
// =============================================================================
console.log('🔵 [PROFILE.TS] Module is loading... VERSION 2.0');

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
    console.log('🟢 [ProfileManager] Constructor called - creating instance');
    console.trace();
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
    console.log('[ProfileManager] displayUserInfo() START - UPDATED VERSION 2.0');
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
    console.log('[ProfileManager] Profile level element found:', !!profileLevelEl);
    console.log('[ProfileManager] Campaign level value from API:', userInfo.campaign_level);
    
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
      console.log('[ProfileManager] Set campaign level element to:', levelText);
    } else {
      console.warn('[ProfileManager] Campaign level element NOT FOUND in DOM!');
    }
    
    // Update big level number at top of dashboard
    if (profileLevelEl) {
      const level = userInfo.campaign_level || 1;
      profileLevelEl.textContent = level.toString();
      console.log('[ProfileManager] Set profile-level element to:', level);
    } else {
      console.error('[ProfileManager] CRITICAL: profile-level element NOT FOUND in DOM!');
    }
    
    if (avatarEl) {
      avatarEl.textContent = (userInfo.display_name || user?.username || 'U').charAt(0).toUpperCase();
    }
    
    console.log('[ProfileManager] displayUserInfo() COMPLETE');
  }

  private async loadGameStats(userId: number): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.gameURL}/stats/${userId}`, {
        headers: authManager.getAuthHeaders()
      });

      if (response.ok) {
        const apiStats: any = await response.json();
        console.log('[ProfileManager] Raw API stats:', apiStats);
        
        // Map API response to GameStats interface
        const stats: GameStats = {
          wins: apiStats.wins || 0,
          losses: apiStats.losses || 0,
          draws: apiStats.draws || 0,
          total_games: apiStats.totalGames || apiStats.total_games || 0,
          winRate: apiStats.winRate || 0,
          averageGameDuration: apiStats.averageGameDuration || 0
        };
        
        console.log('[ProfileManager] Mapped stats:', stats);
        this.displayGameStats(stats);
      } else {
        console.warn('[ProfileManager] Game stats API returned error:', response.status);
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
    
    // Display only real data from database
    if (winsEl) winsEl.textContent = stats.wins.toString();
    if (lossesEl) lossesEl.textContent = stats.losses.toString();
    if (drawsEl) drawsEl.textContent = stats.draws.toString();
    if (totalGamesEl) totalGamesEl.textContent = stats.total_games.toString();
    if (winRateEl) winRateEl.textContent = `${stats.winRate}%`;
    if (avgDurationEl) avgDurationEl.textContent = `${Math.round(stats.averageGameDuration / 1000)}s`;
    
    // Hide or remove mock/calculated fields that don't exist in database
    // Streak, Best Streak, Rank, XP/Level Progress are not in database, so hide them
    const streakEl = document.getElementById('profile-streak');
    const bestStreakEl = document.getElementById('profile-best-streak');
    const rankEl = document.getElementById('profile-rank');
    const expBarEl = document.getElementById('profile-exp-bar') as HTMLElement;
    const expTextEl = document.getElementById('profile-exp-text');
    
    // Hide elements by setting to empty or dash
    if (streakEl) streakEl.textContent = '--';
    if (bestStreakEl) bestStreakEl.textContent = '--';
    if (rankEl) rankEl.textContent = '--';
    if (expBarEl) expBarEl.style.width = '0%';
    if (expTextEl) expTextEl.textContent = '--';
  }

  private async loadRecentGames(userId: number): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      // Load more games (20) so the scrollbar will show
      const response = await fetch(`${this.gameURL}/history/${userId}?limit=20`, {
        headers: authManager.getAuthHeaders()
      });

      if (response.ok) {
        const apiGames: any[] = await response.json();
        console.log('[ProfileManager] Raw API games:', apiGames);
        
        // Display up to 20 games, scrollable container will handle the overflow
        const games: RecentGame[] = apiGames.slice(0, 20).map((game: any) => {
          const isPlayer1 = game.player1_id === userId;
          const playerScore = isPlayer1 ? game.player1_score : game.player2_score;
          const opponentScore = isPlayer1 ? game.player2_score : game.player1_score;
          const opponentId = isPlayer1 ? game.player2_id : game.player1_id;
          
          // Determine result
          let result: 'win' | 'loss' | 'draw';
          if (game.winner_id === userId) {
            result = 'win';
          } else if (game.winner_id === 0 && playerScore === opponentScore) {
            result = 'draw';
          } else {
            result = 'loss';
          }
          
          // Determine opponent name
          const opponentName = opponentId === 0 ? 'AI' : game.player2_name || `Player ${opponentId}`;
          
          return {
            id: game.id,
            opponent: opponentName,
            result: result,
            score: `${playerScore}-${opponentScore}`,
            date: game.finished_at || game.started_at,
            duration: 0 // Not provided by API
          };
        });
        
        console.log('[ProfileManager] Mapped games:', games);
        this.displayRecentGames(games);
      } else {
        console.warn('[ProfileManager] Game history API returned error:', response.status);
        this.displayRecentGames([]);
      }
    } catch (error) {
      console.error('Failed to load recent games:', error);
      this.displayRecentGames([]);
    }
  }

  private displayRecentGames(games: RecentGame[]): void {
    const container = document.getElementById('profile-recent-activity');
    if (!container) {
      console.warn('[ProfileManager] Recent activity container not found!');
      return;
    }
    
    console.log('[ProfileManager] Displaying', games.length, 'recent games');
    
    if (games.length === 0) {
      container.innerHTML = '<div class="activity-row"><span colspan="5">No recent games</span></div>';
      return;
    }

    // Match the HTML table structure: Date, Game Mode, Opponent, Result, Score
    container.innerHTML = games.map(game => {
      const date = new Date(game.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateDisplay;
      if (date.toDateString() === today.toDateString()) {
        dateDisplay = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateDisplay = 'Yesterday';
      } else {
        dateDisplay = date.toLocaleDateString();
      }
      
      return `
        <div class="activity-row">
          <span>${dateDisplay}</span>
          <span>Campaign</span>
          <span>${this.escapeHtml(game.opponent)}</span>
          <span class="result-${game.result}">${game.result.charAt(0).toUpperCase() + game.result.slice(1)}</span>
          <span>${game.score}</span>
        </div>
      `;
    }).join('');
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