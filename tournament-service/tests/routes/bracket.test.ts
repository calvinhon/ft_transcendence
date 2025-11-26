// tournament-service/tests/routes/bracket.test.ts
import { FastifyInstance } from 'fastify';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestApp } from '../setup';

describe('Tournament Bracket Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp();
    await app.ready(); // Ensure app is ready
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('GET /tournaments/:tournamentId/bracket', () => {
    let tournamentId: number;

    beforeEach(async () => {
      // Create tournament and start it to generate bracket
      const tournamentResponse = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          maxParticipants: 8,
          createdBy: 1
        });

      tournamentId = tournamentResponse.body.data.id;

      // Add participants
      await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 1 });

      await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 2 });

      // Start tournament to generate bracket
      await request(app.server)
        .post(`/tournaments/${tournamentId}/start`)
        .send({ startedBy: 1 });
    });

    it('should get tournament bracket', async () => {
      const response = await request(app.server)
        .get(`/tournaments/${tournamentId}/bracket/visualization`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('rounds');
      expect(Array.isArray(response.body.data.rounds)).toBe(true);
      expect(response.body.data.rounds.length).toBeGreaterThan(0);
      expect(response.body.data.rounds[0]).toHaveProperty('round');
      expect(response.body.data.rounds[0]).toHaveProperty('matches');
    });

    it('should return error for non-existent tournament', async () => {
      const response = await request(app.server)
        .get('/tournaments/999/bracket')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Tournament not found');
    });
  });

  describe('GET /tournaments/:tournamentId/bracket/visualization', () => {
    let tournamentId: number;

    beforeEach(async () => {
      // Create tournament and start it
      const tournamentResponse = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          createdBy: 1
        });

      tournamentId = tournamentResponse.body.data.tournament.id;

      // Add participants and start tournament
      await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 1 });

      await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 2 });

      await request(app.server)
        .post(`/tournaments/${tournamentId}/start`)
        .send({ startedBy: 1 });
    });

    it('should get bracket visualization data', async () => {
      const response = await request(app.server)
        .get(`/tournaments/${tournamentId}/bracket/visualization`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tournament');
      expect(response.body.data).toHaveProperty('participants');
      expect(response.body.data).toHaveProperty('matches');
      expect(response.body.data).toHaveProperty('bracket');
      expect(response.body.data.tournament.id).toBe(tournamentId);
    });
  });

  describe('GET /tournaments/:tournamentId/bracket/current-round', () => {
    let tournamentId: number;

    beforeEach(async () => {
      // Create tournament and start it
      const tournamentResponse = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          createdBy: 1
        });

      tournamentId = tournamentResponse.body.data.id;

      // Add participants and start tournament
      await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 1 });

      await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 2 });

      await request(app.server)
        .post(`/tournaments/${tournamentId}/start`)
        .send({ startedBy: 1 });
    });

    it('should get current round bracket for active tournament', async () => {
      const response = await request(app.server)
        .get(`/tournaments/${tournamentId}/bracket/current-round`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('currentRound');
      expect(response.body.data).toHaveProperty('matches');
      expect(response.body.data.currentRound).toBe(1);
      expect(Array.isArray(response.body.data.matches)).toBe(true);
    });

    it('should return completed status for finished tournament', async () => {
      // Complete the tournament by submitting match result
      const matchesResponse = await request(app.server)
        .get(`/tournaments/${tournamentId}/matches`);

      const matchId = matchesResponse.body.data[0].id;

      await request(app.server)
        .post('/matches/result')
        .send({
          matchId,
          winnerId: 1,
          player1Score: 10,
          player2Score: 5
        });

      const response = await request(app.server)
        .get(`/tournaments/${tournamentId}/bracket/current-round`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('completed');
      expect(response.body.data.currentRound).toBeNull();
      expect(response.body.data.matches).toHaveLength(0);
    });

    it('should return error for non-existent tournament', async () => {
      const response = await request(app.server)
        .get('/tournaments/999/bracket/current-round')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to retrieve current round bracket');
    });
  });
});