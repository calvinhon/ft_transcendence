// tournament-service/src/services/tournamentService.ts
// Core tournament business logic service

import { dbRun, dbGet, dbAll } from '../database';
import { Tournament, TournamentParticipant, TournamentMatch, CreateTournamentBody, TournamentDetails } from '../types';
import { BracketService } from './bracketService';
import { MatchService } from './matchService';
import { logger } from '../utils/logger';

export class TournamentService {
  static async createTournament(data: CreateTournamentBody): Promise<Tournament> {
    logger.info('Creating tournament', { name: data.name, createdBy: data.createdBy });

    const result = await dbRun(
      'INSERT INTO tournaments (name, created_by) VALUES (?, ?)',
      [data.name, data.createdBy]
    );

    const tournament = await this.getTournamentById(result.lastID);
    if (!tournament) {
      throw new Error('Failed to retrieve created tournament');
    }

    logger.info('Tournament created successfully', { id: tournament.id });
    return tournament;
  }

  static async getTournamentById(id: number): Promise<Tournament | null> {
    const tournament = await dbGet<Tournament>(
      'SELECT * FROM tournaments WHERE id = ?',
      [id]
    );
    return tournament || null;
  }

  static async getTournaments(page: number = 1, limit: number = 10, status?: string): Promise<{
    tournaments: Tournament[];
    total: number;
  }> {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM tournaments';
    let params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const tournaments = await dbAll<Tournament>(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM tournaments';
    let countParams: any[] = [];

    if (status) {
      countQuery += ' WHERE status = ?';
      countParams.push(status);
    }

    const countResult = await dbGet<{ count: number }>(countQuery, countParams);
    const total = countResult?.count || 0;

    return { tournaments, total };
  }

  /**
   * Get tournament details with participants and matches
   */
  static async getTournamentDetails(id: number): Promise<TournamentDetails | null> {
    const tournament = await this.getTournamentById(id);
    if (!tournament) return null;

    const [participants, matches] = await Promise.all([
      this.getTournamentParticipants(id),
      this.getTournamentMatches(id)
    ]);

    const bracket = BracketService.buildBracketStructure(matches, participants);

    return {
      tournament,
      participants,
      matches,
      bracket
    };
  }

  /**
   * Update tournament
   */
  static async updateTournament(id: number, updates: Partial<Tournament>): Promise<Tournament | null> {
    logger.info('Updating tournament', { id, updates });

    const fields = Object.keys(updates).filter(key => updates[key as keyof Tournament] !== undefined);
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field as keyof Tournament]);
    values.push(id);

    await dbRun(`UPDATE tournaments SET ${setClause} WHERE id = ?`, values);

    return this.getTournamentById(id);
  }

  /**
   * Delete tournament
   */
//   static async deleteTournament(id: number): Promise<boolean> {
//     logger.info('Deleting tournament', { id });

//     const result = await dbRun('DELETE FROM tournaments WHERE id = ?', [id]);
//     return result.changes > 0;
//   }

  /**
   * Start tournament
   */
  static async startTournament(id: number, startedBy?: number): Promise<Tournament | null> {
    logger.info('Starting tournament', { id, startedBy });

    const tournament = await this.getTournamentById(id);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (startedBy !== undefined && tournament.created_by !== startedBy) {
      throw new Error('Only tournament creator can start the tournament');
    }

    const participants = await this.getTournamentParticipants(id);
    if (![4, 8].includes(participants.length)) {
      throw new Error('Tournament needs either 4 or 8 participants to start');
    }

    // Generate bracket and matches
    const participantIds = participants.map(p => p.user_id);
    const matches = BracketService.generateBracket(participantIds);

    // Insert matches into database
    for (const match of matches) {
      await dbRun(
        'INSERT INTO tournament_matches (tournament_id, round, match_number, player1_id, player2_id) VALUES (?, ?, ?, ?, ?)',
        [id, match.round, match.matchNumber, match.player1, match.player2]
      );
    }

    try {
      await MatchService.checkRoundCompletion(id, 1);
    } catch (err) {
      logger.error('Failed to evaluate round completion after inserting matches', { tournamentId: id, error: err });
    }

    // Update tournament status
    await dbRun(
      'UPDATE tournaments SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['active', id]
    );

    logger.info('Tournament started successfully', { id, matchCount: matches.length });
    return this.getTournamentById(id);
  }

  /**
   * Get tournament participants
   */
  static async getTournamentParticipants(tournamentId: number): Promise<TournamentParticipant[]> {
    return dbAll<TournamentParticipant>(
      'SELECT * FROM tournament_participants WHERE tournament_id = ? ORDER BY joined_at',
      [tournamentId]
    );
  }

  /**
   * Get tournament matches
   */
  static async getTournamentMatches(tournamentId: number): Promise<TournamentMatch[]> {
    return dbAll<TournamentMatch>(
      'SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round, match_number',
      [tournamentId]
    );
  }

  /**
   * Get user's tournament count
   */
//   static async getUserTournamentCount(userId: number): Promise<number> {
//     const result = await dbGet<{ count: number }>(
//       'SELECT COUNT(DISTINCT t.id) as count FROM tournaments t JOIN tournament_participants tp ON t.id = tp.tournament_id WHERE tp.user_id = ?',
//       [userId]
//     );
//     return result?.count || 0;
//   }

//   /**
//    * Get user's tournament rankings
//    */
//   static async getUserTournamentRankings(userId: number): Promise<any[]> {
//     const rankings = await dbAll<any>(
//       `SELECT 
//         t.id as tournamentId,
//         t.name as tournamentName,
//         t.created_at as date,
//         tp.final_rank as rank,
//         (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as totalParticipants,
//         t.status,
//         CASE WHEN t.winner_id = tp.user_id THEN 1 ELSE 0 END as isWinner
//       FROM tournaments t 
//       JOIN tournament_participants tp ON t.id = tp.tournament_id 
//       WHERE tp.user_id = ? AND tp.final_rank IS NOT NULL
//       ORDER BY t.created_at DESC`,
//       [userId]
//     );
//     return rankings;
//   }
}