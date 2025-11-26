// tournament-service/src/services/tournamentService.ts
// Core tournament business logic service

import { dbRun, dbGet, dbAll } from '../database';
import { Tournament, TournamentParticipant, TournamentMatch, CreateTournamentBody, TournamentDetails } from '../types';
import { BracketService } from './bracketService';
import { logger } from '../utils/logger';

export class TournamentService {
  /**
   * Create a new tournament
   */
  static async createTournament(data: CreateTournamentBody): Promise<Tournament> {
    logger.info('Creating tournament', { name: data.name, createdBy: data.createdBy });

    const result = await dbRun(
      'INSERT INTO tournaments (name, description, max_participants, created_by) VALUES (?, ?, ?, ?)',
      [data.name, data.description || '', data.maxParticipants || 8, data.createdBy]
    );

    const tournament = await this.getTournamentById(result.lastID);
    if (!tournament) {
      throw new Error('Failed to retrieve created tournament');
    }

    logger.info('Tournament created successfully', { id: tournament.id });
    return tournament;
  }

  /**
   * Get tournament by ID
   */
  static async getTournamentById(id: number): Promise<Tournament | null> {
    const tournament = await dbGet<Tournament>(
      'SELECT * FROM tournaments WHERE id = ?',
      [id]
    );
    return tournament || null;
  }

  /**
   * Get all tournaments with pagination
   */
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
  static async deleteTournament(id: number): Promise<boolean> {
    logger.info('Deleting tournament', { id });

    const result = await dbRun('DELETE FROM tournaments WHERE id = ?', [id]);
    return result.changes > 0;
  }

  /**
   * Start tournament
   */
  static async startTournament(id: number, startedBy?: number): Promise<Tournament | null> {
    logger.info('Starting tournament', { id, startedBy });

    const tournament = await this.getTournamentById(id);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'open') {
      throw new Error('Tournament is not in open status');
    }

    if (startedBy !== undefined && tournament.created_by !== startedBy) {
      throw new Error('Only tournament creator can start the tournament');
    }

    const participants = await this.getTournamentParticipants(id);
    if (participants.length < 2) {
      throw new Error('Tournament needs at least 2 participants to start');
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
   * Get tournament statistics
   */
  static async getTournamentStats(): Promise<{
    totalTournaments: number;
    activeTournaments: number;
    completedTournaments: number;
    totalParticipants: number;
  }> {
    const [totalResult, activeResult, completedResult, participantsResult] = await Promise.all([
      dbGet<{ count: number }>('SELECT COUNT(*) as count FROM tournaments'),
      dbGet<{ count: number }>('SELECT COUNT(*) as count FROM tournaments WHERE status = "active"'),
      dbGet<{ count: number }>('SELECT COUNT(*) as count FROM tournaments WHERE status = "finished"'),
      dbGet<{ count: number }>('SELECT COUNT(*) as count FROM tournament_participants')
    ]);

    return {
      totalTournaments: totalResult?.count || 0,
      activeTournaments: activeResult?.count || 0,
      completedTournaments: completedResult?.count || 0,
      totalParticipants: participantsResult?.count || 0
    };
  }
}