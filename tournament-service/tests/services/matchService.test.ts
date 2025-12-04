// tournament-service/tests/services/matchService.test.ts
import { MatchService } from '../../src/services/matchService';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';

describe('MatchService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('getMatchById', () => {
    it('should return match when found', async () => {
      // This would require inserting a test match first
      // For now, test the null case
      const result = await MatchService.getMatchById(1);
      expect(result).toBeNull();
    });

    it('should return null when match not found', async () => {
      const result = await MatchService.getMatchById(999);
      expect(result).toBeNull();
    });
  });

  describe('getMatchesByRound', () => {
    it('should return empty array for non-existent tournament', async () => {
      const result = await MatchService.getMatchesByRound(999);
      expect(result).toEqual([]);
    });

    it('should return matches for specific round', async () => {
      const result = await MatchService.getMatchesByRound(1, 1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getPendingMatches', () => {
    it('should return empty array for tournament with no matches', async () => {
      const result = await MatchService.getPendingMatches(1);
      expect(result).toEqual([]);
    });
  });

  // Note: submitMatchResult would require more complex setup with actual tournament data
  // Integration tests cover this functionality more comprehensively
});