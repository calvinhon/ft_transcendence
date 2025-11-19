import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as sqlite3 from 'sqlite3';
import { Achievement, AddAchievementBody } from '../types.js';
import { db } from '../user-logic.js';

export default async function setupUserAchievementsRoutes(fastify: FastifyInstance): Promise<void> {
  // Add achievement
  fastify.post<{
    Body: AddAchievementBody;
  }>('/achievement', async (request: FastifyRequest<{ Body: AddAchievementBody }>, reply: FastifyReply) => {
    const { userId, achievementType, achievementName, description, metadata } = request.body;

    if (!userId || !achievementType || !achievementName) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    return new Promise<void>((resolve, reject) => {
      db.run(
        'INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, metadata) VALUES (?, ?, ?, ?, ?)',
        [userId, achievementType, achievementName, description || '', JSON.stringify(metadata || {})],
        function(this: sqlite3.RunResult, err: Error | null) {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send({
              message: 'Achievement added successfully',
              achievementId: this.lastID
            });
            resolve();
          }
        }
      );
    });
  });

  // Get user achievements
  fastify.get<{
    Params: { userId: string };
  }>('/achievements/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    return new Promise<void>((resolve, reject) => {
      db.all(
        'SELECT * FROM user_achievements WHERE user_id = ? ORDER BY earned_at DESC',
        [userId],
        (err: Error | null, achievements: Achievement[]) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send(achievements);
            resolve();
          }
        }
      );
    });
  });
}