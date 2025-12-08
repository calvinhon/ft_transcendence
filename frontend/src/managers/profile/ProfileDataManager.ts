// frontend/src/managers/profile/ProfileDataManager.ts
// Handles data loading and API calls for profile functionality

import { logger } from '../../utils/Logger';
import { authService } from '../../core/authService';

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

export class ProfileDataManager {
  private baseURL: string = '/api/user';
  private gameURL: string = '/api/game';
  private tournamentURL: string = '/api/tournament';

  constructor() {
    logger.info('ProfileDataManager', '🏗️ ProfileDataManager initialized');
  }

  /**
   * Load user profile information
   */
  async loadUserProfile(userId: number): Promise<UserProfile | null> {
    try {
      logger.info('ProfileDataManager', `Loading user profile for userId: ${userId}`);
      const response = await fetch(`${this.baseURL}/profile/${userId}`, {
        headers: authService.getAuthHeaders()
      });

      if (response.ok) {
        const userInfo: UserProfile = await response.json();
        logger.info('ProfileDataManager', 'Profile data loaded successfully');
        return userInfo;
      } else {
        logger.warn('ProfileDataManager', `Failed to load user profile: ${response.status}`);
        return null;
      }
    } catch (error) {
      logger.error('ProfileDataManager', 'Failed to load user profile:', error);
      return null;
    }
  }

  /**
   * Load game statistics
   */
  async loadGameStats(userId: number): Promise<GameStats> {
    try {
      logger.info('ProfileDataManager', `Loading game stats for userId: ${userId}`);
      const response = await fetch(`${this.gameURL}/stats/${userId}`, {
        headers: authService.getAuthHeaders()
      });

      if (response.ok) {
        const apiResponse: any = await response.json();
        logger.debug('ProfileDataManager', 'Raw API stats response:', apiResponse);

        // Unwrap the response if it has success/data structure
        const apiStats = apiResponse.data || apiResponse;

        // Map API response to GameStats interface
        const stats: GameStats = {
          wins: apiStats.wins || 0,
          losses: apiStats.losses || 0,
          draws: apiStats.draws || 0,
          total_games: apiStats.totalGames || apiStats.total_games || 0,
          winRate: apiStats.winRate || 0,
          averageGameDuration: apiStats.averageGameDuration || 0
        };

        logger.info('ProfileDataManager', 'Game stats loaded successfully:', stats);
        return stats;
      } else {
        logger.warn('ProfileDataManager', `Game stats API returned error: ${response.status}`);
        return this.getDefaultStats();
      }
    } catch (error) {
      logger.error('ProfileDataManager', 'Failed to load game stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Load recent games
   */
  async loadRecentGames(userId: number, limit: number = 20): Promise<RecentGame[]> {
    try {
      logger.info('ProfileDataManager', `Loading recent games for userId: ${userId}, limit: ${limit}`);
      const response = await fetch(`${this.gameURL}/history/${userId}?limit=${limit}`, {
        headers: authService.getAuthHeaders()
      });

      if (response.ok) {
        const apiResponse = await response.json();
        
        // Handle API response format: { success: true, data: [...] }
        let apiGames: any[];
        if (apiResponse && typeof apiResponse === 'object' && apiResponse.data) {
          apiGames = apiResponse.data;
        } else if (Array.isArray(apiResponse)) {
          apiGames = apiResponse;
        } else {
          logger.warn('ProfileDataManager', 'Game history API returned unexpected format:', apiResponse);
          return [];
        }
        
        // Ensure apiGames is an array
        if (!Array.isArray(apiGames)) {
          logger.warn('ProfileDataManager', 'Game history API data is not an array:', apiGames);
          return [];
        }
        
        const games: RecentGame[] = [];

        for (const game of apiGames) {
          const gameData = await this.processGameData(game, userId);
          games.push(gameData);
        }

        logger.info('ProfileDataManager', `Loaded ${games.length} recent games`);
        return games;
      } else {
        logger.warn('ProfileDataManager', `Game history API returned error: ${response.status}`);
        return [];
      }
    } catch (error) {
      logger.error('ProfileDataManager', 'Failed to load recent games:', error);
      return [];
    }
  }

  /**
   * Load tournament count
   */
  async loadTournamentCount(userId: number): Promise<number> {
    try {
      logger.info('ProfileDataManager', `Loading tournament count for userId: ${userId}`);
      const response = await fetch(`${this.tournamentURL}/user/${userId}/count`, {
        headers: authService.getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        const count = data.count || 0;
        logger.info('ProfileDataManager', `Tournament count: ${count}`);
        return count;
      } else {
        logger.warn('ProfileDataManager', `Tournament count API returned error: ${response.status}`);
        return 0;
      }
    } catch (error) {
      logger.error('ProfileDataManager', 'Failed to load tournament count:', error);
      return 0;
    }
  }

  /**
   * Load tournament rankings
   */
  async loadTournamentRankings(userId: number): Promise<TournamentRanking[]> {
    try {
      logger.info('ProfileDataManager', `Loading tournament rankings for userId: ${userId}`);
      const response = await fetch(`${this.tournamentURL}/user/${userId}/rankings`, {
        headers: authService.getAuthHeaders()
      });

      if (response.ok) {
        const apiResponse = await response.json();
        
        // Handle API response format: { success: true, data: [...] }
        let rankings: any[];
        if (apiResponse && typeof apiResponse === 'object' && apiResponse.data) {
          rankings = apiResponse.data;
        } else if (Array.isArray(apiResponse)) {
          rankings = apiResponse;
        } else {
          logger.warn('ProfileDataManager', 'Tournament rankings API returned unexpected format:', apiResponse);
          return [];
        }
        
        logger.info('ProfileDataManager', `Loaded ${rankings.length} tournament rankings`);
        return rankings;
      } else {
        logger.warn('ProfileDataManager', `Tournament rankings API returned error: ${response.status}`);
        return [];
      }
    } catch (error) {
      logger.error('ProfileDataManager', 'Failed to load tournament rankings:', error);
      return [];
    }
  }

  /**
   * Process individual game data
   */
  private async processGameData(game: any, userId: number): Promise<RecentGame> {
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
    const opponentName = await this.getOpponentName(game, opponentId, isPlayer1);

    return {
      id: game.id,
      opponent: opponentName,
      result: result,
      score: `${playerScore}-${opponentScore}`,
      date: game.finished_at || game.started_at,
      duration: 0, // Not provided by API
      gameMode: game.game_mode || 'coop'
    };
  }

  /**
   * Get opponent name for a game
   */
  private async getOpponentName(game: any, opponentId: number, isPlayer1: boolean): Promise<string> {
    if (game.game_mode === 'tournament' && game.tournament_match_id) {
      if (game.player1_name && game.player2_name) {
        return isPlayer1 ? game.player2_name : game.player1_name;
      } else if (opponentId === 0) {
        return 'AI';
      } else {
        return await this.fetchOpponentName(opponentId);
      }
    } else if (game.game_mode === 'arcade' && game.team2_players) {
      try {
        const team2 = JSON.parse(game.team2_players);
        const teamNames = team2.map((p: any) => p.username).join(', ');
        return `Team 2 (${teamNames})`;
      } catch (e) {
        return 'Team 2';
      }
    } else {
      return opponentId === 0 ? 'AI' : game.player2_name || `Player ${opponentId}`;
    }
  }

  /**
   * Fetch opponent name by ID
   */
  private async fetchOpponentName(opponentId: number): Promise<string> {
    try {
      const response = await fetch(`/api/auth/profile/${opponentId}`, {
        headers: authService.getAuthHeaders()
      });

      if (response.ok) {
        const profileData = await response.json();
        return profileData.data?.username || `User ${opponentId}`;
      } else {
        return `User ${opponentId}`;
      }
    } catch (error) {
      logger.error('ProfileDataManager', 'Error fetching opponent profile:', error);
      return `Player ${opponentId}`;
    }
  }

  /**
   * Get default stats when API fails
   */
  private getDefaultStats(): GameStats {
    return {
      wins: 0,
      losses: 0,
      draws: 0,
      total_games: 0,
      winRate: 0,
      averageGameDuration: 0
    };
  }
}