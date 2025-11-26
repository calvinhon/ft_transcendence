// tournament-service/tests/services/tournamentService.test.ts
import { TournamentService } from '../../src/services/tournamentService';
import { setupTestDatabase, cleanupTestDatabase } from '../setup';

describe('TournamentService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('getTournamentById', () => {
    it('should return null for non-existent tournament', async () => {
      const result = await TournamentService.getTournamentById(999);
      expect(result).toBeNull();
    });
  });

  describe('getTournaments', () => {
    it('should return empty result when no tournaments exist', async () => {
      const result = await TournamentService.getTournaments();
      expect(result.tournaments).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should support pagination', async () => {
      const result = await TournamentService.getTournaments(1, 10);
      expect(result.tournaments).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getTournamentDetails', () => {
    it('should return null for non-existent tournament', async () => {
      const result = await TournamentService.getTournamentDetails(999);
      expect(result).toBeNull();
    });
  });

  // Note: createTournament and other methods that modify data
  // are better tested through integration tests
});