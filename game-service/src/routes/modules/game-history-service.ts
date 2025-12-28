// game-service/src/routes/modules/game-history-service.ts
import { db } from './database';
import { GameRecord } from './types';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('GAME-SERVICE');

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

  // Save a new game result
  async saveGame(params: {
    player1Id: number;
    player2Id: number;
    player1Score: number;
    player2Score: number;
    winnerId: number;
    gameMode: string;
    team1Players?: string;
    team2Players?: string;
    tournamentId?: number;
    tournamentMatchId?: number;
    skipTournamentNotification?: boolean;
  }): Promise<{ gameId: number }> {
    return new Promise((resolve, reject) => {
      const { player1Id, player2Id, player1Score, player2Score, winnerId, gameMode, team1Players, team2Players, tournamentId, tournamentMatchId, skipTournamentNotification } = params;

      db.run(
        `INSERT INTO games (player1_id, player2_id, player1_score, player2_score, winner_id, game_mode, status, finished_at, team1_players, team2_players, tournament_id, tournament_match_id)
         VALUES (?, ?, ?, ?, ?, ?, 'finished', datetime('now'), ?, ?, ?, ?)`,
        [player1Id, player2Id, player1Score, player2Score, winnerId, gameMode, team1Players || null, team2Players || null, tournamentId || null, tournamentMatchId || null],
        function (this: any, err: Error | null) {
          if (err) {
            logger.error('Database error saving game:', err);
            reject(err);
          } else {
            logger.info(`Game saved with ID: ${this.lastID}`);

            // Notify Tournament Service if applicable and NOT skipped
            if (tournamentId && tournamentMatchId && !skipTournamentNotification) {
              const http = require('http');
              const postData = JSON.stringify({
                matchId: tournamentMatchId,
                winnerId: winnerId,
                player1Score: player1Score,
                player2Score: player2Score
              });

              const req = http.request({
                hostname: 'tournament-service',
                port: 3000,
                path: '/api/matches/result',
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(postData)
                }
              }, (res: any) => {
                logger.info(`Tournament service notified: ${res.statusCode}`);
              });

              req.on('error', (e: Error) => {
                logger.error(`Problem notifying tournament service: ${e.message}`);
              });

              req.write(postData);
              req.end();
            }

            resolve({ gameId: this.lastID });
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
        if (game.player1_id !== undefined && game.player1_id !== null) {
          enrichedGame.player1_name = await this.fetchPlayerName(game.player1_id);
        }

        // Fetch player2 name
        if (game.player2_id !== undefined && game.player2_id !== null) {
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

  // Fetch player name from user service or auth service
  private async fetchPlayerName(userId: number): Promise<string> {
    if (userId === 0) return 'AI';
    // Heuristic: IDs >= 100000 are ephemeral/bot IDs in this system
    if (userId >= 100000) return 'BOT';
    try {
      // Try User Service for Display Name
      const userResponse = await fetch(`http://user-service:3000/profile/${userId}`);
      if (userResponse.ok) {
        const userData = await userResponse.json() as any;
        if (userData.display_name && userData.display_name !== 'undefined') {
          return userData.display_name;
        }
        if (userData.username && userData.username !== 'undefined') {
          return userData.username;
        }
      }

      // Fallback to Auth Service for Username
      const authResponse = await fetch(`http://auth-service:3000/auth/profile/${userId}`);
      if (authResponse.ok) {
        const authData = await authResponse.json() as any;
        if (authData.data && authData.data.username) return authData.data.username; // Response wrapped in data
        if (authData.username) return authData.username;
      }

      return `User ${userId}`;
    } catch (error) {
      logger.warn(`Failed to fetch name for user ${userId}:`, error);
      return `User ${userId}`;
    }
  }

  // Fetch a single game by ID (used for Match Details Dashboard)
  async getGameDetails(gameId: number): Promise<GameRecord | null> {
    return new Promise<GameRecord | null>((resolve, reject) => {
      db.get(
        `SELECT g.*
         FROM games g
         WHERE g.id = ?`,
        [gameId],
        (err: Error | null, game: GameRecord) => {
          if (err) {
            logger.error(`Database error fetching game ${gameId}:`, err);
            reject(err);
          } else if (!game) {
            resolve(null);
          } else {
            resolve(game);
          }
        }
      );
    });
  }

  // Enrich single game with player names
  async enrichGameWithPlayerNames(game: GameRecord): Promise<GameRecord> {
    const enrichedGame = { ...game };
    try {
      if (game.player1_id !== undefined && game.player1_id !== null) enrichedGame.player1_name = await this.fetchPlayerName(game.player1_id);
      if (game.player2_id !== undefined && game.player2_id !== null) enrichedGame.player2_name = await this.fetchPlayerName(game.player2_id);
      if (game.winner_id !== undefined && game.winner_id !== null) enrichedGame.winner_name = await this.fetchPlayerName(game.winner_id);
    } catch (fetchError) {
      logger.warn('Could not fetch player names:', fetchError);
      enrichedGame.player1_name = `User${game.player1_id}`;
      enrichedGame.player2_name = `User${game.player2_id}`;
      enrichedGame.winner_name = `User${game.winner_id}`;
    }
    return enrichedGame;
  }

  // Fetch game events
  async getGameEvents(gameId: number): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT * FROM game_events WHERE game_id = ? ORDER BY timestamp ASC`,
        [gameId],
        (err: Error | null, rows: any[]) => {
          if (err) {
            logger.error(`Error fetching events for game ${gameId}:`, err);
            reject(err);
          } else {
            resolve(rows.map(row => ({
              ...row,
              event_data: JSON.parse(row.event_data)
            })));
          }
        }
      );
    });
  }
}

// Global instance
export const gameHistoryService = new GameHistoryService();