// tournament-service/tests/utils/validation.test.ts
import { ValidationUtil } from '../../src/utils/validation';

describe('ValidationUtil', () => {
  describe('validateCreateTournament', () => {
    it('should validate valid tournament data', () => {
      const data = {
        name: 'Test Tournament',
        description: 'A test tournament',
        maxParticipants: 8,
        createdBy: 1
      };

      const result = ValidationUtil.validateCreateTournament(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing name', () => {
      const data = { createdBy: 1 };
      const result = ValidationUtil.validateCreateTournament(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tournament name is required and must be a non-empty string');
    });

    it('should reject invalid maxParticipants', () => {
      const data = {
        name: 'Test',
        createdBy: 1,
        maxParticipants: 200 // Too high
      };

      const result = ValidationUtil.validateCreateTournament(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('maxParticipants must be a number between 2 and 128');
    });
  });

  describe('validateJoinTournament', () => {
    it('should validate valid join data', () => {
      const data = { userId: 1 };
      const result = ValidationUtil.validateJoinTournament(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid userId', () => {
      const data = { userId: 'invalid' };
      const result = ValidationUtil.validateJoinTournament(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid userId is required');
    });
  });

  describe('validateMatchResult', () => {
    it('should validate valid match result', () => {
      const data = {
        matchId: 1,
        winnerId: 1,
        player1Score: 10,
        player2Score: 5
      };

      const result = ValidationUtil.validateMatchResult(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative scores', () => {
      const data = {
        matchId: 1,
        winnerId: 1,
        player1Score: -1,
        player2Score: 5
      };

      const result = ValidationUtil.validateMatchResult(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid player1Score is required (must be non-negative number)');
    });
  });

  describe('validateTournamentId', () => {
    it('should validate valid tournament ID', () => {
      const result = ValidationUtil.validateTournamentId('1');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid tournament ID', () => {
      const result = ValidationUtil.validateTournamentId('invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid tournament ID is required');
    });
  });

  describe('validatePagination', () => {
    it('should validate valid pagination', () => {
      const result = ValidationUtil.validatePagination('1', '10');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should use defaults for missing values', () => {
      const result = ValidationUtil.validatePagination();
      expect(result.isValid).toBe(true);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should reject invalid page', () => {
      const result = ValidationUtil.validatePagination('0', '10');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Page must be a positive integer');
    });

    it('should reject invalid limit', () => {
      const result = ValidationUtil.validatePagination('1', '200');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Limit must be between 1 and 100');
    });
  });
});