// game-service/src/routes/modules/game-stats-service.ts
import { db } from './database';
import { GameStats } from './types';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('GAME-SERVICE');

export class GameStatsService {
  // Get game statistics for a user
  async getGameStats(userId: string): Promise<GameStats> {
    return new Promise<GameStats>((resolve, reject) => {
      // Patterns to find userId in JSON arrays (teammates)
      const p1 = `%"userId":${userId}%`;
      const p2 = `%,${userId},%`;
      const p3 = `[${userId},%`;
      const p4 = `%,${userId}]%`;
      const p5 = `[${userId}]%`;

      // Query for overall stats + AI breakdown
      // matches user as Captain (player1_id/player2_id) OR Teammate (in JSON)
      db.get(
        `SELECT
         COUNT(*) as total_games,
         SUM(CASE 
            WHEN winner_id = ? THEN 1 
            WHEN (winner_id IS NOT NULL AND winner_id = player1_id AND (team1_players LIKE ? OR team1_players LIKE ? OR team1_players LIKE ? OR team1_players LIKE ? OR team1_players LIKE ?)) THEN 1
            WHEN (winner_id IS NOT NULL AND winner_id = player2_id AND (team2_players LIKE ? OR team2_players LIKE ? OR team2_players LIKE ? OR team2_players LIKE ? OR team2_players LIKE ?)) THEN 1
            ELSE 0 
         END) as wins,
         
         -- AI games (simplified: only counts if user is Captain due to complexity)
         SUM(CASE WHEN (player1_id = ? AND player2_id <= 0) OR (player2_id = ? AND player1_id <= 0) THEN 1 ELSE 0 END) as ai_games,
         SUM(CASE WHEN ((player1_id = ? AND player2_id <= 0) OR (player2_id = ? AND player1_id <= 0)) AND winner_id = ? THEN 1 ELSE 0 END) as ai_wins

         FROM games
         WHERE (
            player1_id = ? OR player2_id = ?
            OR (
                (game_mode = 'arcade' OR game_mode = 'tournament') AND (
                    team1_players LIKE ? OR team1_players LIKE ? OR team1_players LIKE ? OR team1_players LIKE ? OR team1_players LIKE ? OR
                    team2_players LIKE ? OR team2_players LIKE ? OR team2_players LIKE ? OR team2_players LIKE ? OR team2_players LIKE ?
                )
            )
         ) AND status = 'finished'`,
        [
          // Wins Check
          userId,
          p1, p2, p3, p4, p5, // Team 1 Win
          p1, p2, p3, p4, p5, // Team 2 Win

          // AI Check
          userId, userId, userId, userId, userId,

          // Where Check
          userId, userId,
          p1, p2, p3, p4, p5, // Team 1
          p1, p2, p3, p4, p5  // Team 2
        ],
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