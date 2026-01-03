// user-service/src/routes/profile.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/userService';
import { UpdateProfileBody } from '../types';
import { db } from '../database';
import { promisifyDbRun } from '@ft-transcendence/common';

export async function setupProfileRoutes(fastify: FastifyInstance): Promise<void> {
  // Get user profile
  fastify.get<{
    Params: { userId: string };
  }>('/profile/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    try {
      const profile = await UserService.getOrCreateProfile(parseInt(userId));
      reply.send(profile);
    } catch (err: any) {
      console.error('Profile Fetch Error:', err);
      reply.status(500).send({ error: `Database error: ${err.message}` });
    }
  });

  // Update user profile
  fastify.put<{
    Params: { userId: string };
    Body: UpdateProfileBody;
  }>('/profile/:userId', async (request: FastifyRequest<{ Params: { userId: string }; Body: UpdateProfileBody }>, reply: FastifyReply) => {
    const { userId } = request.params;
    const updates = request.body;

    try {
      await UserService.updateProfile(parseInt(userId), updates);
      reply.send({ message: 'Profile updated successfully' });
    } catch (err) {
      reply.status(500).send({ error: 'Database error' });
    }
  });

  // Update game stats (wins, total_games, xp, level, campaign_level, etc)
  fastify.post<{
    Params: { userId: string };
    Body: {
      wins?: number;
      total_games?: number;
      xp?: number;
      level?: number;
      campaign_level?: number;
      winRate?: number;
      lost?: number;
      [key: string]: any;
    };
  }>('/game/update-stats/:userId', async (request: FastifyRequest<{ Params: { userId: string }; Body: { wins?: number; total_games?: number; xp?: number; level?: number; campaign_level?: number; winRate?: number; lost?: number;[key: string]: any; } }>, reply: FastifyReply) => {
    const { userId } = request.params;
    const { wins, total_games, xp, level, campaign_level, winRate, lost } = request.body;

    // Build dynamic SQL for only provided fields
    const fields: string[] = [];
    const values: any[] = [];
    if (typeof wins === 'number') { fields.push('wins = ?'); values.push(wins); }
    if (typeof total_games === 'number') { fields.push('total_games = ?'); values.push(total_games); }
    if (typeof xp === 'number') { fields.push('xp = ?'); values.push(xp); }
    if (typeof level === 'number') { fields.push('level = ?'); values.push(level); }
    if (typeof campaign_level === 'number') { fields.push('campaign_level = ?'); values.push(campaign_level); }
    if (typeof winRate === 'number') { fields.push('winRate = ?'); values.push(winRate); }
    if (typeof lost === 'number') { fields.push('lost = ?'); values.push(lost); }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    if (fields.length === 1) {
      // Only updated_at, nothing to update
      return reply.status(400).send({ error: 'No stats provided' });
    }

    try {
      const sql = 'UPDATE user_profiles SET ' + fields.join(', ') + ' WHERE user_id = ?';
      await promisifyDbRun(db, sql, values);
      reply.send({ message: 'Game stats updated successfully' });
    } catch (err) {
      reply.status(500).send({ error: 'Database error', details: err });
    }
  });
}