// tournament-service/src/services/bracketService.ts
// Bracket generation and management service

import { MatchToCreate, BracketStructure, BracketRound, BracketMatch, BracketPlayer } from '../types';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('TOURNAMENT-SERVICE');

export class BracketService {
  /**
   * Generate single-elimination bracket for tournament
   */
  static generateBracket(participantIds: number[]): MatchToCreate[] {
    const matches: MatchToCreate[] = [];

    logger.info('Generating tournament bracket', {
      participants: participantIds.length
    });

    let matchNumber = 1;
    const shuffled = [...participantIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (let i = 0; i < shuffled.length; i += 2) {
      const p1 = shuffled[i];
      const p2 = shuffled[i + 1];
      matches.push({
        player1: p1,
        player2: p2,
        round: 1,
        matchNumber: matchNumber++
      });
    }

    logger.info('Generated first round matches', { matchCount: matches.length });
    return matches;
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