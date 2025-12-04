// game-service/src/routes/modules/game-history-service.ts
import { db } from './database';
import { GameRecord } from './types';
import { logger } from './logger';

export class GameHistoryService {
  // Fetch raw game history from database
  async getGameHistory(userId: string): Promise<GameRecord[]> {
    return new Promise<GameRecord[]>((resolve, reject) => {
      db.all(
        `SELECT g.*
         FROM games g
         WHERE g.player1_id = ? OR g.player2_id = ?
         ORDER BY g.started_at DESC
         LIMIT 50`,
        [userId, userId],
        (err: Error | null, games: GameRecord[]) => {
          if (err) {
            logger.error('Database error fetching game history:', err);
            reject(err);
          } else {
            resolve(games);
          }
        }
      );
    });
  }

  // Enrich games with player names from user service
  async enrichGamesWithPlayerNames(games: GameRecord[]): Promise<GameRecord[]> {
    const enrichedGames: GameRecord[] = [];

    logger.info(`Enriching ${games.length} games with player names`);

    for (const game of games) {
      const enrichedGame = { ...game };

      try {
        // Fetch player1 name
        if (game.player1_id) {
          enrichedGame.player1_name = await this.fetchPlayerName(game.player1_id);
        }

        // Fetch player2 name
        if (game.player2_id) {
          enrichedGame.player2_name = await this.fetchPlayerName(game.player2_id);
        }
      } catch (fetchError) {
        logger.warn('Could not fetch player names:', fetchError);
        enrichedGame.player1_name = `User${game.player1_id}`;
        enrichedGame.player2_name = `User${game.player2_id}`;
      }

      enrichedGames.push(enrichedGame);
    }

    return enrichedGames;
  }

  // Fetch player name from user service
  private async fetchPlayerName(userId: number): Promise<string> {
    try {
      const response = await fetch(`http://user-service:3000/profile/${userId}`);
      if (response.ok) {
        const playerData = await response.json() as any;
        return playerData.display_name || `User${userId}`;
      } else {
        return `User${userId}`;
      }
    } catch (error) {
      logger.warn(`Failed to fetch name for user ${userId}:`, error);
      return `User${userId}`;
    }
  }
}

// Global instance
export const gameHistoryService = new GameHistoryService();