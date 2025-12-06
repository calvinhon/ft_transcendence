// Stub file - leaderboard module
// frontend/src/leaderboard.ts - TypeScript version of leaderboard manager

interface LeaderboardPlayer {
  user_id: number;
  username?: string;
  display_name: string | null;
  country: string | null;
  wins: number;
  total_games: number;
  winRate: number;
}

export class LeaderboardManager {
  private baseURL: string = '/api/user';

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Leaderboard tabs
    document.querySelectorAll('[data-leaderboard]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-leaderboard') || 'wins';
        this.switchTab(type);
        this.loadLeaderboard(type);
      });
    });
  }

  public async loadLeaderboard(type: string = 'wins'): Promise<void> {
    const authManager = (window as any).authManager;
    if (!authManager) return;
    
    try {
      const response = await fetch(`${this.baseURL}/leaderboard?type=${type}&limit=50`, {
        headers: authManager.getAuthHeaders()
      });

      if (response.ok) {
        const leaderboard: LeaderboardPlayer[] = await response.json();
        this.displayLeaderboard(leaderboard, type);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  }

  private switchTab(type: string): void {
    document.querySelectorAll('[data-leaderboard]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-leaderboard') === type);
    });
  }

  private displayLeaderboard(leaderboard: LeaderboardPlayer[], type: string): void {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    
    if (leaderboard.length === 0) {
      container.innerHTML = '<p>No players on the leaderboard yet.</p>';
      return;
    }

    const leaderboardHTML = leaderboard.map((player, index) => {
      const rank = index + 1;
      let rankClass = '';
      if (rank === 1) rankClass = 'first';
      else if (rank === 2) rankClass = 'second';
      else if (rank === 3) rankClass = 'third';

      return `
        <div class="leaderboard-item">
          <div class="rank ${rankClass}">${rank}</div>
          <div class="user-info">
            <div class="username">${player.display_name || `User ${player.user_id}`}</div>
            ${player.country ? `<div class="country">${player.country}</div>` : ''}
          </div>
          <div class="stats">
            <span class="wins">${player.wins} wins</span>
            <span class="games">${player.total_games} games</span>
            <span class="winrate">${player.winRate}% win rate</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = leaderboardHTML;
  }
}

// Global leaderboard manager instance
(window as any).leaderboardManager = new LeaderboardManager();