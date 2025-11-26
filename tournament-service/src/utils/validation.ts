// tournament-service/src/utils/validation.ts
// Input validation utilities

import { CreateTournamentBody, JoinTournamentBody, MatchResultBody } from '../types';

export class ValidationUtil {
  /**
   * Validate tournament creation data
   */
  static validateCreateTournament(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Tournament name is required and must be a non-empty string');
    }

    if (data.name && data.name.length > 100) {
      errors.push('Tournament name must be less than 100 characters');
    }

    if (data.description && typeof data.description !== 'string') {
      errors.push('Tournament description must be a string');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Tournament description must be less than 500 characters');
    }

    if (!data.createdBy || typeof data.createdBy !== 'number' || data.createdBy <= 0) {
      errors.push('Valid createdBy user ID is required');
    }

    if (data.maxParticipants !== undefined) {
      if (typeof data.maxParticipants !== 'number' || data.maxParticipants < 2 || data.maxParticipants > 128) {
        errors.push('maxParticipants must be a number between 2 and 128');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate join tournament data
   */
  static validateJoinTournament(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.userId || typeof data.userId !== 'number' || data.userId <= 0) {
      errors.push('Valid userId is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate match result data
   */
  static validateMatchResult(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.matchId || typeof data.matchId !== 'number' || data.matchId <= 0) {
      errors.push('Valid matchId is required');
    }

    if (!data.winnerId || typeof data.winnerId !== 'number' || data.winnerId <= 0) {
      errors.push('Valid winnerId is required');
    }

    if (data.player1Score === undefined || typeof data.player1Score !== 'number' || data.player1Score < 0) {
      errors.push('Valid player1Score is required (must be non-negative number)');
    }

    if (data.player2Score === undefined || typeof data.player2Score !== 'number' || data.player2Score < 0) {
      errors.push('Valid player2Score is required (must be non-negative number)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate tournament ID parameter
   */
  static validateTournamentId(id: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const numId = parseInt(id);
    if (isNaN(numId) || numId <= 0) {
      errors.push('Valid tournament ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate match ID parameter
   */
  static validateMatchId(id: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const numId = parseInt(id);
    if (isNaN(numId) || numId <= 0) {
      errors.push('Valid match ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: any, limit?: any): { isValid: boolean; errors: string[]; page: number; limit: number } {
    const errors: string[] = [];
    let validPage = 1;
    let validLimit = 10;

    if (page !== undefined) {
      const numPage = parseInt(page);
      if (isNaN(numPage) || numPage < 1) {
        errors.push('Page must be a positive integer');
      } else {
        validPage = numPage;
      }
    }

    if (limit !== undefined) {
      const numLimit = parseInt(limit);
      if (isNaN(numLimit) || numLimit < 1 || numLimit > 100) {
        errors.push('Limit must be between 1 and 100');
      } else {
        validLimit = numLimit;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      page: validPage,
      limit: validLimit
    };
  }
}