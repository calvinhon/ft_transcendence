import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as sqlite3 from 'sqlite3';
import { Achievement, AddAchievementBody, JWTPayload, ApiResponse } from '../types.js';
import { db } from '../user-logic.js';

export default async function setupUserAchievementsRoutes(fastify: FastifyInstance): Promise<void> {
  // Add achievement (JWT authenticated - for internal use)
  fastify.post<{
    Body: AddAchievementBody;
  }>('/achievement', async (request: FastifyRequest<{ Body: AddAchievementBody }>, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: 'No token provided'
        } as ApiResponse);
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = fastify.jwt.verify(token) as JWTPayload;

      const { userId, achievementType, achievementName, description, metadata } = request.body;

      if (!userId || !achievementType || !achievementName) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields'
        } as ApiResponse);
      }

      return new Promise<void>((resolve, reject) => {
        db.run(
          'INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, metadata) VALUES (?, ?, ?, ?, ?)',
          [userId, achievementType, achievementName, description || '', JSON.stringify(metadata || {})],
          function(this: sqlite3.RunResult, err: Error | null) {
            if (err) {
              reply.status(500).send({
                success: false,
                error: 'Database error'
              } as ApiResponse);
              reject(err);
            } else {
              reply.send({
                success: true,
                message: 'Achievement added successfully',
                data: { achievementId: this.lastID }
              } as ApiResponse<{ achievementId: number }>);
              resolve();
            }
          }
        );
      });
    } catch (error) {
      console.log('Add achievement error:', error);
      if (error instanceof Error && error.message.includes('expired')) {
        return reply.status(401).send({
          success: false,
          error: 'Token expired'
        } as ApiResponse);
      }
      reply.status(401).send({
        success: false,
        error: 'Invalid token'
      } as ApiResponse);
    }
  });

  // Get current user achievements (JWT authenticated)
  fastify.get('/achievements', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: 'No token provided'
        } as ApiResponse);
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = fastify.jwt.verify(token) as JWTPayload;
      const userId = decoded.userId;

      return new Promise<void>((resolve, reject) => {
        db.all(
          'SELECT * FROM user_achievements WHERE user_id = ? ORDER BY earned_at DESC',
          [userId],
          (err: Error | null, achievements: Achievement[]) => {
            if (err) {
              reply.status(500).send({
                success: false,
                error: 'Database error'
              } as ApiResponse);
              reject(err);
            } else {
              reply.send({
                success: true,
                data: achievements
              } as ApiResponse<Achievement[]>);
              resolve();
            }
          }
        );
      });
    } catch (error) {
      console.log('Get achievements error:', error);
      if (error instanceof Error && error.message.includes('expired')) {
        return reply.status(401).send({
          success: false,
          error: 'Token expired'
        } as ApiResponse);
      }
      reply.status(401).send({
        success: false,
        error: 'Invalid token'
      } as ApiResponse);
    }
  });
}