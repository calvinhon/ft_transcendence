// user-service/src/routes/achievements.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import sqlite3 from 'sqlite3';
import { db } from './database';
import { Achievement, UserAchievement } from './types';

export async function setupAchievementRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all achievements
  fastify.get('/achievements', async (request: FastifyRequest, reply: FastifyReply) => {
    return new Promise<void>((resolve, reject) => {
      db.all(
        'SELECT * FROM achievements ORDER BY id',
        [],
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

  // Get user's achievements
  fastify.get<{
    Params: { userId: string };
  }>('/achievements/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    return new Promise<void>((resolve, reject) => {
      db.all(
        `SELECT ua.*, a.name, a.description, a.icon_url, a.reward_points
         FROM user_achievements ua
         JOIN achievements a ON ua.achievement_id = a.id
         WHERE ua.user_id = ?
         ORDER BY ua.unlocked_at DESC`,
        [userId],
        (err: Error | null, userAchievements: UserAchievement[]) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send(userAchievements);
            resolve();
          }
        }
      );
    });
  });

  // Unlock achievement for user
  fastify.post<{
    Body: { userId: string; achievementId: number };
  }>('/achievement/unlock', async (request: FastifyRequest<{ Body: { userId: string; achievementId: number } }>, reply: FastifyReply) => {
    const { userId, achievementId } = request.body;

    if (!userId || !achievementId) {
      return reply.status(400).send({ error: 'User ID and Achievement ID required' });
    }

    return new Promise<void>((resolve, reject) => {
      // Check if achievement already unlocked
      db.get(
        'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
        [userId, achievementId],
        (err: Error | null, existing: any) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else if (existing) {
            reply.status(409).send({ error: 'Achievement already unlocked' });
            resolve();
          } else {
            // Unlock the achievement
            db.run(
              'INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
              [userId, achievementId],
              function(this: sqlite3.RunResult, err: Error | null) {
                if (err) {
                  reply.status(500).send({ error: 'Database error' });
                  reject(err);
                } else {
                  reply.send({ message: 'Achievement unlocked successfully' });
                  resolve();
                }
              }
            );
          }
        }
      );
    });
  });

  // Check and unlock achievements based on user stats
  fastify.post<{
    Body: { userId: string };
  }>('/achievement/check', async (request: FastifyRequest<{ Body: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.body;

    if (!userId) {
      return reply.status(400).send({ error: 'User ID required' });
    }

    return new Promise<void>((resolve, reject) => {
      // Get user profile with stats
      db.get(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userId],
        (err: Error | null, profile: any) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else if (!profile) {
            reply.status(404).send({ error: 'User profile not found' });
            resolve();
          } else {
            // Get all achievements
            db.all(
              'SELECT * FROM achievements',
              [],
              (err: Error | null, achievements: Achievement[]) => {
                if (err) {
                  reply.status(500).send({ error: 'Database error' });
                  reject(err);
                } else {
                  const unlockedAchievements: Achievement[] = [];

                  // Check each achievement condition
                  achievements.forEach(achievement => {
                    let shouldUnlock = false;

                    switch (achievement.id) {
                      case 1: // First Win
                        shouldUnlock = profile.games_won >= 1;
                        break;
                      case 2: // Winning Streak
                        shouldUnlock = profile.win_streak >= 5;
                        break;
                      case 3: // Tournament Champion
                        shouldUnlock = profile.tournaments_won >= 1;
                        break;
                      case 4: // Social Butterfly
                        shouldUnlock = profile.friends_count >= 10;
                        break;
                      case 5: // Veteran Player
                        shouldUnlock = profile.games_played >= 100;
                        break;
                    }

                    if (shouldUnlock) {
                      unlockedAchievements.push(achievement);
                    }
                  });

                  // Unlock new achievements
                  if (unlockedAchievements.length > 0) {
                    const unlockPromises = unlockedAchievements.map(achievement => {
                      return new Promise<void>((resolveUnlock, rejectUnlock) => {
                        db.run(
                          'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                          [userId, achievement.id],
                          (err: Error | null) => {
                            if (err) rejectUnlock(err);
                            else resolveUnlock();
                          }
                        );
                      });
                    });

                    Promise.all(unlockPromises)
                      .then(() => {
                        reply.send({
                          message: `${unlockedAchievements.length} achievement(s) unlocked`,
                          achievements: unlockedAchievements
                        });
                        resolve();
                      })
                      .catch(err => {
                        reply.status(500).send({ error: 'Database error' });
                        reject(err);
                      });
                  } else {
                    reply.send({ message: 'No new achievements unlocked' });
                    resolve();
                  }
                }
              }
            );
          }
        }
      );
    });
  });
}