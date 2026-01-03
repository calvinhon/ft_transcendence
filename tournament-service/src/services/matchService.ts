// tournament-service/src/services/matchService.ts
// Match management service

import { dbRun, dbGet, dbAll } from '../database';
import { TournamentMatch, MatchResultBody } from '../types';
import { createLogger } from '@ft-transcendence/common';
import { ParticipantService } from './participantService';

const logger = createLogger('TOURNAMENT-SERVICE');

export class MatchService {
  /**
   * Get match by ID
   */
  static async getMatchById(id: number): Promise<TournamentMatch | null> {
    return dbGet<TournamentMatch>(
      'SELECT * FROM tournament_matches WHERE id = ?',
      [id]
    );
  }

  /**
   * Submit match result
   */
  static async submitMatchResult(matchId: number, result: MatchResultBody): Promise<TournamentMatch> {
    logger.info('Submitting match result', { matchId, winnerId: result.winnerId });

    const match = await this.getMatchById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status !== 'pending') {
      throw new Error('Match has already been completed');
    }

    // Validate winner is one of the players
    if (result.winnerId !== match.player1_id && result.winnerId !== match.player2_id) {
      throw new Error('Winner must be one of the match players');
    }

    // Update match result
    await dbRun(
      'UPDATE tournament_matches SET winner_id = ?, player1_score = ?, player2_score = ?, status = ?, played_at = CURRENT_TIMESTAMP WHERE id = ?',
      [result.winnerId, result.player1Score, result.player2Score, 'completed', matchId]
    );

    const updatedMatch = await this.getMatchById(matchId);
    if (!updatedMatch) {
      throw new Error('Failed to retrieve updated match');
    }

    // Check if tournament round is complete
    await this.checkRoundCompletion(match.tournament_id, match.round);

    logger.info('Match result submitted successfully', { matchId, winnerId: result.winnerId });
    return updatedMatch;
  }

  /**
   * Check if a tournament round is complete and advance winners
   */
  static async checkRoundCompletion(tournamentId: number, round: number): Promise<void> {
    const roundMatches = await dbAll<TournamentMatch>(
      'SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? ORDER BY match_number',
      [tournamentId, round]
    );

    const completedMatches = roundMatches.filter(m => m.status === 'completed');
    logger.info('Checking round completion', {
      tournamentId,
      round,
      totalMatches: roundMatches.length,
      completedMatches: completedMatches.length,
      roundMatches: roundMatches.map(m => ({ id: m.id, status: m.status, player1_id: m.player1_id, player2_id: m.player2_id, winner_id: m.winner_id }))
    });

    if (completedMatches.length !== roundMatches.length) {
      logger.info('Round not complete yet - awaiting more results', { tournamentId, round });
      return;
    }

    logger.info('Tournament round completed', { tournamentId, round, matchCount: completedMatches.length });

    const winners = completedMatches.map(m => m.winner_id).filter(id => id !== null);

    if (winners.length === 1) {
      await this.completeTournament(tournamentId, winners[0]!);
    } else if (winners.length > 1) {
      logger.info('Winners ready to advance', { tournamentId, nextRound: round + 1, winners });
      await this.createNextRoundMatches(tournamentId, round + 1, winners);
    }
  }

  /**
   * Create matches for the next round
   */
  private static async createNextRoundMatches(tournamentId: number, nextRound: number, winners: number[]): Promise<void> {
    logger.info('Creating next round matches', { tournamentId, nextRound, winnerCount: winners.length });

    let matchNumber = 1;
    for (let i = 0; i < winners.length; i += 2) {
      const player1 = winners[i];
      const player2 = winners[i + 1];

      logger.info('Inserting next round match', { tournamentId, nextRound, matchNumber, player1, player2 });
      await dbRun(
        'INSERT INTO tournament_matches (tournament_id, round, match_number, player1_id, player2_id) VALUES (?, ?, ?, ?, ?)',
        [tournamentId, nextRound, matchNumber++, player1, player2]
      );
    }
  }

  /**
   * Complete tournament with update for rankings
   */
  private static async completeTournament(tournamentId: number, winnerId: number): Promise<void> {
    logger.info('Completing tournament', { tournamentId, winnerId });

    // Update tournament status
    await dbRun(
      'UPDATE tournaments SET status = ?, winner_id = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['finished', winnerId, tournamentId]
    );

    // Update participant final ranks
    const participants = await ParticipantService.getTournamentParticipants(tournamentId);

    const totalRounds = Math.round(Math.log2(participants.length));

    for (const participant of participants) {
      const lastMatch = await dbGet<{ round: number }>(
        'SELECT round FROM tournament_matches WHERE tournament_id = ? AND (player1_id = ? OR player2_id = ?) ORDER BY round DESC LIMIT 1',
        [tournamentId, participant.user_id, participant.user_id]
      );

      if (!lastMatch) {
        await dbRun('UPDATE tournament_participants SET final_rank = ? WHERE id = ?', [999, participant.id]);
        continue;
      }

      let rank = 1;
      const eliminationRound = lastMatch.round;
      if (participant.user_id !== winnerId)
        rank = totalRounds - eliminationRound + 2;
      await dbRun('UPDATE tournament_participants SET final_rank = ? WHERE id = ?', [rank, participant.id]);
    }

    logger.info('Tournament completed successfully', { tournamentId, winnerId });
  }

  /**
   * Get tournament matches by round
   */
  static async getMatchesByRound(tournamentId: number, round?: number): Promise<TournamentMatch[]> {
    let query = 'SELECT * FROM tournament_matches WHERE tournament_id = ?';
    let params: any[] = [tournamentId];

    if (round) {
      query += ' AND round = ?';
      params.push(round);
    }

    query += ' ORDER BY round, match_number';

    return dbAll<TournamentMatch>(query, params);
  }

  /**
   * Get pending matches for a tournament
   */
  static async getPendingMatches(tournamentId: number): Promise<TournamentMatch[]> {
    return dbAll<TournamentMatch>(
      'SELECT * FROM tournament_matches WHERE tournament_id = ? AND status = ? ORDER BY round, match_number',
      [tournamentId, 'pending']
    );
  }
}