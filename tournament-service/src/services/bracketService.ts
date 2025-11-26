// tournament-service/src/services/bracketService.ts
// Bracket generation and management service

import { MatchToCreate, BracketStructure, BracketRound, BracketMatch, BracketPlayer } from '../types';
import { logger } from '../utils/logger';

export class BracketService {
  /**
   * Generate single-elimination bracket for tournament
   * Supports any number of participants with byes for non-power-of-2
   */
  static generateBracket(participantIds: number[]): MatchToCreate[] {
    const matches: MatchToCreate[] = [];

    if (participantIds.length < 2) {
      logger.warn('Cannot generate bracket with less than 2 participants', { count: participantIds.length });
      return matches;
    }

    // Calculate next power of 2 (bracket size)
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(participantIds.length)));
    const numByes = bracketSize - participantIds.length;

    logger.info('Generating tournament bracket', {
      participants: participantIds.length,
      bracketSize,
      byes: numByes
    });

    // First round: pair up participants, leaving byes (null) for missing players
    const firstRoundPlayers: (number | null)[] = [...participantIds];

    // Add null (bye) slots at strategic positions
    // Byes should be distributed evenly (typically at top and bottom of bracket)
    for (let i = 0; i < numByes; i++) {
      // Insert byes at even intervals
      const insertPos = Math.floor((i * firstRoundPlayers.length) / numByes);
      firstRoundPlayers.splice(insertPos, 0, null);
    }

    // Create first round matches
    let matchNumber = 1;
    for (let i = 0; i < firstRoundPlayers.length; i += 2) {
      const player1 = firstRoundPlayers[i];
      const player2 = firstRoundPlayers[i + 1];

      // Only create match if at least one player exists
      // If one player is null (bye), the other advances automatically
      if (player1 !== null || player2 !== null) {
        matches.push({
          player1: player1 || 0, // 0 represents bye
          player2: player2 || 0,
          round: 1,
          matchNumber: matchNumber++
        });
      }
    }

    logger.info('Generated first round matches', { matchCount: matches.length });
    return matches;
  }

  /**
   * Calculate total rounds needed for a tournament
   */
  static calculateTotalRounds(participantCount: number): number {
    if (participantCount < 2) return 0;
    return Math.ceil(Math.log2(participantCount));
  }

  /**
   * Validate bracket structure
   */
  static validateBracket(matches: MatchToCreate[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const rounds = new Set(matches.map(m => m.round));
    const maxRound = Math.max(...rounds);

    // Check round progression
    for (let round = 1; round <= maxRound; round++) {
      const roundMatches = matches.filter(m => m.round === round);
      if (roundMatches.length === 0) {
        errors.push(`Missing matches for round ${round}`);
      }
    }

    // Check match numbering
    for (let round = 1; round <= maxRound; round++) {
      const roundMatches = matches.filter(m => m.round === round);
      const matchNumbers = roundMatches.map(m => m.matchNumber).sort((a, b) => a - b);

      for (let i = 0; i < matchNumbers.length; i++) {
        if (matchNumbers[i] !== i + 1) {
          errors.push(`Invalid match numbering in round ${round}`);
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Build bracket structure for API response
   */
  static buildBracketStructure(matches: any[], participants: any[]): BracketStructure {
    const rounds: BracketRound[] = [];
    const maxRound = Math.max(...matches.map(m => m.round));

    for (let round = 1; round <= maxRound; round++) {
      const roundMatches = matches.filter(m => m.round === round);
      const bracketMatches: BracketMatch[] = roundMatches.map(match => ({
        id: match.id,
        player1: match.player1_id ? this.buildBracketPlayer(match.player1_id, participants) : null,
        player2: match.player2_id ? this.buildBracketPlayer(match.player2_id, participants) : null,
        winner: match.winner_id ? this.buildBracketPlayer(match.winner_id, participants) : null,
        status: match.status
      }));

      rounds.push({
        round,
        matches: bracketMatches
      });
    }

    return {
      rounds,
      totalRounds: maxRound
    };
  }

  private static buildBracketPlayer(userId: number, participants: any[]): BracketPlayer | null {
    const participant = participants.find(p => p.user_id === userId);
    if (!participant) return null;

    return {
      id: userId,
      name: participant.username || `Player ${userId}`
    };
  }
}