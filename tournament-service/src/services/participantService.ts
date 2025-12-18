// tournament-service/src/services/participantService.ts
// Participant management service

import { dbRun, dbGet, dbAll } from '../database';
import { TournamentParticipant, Tournament } from '../types';
import { TournamentService } from './tournamentService';
import { logger } from '../utils/logger';

export class ParticipantService {
  /**
   * Join a tournament
   */
  static async joinTournament(tournamentId: number, userId: number): Promise<TournamentParticipant> {
    logger.info('User joining tournament', { tournamentId, userId });

    // Check if tournament exists and is open
    const tournament = await TournamentService.getTournamentById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'open') {
      throw new Error('Tournament is not open for registration');
    }

    // Check if user is already a participant
    const existingParticipant = await dbGet<TournamentParticipant>(
      'SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?',
      [tournamentId, userId]
    );

    if (existingParticipant) {
      throw new Error('User is already participating in this tournament');
    }

    // Add participant
    const result = await dbRun(
      'INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)',
      [tournamentId, userId]
    );

    // Update tournament participant count
    await dbRun(
      'UPDATE tournaments SET current_participants = current_participants + 1 WHERE id = ?',
      [tournamentId]
    );

    const participant = await this.getParticipantById(result.lastID);
    if (!participant) {
      throw new Error('Failed to retrieve created participant');
    }

    logger.info('User joined tournament successfully', { tournamentId, userId, participantId: participant.id });
    return participant;
  }

  /**
   * Get participant by ID
   */
  static async getParticipantById(id: number): Promise<TournamentParticipant | null> {
    return dbGet<TournamentParticipant>(
      'SELECT * FROM tournament_participants WHERE id = ?',
      [id]
    );
  }

  /**
   * Get participant by tournament and user
   */
  static async getParticipant(tournamentId: number, userId: number): Promise<TournamentParticipant | null> {
    return dbGet<TournamentParticipant>(
      'SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?',
      [tournamentId, userId]
    );
  }

  /**
   * Get tournament leaderboard
   */
  static async getTournamentLeaderboard(tournamentId: number): Promise<any[]> {
    // This would typically involve complex queries to calculate rankings
    // For now, return participants with their final ranks
    return dbAll(
      'SELECT tp.*, u.username FROM tournament_participants tp LEFT JOIN users u ON tp.user_id = u.id WHERE tp.tournament_id = ? ORDER BY tp.final_rank ASC',
      [tournamentId]
    );
  }

  /**
   * Get user's tournament rankings
   */
  static async getUserRankings(userId: number): Promise<any[]> {
    const rankings = await dbAll(
      `SELECT 
        t.id as tournament_id,
        t.name as tournament_name,
        t.created_at,
        t.finished_at,
        t.status,
        t.winner_id,
        t.current_participants,
        tp.final_rank,
        tp.eliminated_at
       FROM tournaments t
       INNER JOIN tournament_participants tp ON t.id = tp.tournament_id
       WHERE tp.user_id = ?
       ORDER BY t.created_at DESC
       LIMIT 20`,
      [userId]
    );

    return rankings.map(r => ({
      tournamentId: r.tournament_id,
      tournamentName: r.tournament_name,
      date: r.finished_at || r.created_at,
      rank: r.final_rank || '--',
      totalParticipants: r.current_participants,
      status: r.status,
      isWinner: r.winner_id === userId
    }));
  }

  /**
   * Get user's tournaments
   */
  static async getUserTournaments(userId: number): Promise<any[]> {
    return dbAll(
      `SELECT t.*, tp.joined_at, tp.eliminated_at
       FROM tournaments t
       JOIN tournament_participants tp ON t.id = tp.tournament_id
       WHERE tp.user_id = ?
       ORDER BY t.created_at DESC`,
      [userId]
    );
  }
}