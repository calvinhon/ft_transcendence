import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as sqlite3 from 'sqlite3';
import { UserProfile, UpdateProfileBody, JWTPayload, ApiResponse } from '../types.js';
import { db } from '../user-logic.js';

export default async function setupUserProfileRoutes(fastify: FastifyInstance): Promise<void> {
  // Get user profile by ID (JWT authenticated - can view own or other profiles)
  fastify.get<{
    Params: { userId: string };
  }>('/profile/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
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
      const requestingUserId = decoded.userId;
      const requestedUserId = parseInt(request.params.userId);

      if (isNaN(requestedUserId)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid user ID'
        } as ApiResponse);
      }

      return new Promise<void>((resolve, reject) => {
        db.get(
          'SELECT * FROM user_profiles WHERE user_id = ?',
          [requestedUserId],
          (err: Error | null, profile: UserProfile) => {
            if (err) {
              reply.status(500).send({
                success: false,
                error: 'Database error'
              } as ApiResponse);
              reject(err);
            } else if (!profile) {
              // Create default profile if doesn't exist
              db.run(
                'INSERT INTO user_profiles (user_id) VALUES (?)',
                [requestedUserId],
                function(this: sqlite3.RunResult, err: Error | null) {
                  if (err) {
                    reply.status(500).send({
                      success: false,
                      error: 'Database error'
                    } as ApiResponse);
                    reject(err);
                  } else {
                    // Query the newly created profile to get all default values
                    db.get(
                      'SELECT * FROM user_profiles WHERE user_id = ?',
                      [requestedUserId],
                      (err: Error | null, newProfile: UserProfile) => {
                        if (err) {
                          reply.status(500).send({
                            success: false,
                            error: 'Database error'
                          } as ApiResponse);
                          reject(err);
                        } else {
                          reply.send({
                            success: true,
                            data: newProfile
                          } as ApiResponse<UserProfile>);
                          resolve();
                        }
                      }
                    );
                  }
                }
              );
            } else {
              reply.send({
                success: true,
                data: profile
              } as ApiResponse<UserProfile>);
              resolve();
            }
          }
        );
      });
    } catch (error) {
      console.log('Profile fetch by ID error:', error);
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

  // Get current user profile (JWT authenticated)
  fastify.get('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
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
        db.get(
          'SELECT * FROM user_profiles WHERE user_id = ?',
          [userId],
          (err: Error | null, profile: UserProfile) => {
            if (err) {
              reply.status(500).send({
                success: false,
                error: 'Database error'
              } as ApiResponse);
              reject(err);
            } else if (!profile) {
              // Create default profile if doesn't exist
              db.run(
                'INSERT INTO user_profiles (user_id) VALUES (?)',
                [userId],
                function(this: sqlite3.RunResult, err: Error | null) {
                  if (err) {
                    reply.status(500).send({
                      success: false,
                      error: 'Database error'
                    } as ApiResponse);
                    reject(err);
                  } else {
                    // Query the newly created profile to get all default values
                    db.get(
                      'SELECT * FROM user_profiles WHERE user_id = ?',
                      [userId],
                      (err: Error | null, newProfile: UserProfile) => {
                        if (err) {
                          reply.status(500).send({
                            success: false,
                            error: 'Database error'
                          } as ApiResponse);
                          reject(err);
                        } else {
                          reply.send({
                            success: true,
                            data: newProfile
                          } as ApiResponse<UserProfile>);
                          resolve();
                        }
                      }
                    );
                  }
                }
              );
            } else {
              reply.send({
                success: true,
                data: profile
              } as ApiResponse<UserProfile>);
              resolve();
            }
          }
        );
      });
    } catch (error) {
      console.log('Profile fetch error:', error);
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

  // Update current user profile (JWT authenticated)
  fastify.put<{
    Body: UpdateProfileBody;
  }>('/profile', async (request: FastifyRequest<{ Body: UpdateProfileBody }>, reply: FastifyReply) => {
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

      const { displayName, bio, country, preferredLanguage, themePreference } = request.body;

      return new Promise<void>((resolve, reject) => {
        db.run(
          `UPDATE user_profiles SET
           display_name = COALESCE(?, display_name),
           bio = COALESCE(?, bio),
           country = COALESCE(?, country),
           preferred_language = COALESCE(?, preferred_language),
           theme_preference = COALESCE(?, theme_preference),
           updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [displayName, bio, country, preferredLanguage, themePreference, userId],
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
                message: 'Profile updated successfully'
              } as ApiResponse);
              resolve();
            }
          }
        );
      });
    } catch (error) {
      console.log('Profile update error:', error);
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

  // Update game stats (wins, total_games, xp, level, campaign_level, etc) - JWT authenticated
  fastify.post<{
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
  }>('/game/update-stats', async (request, reply) => {
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
        return reply.status(400).send({
          success: false,
          error: 'No stats provided'
        } as ApiResponse);
      }

      return new Promise<void>((resolve, reject) => {
        const sql = 'UPDATE user_profiles SET ' + fields.join(', ') + ' WHERE user_id = ?';
        db.run(sql, values, function(this: sqlite3.RunResult, err: Error | null) {
          if (err) {
            reply.status(500).send({
              success: false,
              error: 'Database error',
              details: err.message
            } as ApiResponse);
            reject(err);
          } else {
            reply.send({
              success: true,
              message: 'Game stats updated successfully'
            } as ApiResponse);
            resolve();
          }
        });
      });
    } catch (error) {
      console.log('Game stats update error:', error);
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