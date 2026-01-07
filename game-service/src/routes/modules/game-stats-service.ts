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
         -- AI games: opponent has ID <= 0
         SUM(CASE WHEN (player1_id = ? AND player2_id <= 0) OR (player2_id = ? AND player1_id <= 0) THEN 1 ELSE 0 END) as ai_games,
         SUM(CASE WHEN ((player1_id = ? AND player2_id <= 0) OR (player2_id = ? AND player1_id <= 0)) AND winner_id = ? THEN 1 ELSE 0 END) as ai_wins
         FROM games
         WHERE (player1_id = ? OR player2_id = ?) AND status = 'finished'`,
        [userId, userId, userId, userId, userId, userId, userId, userId],
        (err: Error | null, stats: any) => {
          if (err) {
            logger.error('Database error fetching game stats:', err);
            reject(err);
          } else {
            const totalGames = stats.total_games || 0;
            const wins = stats.wins || 0;
            const losses = totalGames - wins;
            const aiGames = stats.ai_games || 0;
            const aiWins = stats.ai_wins || 0;
            const aiLosses = aiGames - aiWins;
            const humanGames = totalGames - aiGames;
            const humanWins = wins - aiWins;
            const humanLosses = humanGames - humanWins;

            const gameStats: GameStats = {
              totalGames,
              wins,
              losses,
              winRate: totalGames > 0 ? parseFloat((wins / totalGames * 100).toFixed(2)) : 0,
              aiWins,
              aiLosses,
              humanWins,
              humanLosses
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