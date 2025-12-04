// tournament-service/tests/routes/matches.test.ts
import { FastifyInstance } from 'fastify';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestApp } from '../setup';

describe('Tournament Matches Routes', () => {
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

  describe('GET /tournaments/:tournamentId/matches', () => {
    let tournamentId: number;

    beforeEach(async () => {
      // Create tournament and start it to generate matches
      const tournamentResponse = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          maxParticipants: 4,
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

      // Start tournament to generate matches
      await request(app.server)
        .post(`/tournaments/${tournamentId}/start`)
        .send({ startedBy: 1 });
    });

    it('should get tournament matches', async () => {
      const response = await request(app.server)
        .get(`/tournaments/${tournamentId}/matches`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('tournament_id');
      expect(response.body.data[0]).toHaveProperty('round');
    });
  });

  describe('GET /matches/:matchId', () => {
    let matchId: number;

    beforeEach(async () => {
      // Create tournament and start it to generate matches
      const tournamentResponse = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          createdBy: 1
        });

      const tournamentId = tournamentResponse.body.data.id;

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

      // Get the first match
      const matchesResponse = await request(app.server)
        .get(`/tournaments/${tournamentId}/matches`);

      matchId = matchesResponse.body.data[0].id;
    });

    it('should get match details', async () => {
      const response = await request(app.server)
        .get(`/matches/${matchId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(matchId);
      expect(response.body.data).toHaveProperty('tournament_id');
      expect(response.body.data).toHaveProperty('status');
    });

    it('should return 404 for non-existent match', async () => {
      const response = await request(app.server)
        .get('/matches/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Match not found');
    });
  });

  describe('POST /matches/result', () => {
    let matchId: number;
    let tournamentId: number;

    beforeEach(async () => {
      // Create tournament and start it to generate matches
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

      // Get the first match
      const matchesResponse = await request(app.server)
        .get(`/tournaments/${tournamentId}/matches`);

      matchId = matchesResponse.body.data[0].id;
    });

    it('should submit match result successfully', async () => {
      const response = await request(app.server)
        .post('/matches/result')
        .send({
          matchId,
          winnerId: 1,
          player1Score: 10,
          player2Score: 5
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('submitted');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.winner_id).toBe(1);
    });

    it('should return error for invalid match', async () => {
      const response = await request(app.server)
        .post('/matches/result')
        .send({
          matchId: 999,
          winnerId: 1,
          player1Score: 10,
          player2Score: 5
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /matches/:matchId/result (legacy)', () => {
    let matchId: number;
    let tournamentId: number;

    beforeEach(async () => {
      // Create tournament and start it to generate matches
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

      // Get the first match
      const matchesResponse = await request(app.server)
        .get(`/tournaments/${tournamentId}/matches`);

      matchId = matchesResponse.body.data[0].id;
    });

    it('should submit match result via legacy endpoint', async () => {
      const response = await request(app.server)
        .put(`/matches/${matchId}/result`)
        .send({
          winnerId: 1,
          player1Score: 10,
          player2Score: 5
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('submitted');
    });

    it('should return error for invalid match ID', async () => {
      const response = await request(app.server)
        .put('/matches/invalid/result')
        .send({
          winnerId: 1,
          player1Score: 10,
          player2Score: 5
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid match ID');
    });
  });
});