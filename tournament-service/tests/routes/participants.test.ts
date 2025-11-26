// tournament-service/tests/routes/participants.test.ts
import { FastifyInstance } from 'fastify';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestApp } from '../setup';

describe('Tournament Participants Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /tournaments/:id/join', () => {
    let tournamentId: number;

    beforeEach(async () => {
      const response = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          maxParticipants: 4,
          createdBy: 1
        });

      tournamentId = response.body.data.tournament.id;
    });

    it('should allow user to join tournament', async () => {
      const response = await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.participant).toHaveProperty('id');
      expect(response.body.data.participant.user_id).toBe(1);
      expect(response.body.data.participant.tournament_id).toBe(tournamentId);
    });

    it('should prevent duplicate joins', async () => {
      // Join first time
      await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 1 })
        .expect(200);

      // Try to join again
      const response = await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 1 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already joined');
    });

    it('should return error for non-existent tournament', async () => {
      const response = await request(app.server)
        .post('/tournaments/999/join')
        .send({ userId: 1 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Tournament not found');
    });
  });

  describe('POST /tournaments/:id/leave', () => {
    let tournamentId: number;

    beforeEach(async () => {
      const response = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          createdBy: 1
        });

      tournamentId = response.body.data.tournament.id;

      // Join the tournament first
      await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 1 });
    });

    it('should allow user to leave tournament', async () => {
      const response = await request(app.server)
        .post(`/tournaments/${tournamentId}/leave`)
        .send({ userId: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('left');
    });

    it('should return error if user is not in tournament', async () => {
      const response = await request(app.server)
        .post(`/tournaments/${tournamentId}/leave`)
        .send({ userId: 2 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not a participant');
    });
  });

  describe('GET /tournaments/:id/participants', () => {
    let tournamentId: number;

    beforeEach(async () => {
      const response = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          createdBy: 1
        });

      tournamentId = response.body.data.tournament.id;

      // Add participants
      await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 1 });

      await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 2 });
    });

    it('should get tournament participants', async () => {
      const response = await request(app.server)
        .get(`/tournaments/${tournamentId}/participants`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('user_id');
      expect(response.body.data[0]).toHaveProperty('tournament_id');
    });

    it('should return empty array for tournament with no participants', async () => {
      const newTournamentResponse = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Empty Tournament',
          createdBy: 1
        });

      const response = await request(app.server)
        .get(`/tournaments/${newTournamentResponse.body.data.tournament.id}/participants`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('POST /tournaments/:id/start', () => {
    let tournamentId: number;

    beforeEach(async () => {
      const response = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          maxParticipants: 4,
          createdBy: 1
        });

      tournamentId = response.body.data.tournament.id;

      // Add participants
      await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 1 });

      await request(app.server)
        .post(`/tournaments/${tournamentId}/join`)
        .send({ userId: 2 });
    });

    it('should start tournament successfully', async () => {
      const response = await request(app.server)
        .post(`/tournaments/${tournamentId}/start`)
        .send({ startedBy: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('started');
      expect(response.body.data.matches).toBeDefined();
    });

    it('should return error if tournament not found', async () => {
      const response = await request(app.server)
        .post('/tournaments/999/start')
        .send({ startedBy: 1 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Tournament not found');
    });
  });
});