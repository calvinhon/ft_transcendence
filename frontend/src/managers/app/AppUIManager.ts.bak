// frontend/src/managers/app/AppUIManager.ts
// Handles general UI updates and profile management for the App

import { logger } from '../../utils/Logger';
import { settingsManager } from '../SettingsManager';
import { playerManager } from '../PlayerManager';
import { authService } from '../../core/authService';

export class AppUIManager {
  constructor() {
    logger.info('AppUIManager', '🏗️ AppUIManager initialized');
  }

  /**
   * Update user display
   */
  updateUserDisplay(): void {
    const user = authService?.getCurrentUser?.();

    const userDisplay = document.getElementById('main-menu-user-display');
    if (userDisplay && user) {
      userDisplay.textContent = `Welcome, ${user.username}!`;
    }
  }

  /**
   * Update host player display
   */
  updateHostPlayerDisplay(): void {
    const user = authService?.getCurrentUser?.();
    if (!user) return;

    const currentMode = settingsManager.getSetting('gameMode') || 'coop';

    // Update the appropriate host player name element based on current mode
    let hostPlayerNameElement: HTMLElement | null = null;
    switch (currentMode) {
      case 'coop':
        hostPlayerNameElement = document.getElementById('host-player-name-coop');
        break;
      case 'tournament':
        hostPlayerNameElement = document.getElementById('host-player-name-tournament');
        break;
      case 'arcade':
        hostPlayerNameElement = document.getElementById('host-player-name');
        break;
    }

    if (hostPlayerNameElement) {
      hostPlayerNameElement.textContent = user.username;
    }
  }

  /**
   * Update local players display
   */
  updateLocalPlayersDisplay(): void {
    const container = document.getElementById('local-players-list');
    if (!container) return;

    container.innerHTML = playerManager.getLocalPlayers().map(player => `
      <div class="player-item">
        <div class="player-info">
          <div class="player-name">${player.username}${player.isCurrentUser ? ' (You)' : ''}</div>
          <div class="player-status">${player.isCurrentUser ? 'Host' : 'Local Player'}</div>
        </div>
        ${!player.isCurrentUser ? '<button class="remove-player-btn" data-player-id="' + player.id + '">Remove</button>' : ''}
      </div>
    `).join('');

    // Add remove button listeners
    container.querySelectorAll('.remove-player-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const playerId = btn.getAttribute('data-player-id');
        const appPlayerManager = (window as any).appPlayerManager;
        if (appPlayerManager) {
          appPlayerManager.removeLocalPlayer(playerId || '');
        }
      });
    });
  }

  /**
   * Update play config UI
   */
  updatePlayConfigUI(): void {
    // Update settings display based on current settings
    // Ensure host name is shown in the party UI
    this.updateHostPlayerDisplay();

    this.updateLocalPlayersDisplay();

    const appPlayerManager = (window as any).appPlayerManager;
    if (appPlayerManager) {
      appPlayerManager.updateGamePartyDisplay();
    }

    this.initializePlayerSelection();
    this.updateScoreDisplay(); // Sync score display

    // Setup game mode tab event listeners
    this.setupGameModeTabListeners();

    // Setup player card click listeners
    this.setupPlayerCardListeners();
  }

  /**
   * Setup player card click listeners
   */
  setupPlayerCardListeners(): void {
    // Add click listeners to all player cards
    const playerCards = document.querySelectorAll('.player-card');
    playerCards.forEach(card => {
      // Remove existing listeners to avoid duplicates
      card.removeEventListener('click', this.handlePlayerCardClick);
      // Add the listener
      card.addEventListener('click', this.handlePlayerCardClick);
    });
  }

  /**
   * Handle player card click
   */
  private handlePlayerCardClick = (e: Event): void => {
    const card = e.target as HTMLElement;
    const playerCard = card.closest('.player-card') as HTMLElement;
    if (!playerCard) return;

    // Check if we're inside a valid party container
    const isInsideParty = playerCard.closest('#game-party-list, #team1-list, #team2-list, #coop-party-frame, #tournament-party-frame');
    if (isInsideParty) {
      console.log('[AppUIManager] Player card clicked', playerCard.id || playerCard.dataset.playerId);
      playerManager.togglePlayerSelection(playerCard);
    }
  }

  /**
   * Initialize player selection
   */
  initializePlayerSelection(): void {
    // Player selection is now handled by PlayerManager
    // This method is kept for backward compatibility
    // Set up AI difficulty change handler to update AI player display (only once)
    // This is now handled by SettingsManager and UIManager
  }

  /**
   * Update score display
   */
  updateScoreDisplay(): void {
    const scoreDisplay = document.getElementById('score-value');
    const score = settingsManager.getSetting('scoreToWin');
    if (scoreDisplay && score !== undefined) {
      scoreDisplay.textContent = score.toString();
    }
  }

  /**
   * Change score to win
   */
  changeScoreToWin(delta: number): void {
    // Allow score changes in all modes
    const currentScore = settingsManager.getSetting('scoreToWin') || 3;
    const newScore = Math.max(1, Math.min(21, currentScore + delta)); // Limit between 1 and 21

    settingsManager.updateSetting('scoreToWin', newScore);

    // Update display
    this.updateScoreDisplay();
  }

  /**
   * Handle config option
   */
  handleConfigOption(button: HTMLElement): void {
    const setting = button.getAttribute('data-setting');
    const value = button.getAttribute('data-value');
    if (!setting || !value) return;

    // Remove active class from siblings
    const siblings = button.parentElement?.querySelectorAll('.config-option, .setting-option') || [];
    siblings.forEach(sibling => sibling.classList.remove('active'));
    button.classList.add('active');

    // Convert hyphenated setting names to camelCase for gameSettings object
    const settingMap: { [key: string]: string } = {
      'ai-difficulty': 'aiDifficulty',
      'ball-speed': 'ballSpeed',
      'paddle-speed': 'paddleSpeed',
      'powerups-enabled': 'powerupsEnabled',
      'accelerate-on-hit': 'accelerateOnHit',
      'gameMode': 'gameMode'
    };

    const settingKey = settingMap[setting] || setting;

    // Update settings using SettingsManager
    if (settingKey === 'scoreToWin') {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        settingsManager.updateSetting('scoreToWin', numValue);
      }
    } else if (settingKey === 'gameMode') {
      settingsManager.updateSetting('gameMode', value as 'coop' | 'arcade' | 'tournament');
    } else {
      // For other settings, try to update them
      (settingsManager as any).updateSetting(settingKey, value);
    }

    // Optionally trigger UI updates if needed
    // For mode changes, call handleGameModeChange
    if (setting === 'gameMode') {
      const appGameModeManager = (window as any).appGameModeManager;
      if (appGameModeManager) {
        const tab = document.querySelector(`.game-mode-tab[data-mode="${value}"]`) as HTMLElement;
        if (tab) appGameModeManager.handleGameModeChange(tab);
      }
    }
  }

  /**
   * Setup game mode tab event listeners
   */
  setupGameModeTabListeners(): void {
    const gameModeTabs = document.querySelectorAll('.game-mode-tab');
    gameModeTabs.forEach(tab => {
      // Remove existing listeners to avoid duplicates
      tab.removeEventListener('click', this.handleGameModeTabClick);
      // Add the listener
      tab.addEventListener('click', this.handleGameModeTabClick);
    });
  }

  /**
   * Handle game mode tab click
   */
  private handleGameModeTabClick = (e: Event): void => {
    console.log('[AppUIManager] Game mode tab clicked', e.target);
    const tab = e.target as HTMLElement;
    const app = (window as any).app;
    if (app && typeof app.handleGameModeChange === 'function') {
      app.handleGameModeChange(tab.closest('.game-mode-tab') as HTMLElement);
    }
  }

  /**
   * Load profile data
   */
  async loadProfileData(): Promise<void> {
    console.log('[AppUIManager] loadProfileData() called');
    const user = authService?.getCurrentUser?.();
    console.log('[AppUIManager] Current user:', user);

    if (!user) {
      console.warn('[AppUIManager] No user logged in');
      return;
    }

    try {
      // Use the ProfileManager for comprehensive profile loading
      const profileManager = (window as any).profileManager;
      console.log('[AppUIManager] ProfileManager available:', !!profileManager);

      if (profileManager) {
        console.log('[AppUIManager] Calling profileManager.loadProfile()');
        await profileManager.loadProfile();
        console.log('[AppUIManager] ProfileManager.loadProfile() completed');
      } else {
        console.warn('[AppUIManager] ProfileManager not available, using fallback');
        // Fallback to basic loading if ProfileManager not available
        this.updateBasicProfileInfo(user);
        await this.loadBasicStats(user.userId);
      }
    } catch (error) {
      logger.error('AppUIManager', 'Failed to load profile data', error);
      // Fallback to basic user info
      this.updateBasicProfileInfo(user);
    }
  }

  /**
   * Update basic profile info
   */
  updateBasicProfileInfo(user: any): void {
    const usernameEl = document.getElementById('profile-username');
    const userIdEl = document.getElementById('profile-user-id');
    const memberSinceEl = document.getElementById('profile-member-since');

    if (usernameEl) usernameEl.textContent = user.username;
    if (userIdEl) userIdEl.textContent = `User ID: ${user.userId}`;
    if (memberSinceEl) memberSinceEl.textContent = 'Member since: Recent';
  }

  /**
   * Load basic stats
   */
  async loadBasicStats(userId: number): Promise<void> {
    const headers = authService && authService.getAuthHeaders ? authService.getAuthHeaders() : {};

    try {
      // Load profile stats
      const statsResponse = await fetch(`/api/game/stats/${userId}`, { headers });
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        this.updateProfileStats(stats);
      } else {
        // Fallback to default stats
        this.updateProfileStats({
          total_games: 0,
          wins: 0,
          win_rate: 0,
          streak: 0,
          tournaments: 0,
          rank: '--'
        });
      }
    } catch (error) {
      logger.error('AppUIManager', 'Failed to load basic stats', error);
    }
  }

  /**
   * Update profile stats
   */
  updateProfileStats(stats: any): void {
    // Update stat values
    const totalGamesEl = document.getElementById('profile-total-games');
    const winsEl = document.getElementById('profile-wins');
    const winRateEl = document.getElementById('profile-win-rate');
    const streakEl = document.getElementById('profile-streak');
    const tournamentsEl = document.getElementById('profile-tournaments');
    const rankEl = document.getElementById('profile-rank');

    if (totalGamesEl) totalGamesEl.textContent = stats.total_games?.toString() || '0';
    if (winsEl) winsEl.textContent = stats.wins?.toString() || '0';
    if (winRateEl) winRateEl.textContent = `${Math.round(stats.win_rate || 0)}%`;
    if (streakEl) streakEl.textContent = stats.streak?.toString() || '0';
    if (tournamentsEl) tournamentsEl.textContent = stats.tournaments?.toString() || '0';
    if (rankEl) rankEl.textContent = stats.rank ? `#${stats.rank}` : '#--';

    // Update level and experience (calculated from total games)
    const level = Math.floor((stats.total_games || 0) / 10) + 1;
    const expInLevel = (stats.total_games || 0) % 10;
    const expNeeded = 10;
    const expPercentage = (expInLevel / expNeeded) * 100;

    const levelEl = document.getElementById('profile-level');
    const expBarEl = document.getElementById('profile-exp-bar');
    const expTextEl = document.getElementById('profile-exp-text');
    // Add a combined level+XP element if present
    const levelXpEl = document.getElementById('profile-level-xp');

    if (levelEl) levelEl.textContent = `Level: ${level}`;
    if (expBarEl) expBarEl.style.width = `${expPercentage}%`;
    if (expTextEl) expTextEl.textContent = `XP: ${expInLevel * 100} / ${expNeeded * 100}`;
    if (levelXpEl) levelXpEl.textContent = `Level ${level} | XP: ${expInLevel * 100} / ${expNeeded * 100}`;
  }

  /**
   * Update recent activity
   */
  updateRecentActivity(activities: any[]): void {
    const container = document.getElementById('profile-recent-activity');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = `
        <div class="activity-item">
          <span class="activity-text">No recent activity</span>
          <span class="activity-time">--</span>
        </div>
      `;
      return;
    }

    container.innerHTML = activities.slice(0, 5).map(activity => {
      const timeAgo = this.formatTimeAgo(new Date(activity.created_at || Date.now()));
      const result = activity.won ? 'Won' : 'Lost';
      const resultClass = activity.won ? 'win' : 'loss';

      return `
        <div class="activity-item">
          <span class="activity-text">
            <span class="${resultClass}">${result}</span> game vs ${activity.opponent || 'AI'}
          </span>
          <span class="activity-time">${timeAgo}</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Update achievements
   */
  updateAchievements(): void {
    const container = document.getElementById('profile-achievements');
    if (!container) return;

    const achievements = [
      { icon: '🎮', title: 'First Game', desc: 'Play your first game', unlocked: true },
      { icon: '🏆', title: 'First Victory', desc: 'Win your first game', unlocked: false },
      { icon: '🔥', title: 'Hot Streak', desc: 'Win 5 games in a row', unlocked: false },
      { icon: '💯', title: 'Century', desc: 'Play 100 games', unlocked: false },
      { icon: '🏅', title: 'Champion', desc: 'Win a tournament', unlocked: false },
      { icon: '⚡', title: 'Speed Demon', desc: 'Win with fast ball speed', unlocked: false }
    ];

    container.innerHTML = achievements.map(achievement => `
      <div class="achievement-card ${achievement.unlocked ? '' : 'locked'}">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-info">
          <h4>${achievement.title}</h4>
          <p>${achievement.desc}</p>
        </div>
      </div>
    `).join('');
  }

  /**
   * Format time ago
   */
  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  /**
   * Update game UI
   */
  updateGameUI(): void {
    // All UI rendering is now handled directly on canvas in game.ts
    // No need to update HTML elements for player info and scores
    console.log('Game UI update - rendering handled on canvas');
  }

  /**
   * Cleanup the UI manager
   */
  cleanup(): void {
    logger.info('AppUIManager', '🧹 Cleaning up UI manager...');
    // No persistent state to clean up
    logger.info('AppUIManager', '✅ UI manager cleaned up');
  }
}