// game-service/src/routes/modules/game-stats-service.ts
import { db } from './database';
import { GameStats } from './types';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('GAME-SERVICE');

export class GameStatsService {
  // Get game statistics for a user
  async getGameStats(userId: string): Promise<GameStats> {
    return new Promise<GameStats>((resolve, reject) => {
      db.get(
        `SELECT
         COUNT(*) as total_games,
         SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins,
         SUM(CASE WHEN winner_id != ? AND winner_id IS NOT NULL THEN 1 ELSE 0 END) as losses
         FROM games
         WHERE (player1_id = ? OR player2_id = ?) AND status = 'finished'`,
        [userId, userId, userId, userId],
        (err: Error | null, stats: any) => {
          if (err) {
            logger.error('Database error fetching game stats:', err);
            reject(err);
          } else {
            const gameStats: GameStats = {
              totalGames: stats.total_games || 0,
              wins: stats.wins || 0,
              losses: stats.losses || 0,
              winRate: stats.total_games > 0 ? parseFloat(((stats.wins || 0) / stats.total_games * 100).toFixed(2)) : 0
            };
            resolve(gameStats);
          }
        }
      );
    });
  }
}

// Global instance
export const gameStatsService = new GameStatsService();