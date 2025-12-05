// frontend/src/managers/profile/ProfileManager.ts
// Main orchestrator for all profile-related managers

import { logger } from '../../utils/Logger';
import { ProfileDataManager } from './profile-data-manager';
import { ProfileUIManager } from './profile-ui-manager';
import { authService } from '../../core/authService';

export class ProfileManager {
  private static instance: ProfileManager;

  public readonly dataManager: ProfileDataManager;
  public readonly uiManager: ProfileUIManager;

  private constructor() {
    logger.info('profile-manager', '🏗️ ProfileManager initializing...');

    // Initialize specialized managers
    this.dataManager = new ProfileDataManager();
    this.uiManager = new ProfileUIManager();

    logger.info('profile-manager', '✅ ProfileManager initialized with specialized managers');
  }

  static getInstance(): ProfileManager {
    if (!ProfileManager.instance) {
      ProfileManager.instance = new ProfileManager();
    }
    return ProfileManager.instance;
  }

  /**
   * Load complete profile data
   */
  async loadProfile(): Promise<void> {
    logger.info('profile-manager', 'Loading complete profile data');

    const user = authService?.getCurrentUser();

    if (!user) {
      logger.warn('profile-manager', 'No user logged in');
      return;
    }

    try {
      // Load user profile info
      const userProfile = await this.dataManager.loadUserProfile(user.userId);
      if (userProfile) {
        this.uiManager.displayUserProfile(userProfile);
      } else {
        this.uiManager.displayBasicUserInfo();
      }

      // Load game statistics
      const gameStats = await this.dataManager.loadGameStats(user.userId);
      this.uiManager.displayGameStats(gameStats);

      // Load recent games
      const recentGames = await this.dataManager.loadRecentGames(user.userId);
      this.uiManager.displayRecentGames(recentGames);

      // Load tournament count
      const tournamentCount = await this.dataManager.loadTournamentCount(user.userId);
      this.uiManager.displayTournamentCount(tournamentCount);

      // Load tournament rankings
      const tournamentRankings = await this.dataManager.loadTournamentRankings(user.userId);
      this.uiManager.displayTournamentRankings(tournamentRankings);

      logger.info('profile-manager', 'Profile loading complete');
    } catch (error) {
      logger.error('profile-manager', 'Failed to load profile:', error);
      // Fallback to basic user info
      this.uiManager.displayBasicUserInfo();
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners(): void {
    // Load profile data when profile section is shown
    document.addEventListener('DOMContentLoaded', () => {
      logger.info('profile-manager', 'DOMContentLoaded - initial load');
      this.loadProfile();
    });
  }
}

export const profileManager = ProfileManager.getInstance();