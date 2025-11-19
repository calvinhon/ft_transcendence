import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as sqlite3 from 'sqlite3';
import { UserProfile, UpdateProfileBody } from '../types.js';
import { db } from '../user-logic.js';

export default async function setupUserProfileRoutes(fastify: FastifyInstance): Promise<void> {
  // Get user profile
  fastify.get<{
    Params: { userId: string };
  }>('/profile/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    return new Promise<void>((resolve, reject) => {
      db.get(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userId],
        (err: Error | null, profile: UserProfile) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else if (!profile) {
            // Create default profile if doesn't exist
            db.run(
              'INSERT INTO user_profiles (user_id) VALUES (?)',
              [userId],
              function(this: sqlite3.RunResult, err: Error | null) {
                if (err) {
                  reply.status(500).send({ error: 'Database error' });
                  reject(err);
                } else {
                  // Query the newly created profile to get all default values
                  db.get(
                    'SELECT * FROM user_profiles WHERE user_id = ?',
                    [userId],
                    (err: Error | null, newProfile: UserProfile) => {
                      if (err) {
                        reply.status(500).send({ error: 'Database error' });
                        reject(err);
                      } else {
                        reply.send(newProfile);
                        resolve();
                      }
                    }
                  );
                }
              }
            );
          } else {
            reply.send(profile);
            resolve();
          }
        }
      );
    });
  });

  // Update user profile
  fastify.put<{
    Params: { userId: string };
    Body: UpdateProfileBody;
  }>('/profile/:userId', async (request: FastifyRequest<{ Params: { userId: string }; Body: UpdateProfileBody }>, reply: FastifyReply) => {
    const { userId } = request.params;
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
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send({ message: 'Profile updated successfully' });
            resolve();
          }
        }
      );
    });
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
  }>('/game/update-stats/:userId', async (request, reply) => {
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

    return new Promise<void>((resolve, reject) => {
      const sql = 'UPDATE user_profiles SET ' + fields.join(', ') + ' WHERE user_id = ?';
      db.run(sql, values, function(this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          reply.status(500).send({ error: 'Database error', details: err });
          reject(err);
        } else {
          reply.send({ message: 'Game stats updated successfully' });
          resolve();
        }
      });
    });
  });
}