// tournament-service/tests/services/bracketService.test.ts
import { BracketService } from '../../src/services/bracketService';

describe('BracketService', () => {
  describe('generateBracket', () => {
    it('should generate bracket for 2 players', () => {
      const participants = [1, 2];
      const matches = BracketService.generateBracket(participants);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({
        player1: 1,
        player2: 2,
        round: 1,
        matchNumber: 1
      });
    });

    it('should generate bracket for 4 players', () => {
      const participants = [1, 2, 3, 4];
      const matches = BracketService.generateBracket(participants);

      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({
        player1: 1,
        player2: 2,
        round: 1,
        matchNumber: 1
      });
      expect(matches[1]).toEqual({
        player1: 3,
        player2: 4,
        round: 1,
        matchNumber: 2
      });
    });

    it('should handle odd number of players with byes', () => {
      const participants = [1, 2, 3];
      const matches = BracketService.generateBracket(participants);

      expect(matches).toHaveLength(2);
      // Should have one match with real players and one with a bye
    });

    it('should return empty array for less than 2 players', () => {
      expect(BracketService.generateBracket([])).toHaveLength(0);
      expect(BracketService.generateBracket([1])).toHaveLength(0);
    });
  });

  describe('calculateTotalRounds', () => {
    it('should calculate correct rounds', () => {
      expect(BracketService.calculateTotalRounds(2)).toBe(1);
      expect(BracketService.calculateTotalRounds(4)).toBe(2);
      expect(BracketService.calculateTotalRounds(8)).toBe(3);
      expect(BracketService.calculateTotalRounds(3)).toBe(2); // Rounds up
    });

    it('should return 0 for invalid input', () => {
      expect(BracketService.calculateTotalRounds(0)).toBe(0);
      expect(BracketService.calculateTotalRounds(1)).toBe(0);
    });
  });
});