// tournament-service/tests/routes/crud.test.ts
import { FastifyInstance } from 'fastify';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestApp } from '../setup';

describe('Tournament CRUD Routes', () => {
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

  describe('POST /tournaments', () => {
    it('should create a tournament successfully', async () => {
      const response = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          description: 'A test tournament',
          maxParticipants: 8,
          createdBy: 1
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tournament).toHaveProperty('id');
      expect(response.body.data.tournament.name).toBe('Test Tournament');
      expect(response.body.data.tournament.status).toBe('open');
    });

    it('should return error for invalid data', async () => {
      const response = await request(app.server)
        .post('/tournaments')
        .send({
          description: 'Missing name'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /tournaments', () => {
    beforeEach(async () => {
      // Create test tournaments
      await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Tournament 1',
          createdBy: 1
        });

      await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Tournament 2',
          createdBy: 2
        });
    });

    it('should get all tournaments with pagination', async () => {
      const response = await request(app.server)
        .get('/tournaments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tournaments).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });

    it('should support pagination', async () => {
      const response = await request(app.server)
        .get('/tournaments?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tournaments).toHaveLength(1);
      expect(response.body.data.total).toBe(2);
    });
  });

  describe('GET /tournaments/:id', () => {
    let tournamentId: number;

    beforeEach(async () => {
      const response = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          createdBy: 1
        });

      tournamentId = response.body.data.tournament.id;
    });

    it('should get tournament details', async () => {
      const response = await request(app.server)
        .get(`/tournaments/${tournamentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tournament.id).toBe(tournamentId);
      expect(response.body.data).toHaveProperty('participants');
      expect(response.body.data).toHaveProperty('matches');
      expect(response.body.data).toHaveProperty('bracket');
    });

    it('should return 404 for non-existent tournament', async () => {
      const response = await request(app.server)
        .get('/tournaments/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Tournament not found');
    });
  });

  describe('PUT /tournaments/:id', () => {
    let tournamentId: number;

    beforeEach(async () => {
      const response = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          createdBy: 1
        });

      tournamentId = response.body.data.tournament.id;
    });

    it('should update tournament successfully', async () => {
      const response = await request(app.server)
        .put(`/tournaments/${tournamentId}`)
        .send({
          name: 'Updated Tournament',
          description: 'Updated description'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tournament.name).toBe('Updated Tournament');
      expect(response.body.data.tournament.description).toBe('Updated description');
    });
  });

  describe('DELETE /tournaments/:id', () => {
    let tournamentId: number;

    beforeEach(async () => {
      const response = await request(app.server)
        .post('/tournaments')
        .send({
          name: 'Test Tournament',
          createdBy: 1
        });

      tournamentId = response.body.data.tournament.id;
    });

    it('should delete tournament successfully', async () => {
      const response = await request(app.server)
        .delete(`/tournaments/${tournamentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify tournament is deleted
      await request(app.server)
        .get(`/tournaments/${tournamentId}`)
        .expect(404);
    });
  });
});