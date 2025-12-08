// frontend/src/managers/profile/ProfileUIManager.ts
// Handles UI updates and display for profile functionality

import { logger } from '../../utils/Logger';
import { authService } from '../../core/authService';

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
  gameMode?: string;
}

interface TournamentRanking {
  tournamentName: string;
  date: string;
  rank: number | string;
  totalParticipants: number;
  status: string;
  isWinner?: boolean;
}

export class ProfileUIManager {
  constructor() {
    logger.info('ProfileUIManager', '🏗️ ProfileUIManager initialized');
  }

  /**
   * Display basic user information
   */
  displayBasicUserInfo(): void {
    const user = authService?.getCurrentUser();

    // Update profile display elements with basic auth info
    const usernameEl = document.getElementById('profile-username');
    const userIdEl = document.getElementById('profile-user-id');
    const memberSinceEl = document.getElementById('profile-member-since');

    if (usernameEl) usernameEl.textContent = user?.username || 'Unknown';
    if (userIdEl) userIdEl.textContent = `User ID: ${user?.userId || user?.id || 'Unknown'}`;
    if (memberSinceEl) memberSinceEl.textContent = `Member since: ${new Date().toLocaleDateString()}`;
  }

  /**
   * Display user profile information
   */
  displayUserProfile(userInfo: UserProfile): void {
    logger.info('ProfileUIManager', 'Displaying user profile information');
    const user = authService?.getCurrentUser();

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

    // Log element availability for debugging
    const elementsStatus = {
      'profile-username': !!usernameEl,
      'profile-user-id': !!userIdEl,
      'profile-member-since': !!memberSinceEl,
      'profile-display-name': !!displayNameEl,
      'profile-bio': !!bioEl,
      'profile-country': !!countryEl,
      'profile-avatar': !!avatarEl,
      'profile-campaign-level': !!campaignLevelEl,
      'profile-level': !!profileLevelEl
    };
    logger.debug('ProfileUIManager', 'Element availability check:', elementsStatus);

    if (usernameEl) usernameEl.textContent = user?.username || 'Unknown';
    if (userIdEl) userIdEl.textContent = `User ID: ${user?.userId || user?.id || 'Unknown'}`;
    if (memberSinceEl) memberSinceEl.textContent = `Member since: ${new Date(userInfo.created_at).toLocaleDateString()}`;
    if (displayNameEl) displayNameEl.textContent = userInfo.display_name || user?.username || 'Unknown';
    if (bioEl) bioEl.textContent = userInfo.bio || 'No bio provided';
    if (countryEl) countryEl.textContent = userInfo.country || 'Not specified';

    // Update campaign level in stats section
    if (campaignLevelEl) {
      const levelText = userInfo.campaign_level ? `Level ${userInfo.campaign_level}` : 'Level 1';
      campaignLevelEl.textContent = levelText;
    }

    // Update big level number at top of dashboard
    if (profileLevelEl) {
      const level = userInfo.campaign_level || 1;
      profileLevelEl.textContent = level.toString();
    }

    if (avatarEl) {
      avatarEl.textContent = (userInfo.display_name || user?.username || 'U').charAt(0).toUpperCase();
    }

    logger.info('ProfileUIManager', 'User profile display complete');
  }

  /**
   * Display game statistics
   */
  displayGameStats(stats: GameStats): void {
    logger.info('ProfileUIManager', 'Displaying game statistics:', stats);
    logger.debug('ProfileUIManager', 'Stats breakdown - Wins:', stats.wins, 'Losses:', stats.losses, 'Draws:', stats.draws, 'Total:', stats.total_games);

    const winsEl = document.getElementById('profile-wins');
    const lossesEl = document.getElementById('profile-losses');
    const drawsEl = document.getElementById('profile-draws');
    const totalGamesEl = document.getElementById('profile-total-games');
    const winRateEl = document.getElementById('profile-win-rate');
    const avgDurationEl = document.getElementById('profile-avg-duration');

    // Log element availability for debugging
    const elementsStatus = {
      'profile-wins': !!winsEl,
      'profile-losses': !!lossesEl,
      'profile-draws': !!drawsEl,
      'profile-total-games': !!totalGamesEl,
      'profile-win-rate': !!winRateEl,
      'profile-avg-duration': !!avgDurationEl
    };
    logger.debug('ProfileUIManager', 'Game stats elements availability:', elementsStatus);

    // Display only real data from database
    if (winsEl) winsEl.textContent = stats.wins.toString();
    if (lossesEl) lossesEl.textContent = stats.losses.toString();
    if (drawsEl) drawsEl.textContent = stats.draws.toString();
    if (totalGamesEl) totalGamesEl.textContent = stats.total_games.toString();
    if (winRateEl) winRateEl.textContent = `${stats.winRate}%`;
    if (avgDurationEl) avgDurationEl.textContent = `${Math.round(stats.averageGameDuration / 1000)}s`;

    // Hide or remove mock/calculated fields that don't exist in database
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

    logger.info('ProfileUIManager', 'Game statistics display complete');
  }

  /**
   * Display recent games
   */
  displayRecentGames(games: RecentGame[]): void {
    logger.info('ProfileUIManager', `Displaying ${games.length} recent games`);

    const container = document.getElementById('profile-recent-activity');
    if (!container) {
      logger.warn('ProfileUIManager', 'Recent activity container not found!');
      return;
    }

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

      // Format game mode display
      let gameModeDisplay = 'Co-op';
      if (game.gameMode === 'arcade') {
        gameModeDisplay = 'Arcade';
      } else if (game.gameMode === 'tournament') {
        gameModeDisplay = 'Tournament';
      } else if (game.gameMode === 'coop') {
        gameModeDisplay = 'Co-op';
      }

      return `
        <div class="activity-row">
          <span>${dateDisplay}</span>
          <span>${gameModeDisplay}</span>
          <span>${this.escapeHtml(game.opponent)}</span>
          <span class="result-${game.result}">${game.result.charAt(0).toUpperCase() + game.result.slice(1)}</span>
          <span>${game.score}</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Display tournament count and statistics
   */
  displayTournamentCount(count: number): void {
    const tournamentsEl = document.getElementById('profile-tournaments');
    if (tournamentsEl) {
      tournamentsEl.textContent = count.toString();
    }
  }

  /**
   * Display tournament statistics (wins and top 3 finishes)
   */
  displayTournamentStats(rankings: TournamentRanking[]): void {
    logger.info('ProfileUIManager', `Calculating tournament statistics from ${rankings.length} rankings`);

    // Calculate tournament wins (1st place finishes)
    const wins = rankings.filter(r => r.rank === 1 || r.isWinner).length;
    const winsEl = document.getElementById('profile-tournament-wins');
    if (winsEl) {
      winsEl.textContent = wins.toString();
    }

    // Calculate top 3 finishes
    const top3 = rankings.filter(r => 
      (typeof r.rank === 'number' && r.rank >= 1 && r.rank <= 3) || 
      r.isWinner
    ).length;
    const top3El = document.getElementById('profile-top3');
    if (top3El) {
      top3El.textContent = top3.toString();
    }

    // Calculate prize money (rough estimate based on wins)
    const earnings = wins * 100; // Base prize per tournament win
    const earningsEl = document.getElementById('profile-earnings');
    if (earningsEl) {
      earningsEl.textContent = `$${earnings}`;
    }

    logger.info('ProfileUIManager', `Tournament stats: wins=${wins}, top3=${top3}, earnings=$${earnings}`);
  }

  /**
   * Display tournament rankings
   */
  displayTournamentRankings(rankings: TournamentRanking[]): void {
    logger.info('ProfileUIManager', `Displaying ${rankings.length} tournament rankings`);

    const container = document.getElementById('profile-tournament-rankings');
    if (!container) {
      logger.warn('ProfileUIManager', 'Tournament rankings container not found!');
      return;
    }

    if (rankings.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 20px; text-align: center; color: #aaa;">
          <p>No tournament history yet</p>
        </div>
      `;
      return;
    }

    // Display tournament rankings: Tournament, Date, Rank, Participants, Status
    container.innerHTML = rankings.map(ranking => {
      const date = new Date(ranking.date);
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

      // Format rank display
      let rankDisplay = ranking.rank;
      if (ranking.isWinner) {
        rankDisplay = `🏆 ${rankDisplay}`;
      } else if (ranking.rank === 1) {
        rankDisplay = '🥇 1st';
      } else if (ranking.rank === 2) {
        rankDisplay = '🥈 2nd';
      } else if (ranking.rank === 3) {
        rankDisplay = '🥉 3rd';
      } else if (ranking.rank !== '--') {
        rankDisplay = `#${ranking.rank}`;
      }

      // Status class for styling
      let statusClass = 'status-' + ranking.status;
      let statusDisplay = ranking.status.charAt(0).toUpperCase() + ranking.status.slice(1);

      return `
        <div class="activity-row">
          <span>${this.escapeHtml(ranking.tournamentName)}</span>
          <span>${dateDisplay}</span>
          <span style="font-weight: bold;">${rankDisplay}</span>
          <span>${ranking.totalParticipants}</span>
          <span class="${statusClass}">${statusDisplay}</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Escape HTML characters
   */
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