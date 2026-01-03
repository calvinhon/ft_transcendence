// game-service/src/routes/modules/game-history-service.ts
import { db } from './database';
import { GameRecord } from './types';
import { createLogger } from '@ft-transcendence/common';
import { notifyTournamentService } from './tournament-notifier';

const logger = createLogger('GAME-SERVICE');

// Cache for player names to reduce HTTP calls
const playerNameCache = new Map<number, { name: string; expiry: number }>();
const CACHE_TTL = 60000; // 1 minute cache

export class GameHistoryService {
  // Fetch raw game history from database
  async getGameHistory(userId: string): Promise<GameRecord[]> {
    return new Promise<GameRecord[]>((resolve, reject) => {
      // Search for userId in player columns OR inside the team JSON arrays
      // We look for "userId":123 or just 123 in the array, but standard is objects with userId
      // To be safe and simple for SQLite JSON text search without json_each (if not enabled):
      // We check if the ID appears as a value. 
      // Like patterns: '%"userId":' || userId || ',%'  OR '%"userId":' || userId || '}%'
      // Or simply look for the ID if we assume it's unique enough (risky). 
      // Better: assume standard format [{"userId":1, ...}, ...]

      const idPattern = `%"userId":${userId}%`;
      const idPattern2 = `%,${userId},%`; // For array of numbers [1, 2]
      const idPattern3 = `[${userId},%`; // Start of array
      const idPattern4 = `%,${userId}]%`; // End of array
      const idPattern5 = `[${userId}]%`; // Single item array

      db.all(
        `SELECT g.*
         FROM games g
         WHERE g.player1_id = ? 
            OR g.player2_id = ?
            OR ((g.game_mode = 'arcade' OR g.game_mode = 'tournament') AND (
                 g.team1_players LIKE ? OR 
                 g.team1_players LIKE ? OR 
                 g.team1_players LIKE ? OR 
                 g.team1_players LIKE ? OR 
                 g.team1_players LIKE ? OR 
                 g.team2_players LIKE ? OR 
                 g.team2_players LIKE ? OR 
                 g.team2_players LIKE ? OR 
                 g.team2_players LIKE ? OR 
                 g.team2_players LIKE ? 
            ))
         ORDER BY g.started_at DESC
         LIMIT 50`,
        [
          userId, userId,
          idPattern, idPattern2, idPattern3, idPattern4, idPattern5,
          idPattern, idPattern2, idPattern3, idPattern4, idPattern5
        ],
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
        async function (this: any, err: Error | null) {
          if (err) {
            logger.error('Database error saving game:', err);
            reject(err);
          } else {
            const gameId = this.lastID;
            logger.info(`Game saved with ID: ${gameId}`);

            // Notify Tournament Service if applicable and NOT skipped
            if (tournamentId && tournamentMatchId && !skipTournamentNotification) {
              await notifyTournamentService(gameId, tournamentId, {
                matchId: tournamentMatchId,
                winnerId: winnerId,
                player1Score: player1Score,
                player2Score: player2Score
              });
            }

            resolve({ gameId });
          }
        }
      );
    });
  }

  /**
   * Enrich games with player names using batch lookup.
   * Uses caching to minimize HTTP calls.
   */
  async enrichGamesWithPlayerNames(games: GameRecord[]): Promise<GameRecord[]> {
    if (games.length === 0) return [];

    logger.info(`Enriching ${games.length} games with player names`);

    // Collect all unique player IDs
    const playerIds = new Set<number>();
    const teamPlayerData = new Map<number, string>(); // userId -> username from team data

    for (const game of games) {
      if (game.player1_id != null) playerIds.add(game.player1_id);
      if (game.player2_id != null) playerIds.add(game.player2_id);
      if (game.winner_id != null) playerIds.add(game.winner_id);

      // Extract usernames from stored team data
      this.extractTeamPlayerNames(game.team1_players, teamPlayerData);
      this.extractTeamPlayerNames(game.team2_players, teamPlayerData);
    }

    // Batch fetch all player names (respecting cache)
    const playerNames = await this.batchFetchPlayerNames(Array.from(playerIds), teamPlayerData);

    // Apply names to games
    return games.map(game => ({
      ...game,
      player1_name: playerNames.get(game.player1_id) ?? `User ${game.player1_id}`,
      player2_name: playerNames.get(game.player2_id) ?? `User ${game.player2_id}`,
      winner_name: game.winner_id != null ? playerNames.get(game.winner_id) : undefined
    }));
  }

  /**
   * Enrich a single game - delegates to batch method for consistency
   */
  async enrichGameWithPlayerNames(game: GameRecord): Promise<GameRecord> {
    const enriched = await this.enrichGamesWithPlayerNames([game]);
    return enriched[0];
  }

  /**
   * Extract player names from team JSON data
   */
  private extractTeamPlayerNames(teamJson: string | undefined, target: Map<number, string>): void {
    if (!teamJson) return;
    try {
      const team = JSON.parse(teamJson);
      for (const p of team) {
        const userId = typeof p === 'number' ? p : (p.userId || p.id || 0);
        const username = typeof p === 'number' ? undefined : p.username;
        if (userId && username) {
          target.set(userId, username);
        }
      }
    } catch (e) { /* ignore parse errors */ }
  }

  /**
   * Batch fetch player names with caching
   */
  private async batchFetchPlayerNames(
    playerIds: number[],
    teamData: Map<number, string>
  ): Promise<Map<number, string>> {
    const result = new Map<number, string>();
    const now = Date.now();
    const idsToFetch: number[] = [];

    for (const id of playerIds) {
      // Check team data first
      if (teamData.has(id)) {
        result.set(id, teamData.get(id)!);
        continue;
      }

      // Check cache
      const cached = playerNameCache.get(id);
      if (cached && cached.expiry > now) {
        result.set(id, cached.name);
        continue;
      }

      // Handle special IDs
      if (id === 0) {
        result.set(id, 'Al-Ien');
        continue;
      }
      if (id < 0) {
        result.set(id, `BOT ${Math.abs(id)}`);
        continue;
      }
      if (id >= 100000) {
        result.set(id, 'BOT');
        continue;
      }

      idsToFetch.push(id);
    }

    // Fetch remaining IDs in parallel (limited concurrency)
    const BATCH_SIZE = 10;
    for (let i = 0; i < idsToFetch.length; i += BATCH_SIZE) {
      const batch = idsToFetch.slice(i, i + BATCH_SIZE);
      const names = await Promise.all(batch.map(id => this.fetchPlayerName(id)));

      for (let j = 0; j < batch.length; j++) {
        const id = batch[j];
        const name = names[j];
        result.set(id, name);
        playerNameCache.set(id, { name, expiry: now + CACHE_TTL });
      }
    }

    return result;
  }

  // Fetch player name from user service or auth service
  private async fetchPlayerName(userId: number): Promise<string> {
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
        if (authData.data && authData.data.username) return authData.data.username;
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