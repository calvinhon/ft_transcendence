// user-service/src/routes/achievements.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database';
import { Achievement, UserAchievement } from '../types';
import { promisifyDbGet, promisifyDbRun, promisifyDbAll, requireJWTAuth } from '@ft-transcendence/common';

export async function setupAchievementRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all achievements
  fastify.get('/achievements', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const achievements = await promisifyDbAll<Achievement>(db, 'SELECT * FROM achievements ORDER BY id');
      reply.send(achievements);
    } catch (err) {
      reply.status(500).send({ error: 'Database error' });
    }
  });

  // Get user's achievements
  fastify.get<{
    Params: { userId: string };
  }>('/achievements/:userId', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect user achievements routes
  }, async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    try {
      const userAchievements = await promisifyDbAll<UserAchievement>(db, `SELECT ua.*, a.name, a.description, a.icon_url, a.reward_points
         FROM user_achievements ua
         JOIN achievements a ON ua.achievement_id = a.id
         WHERE ua.user_id = ?
         ORDER BY ua.unlocked_at DESC`, [userId]);
      reply.send(userAchievements);
    } catch (err) {
      reply.status(500).send({ error: 'Database error' });
    }
  });

  // Unlock achievement for user
  fastify.post<{
    Body: { userId: string; achievementId: number };
  }>('/achievement/unlock', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect achievement unlock routes
  }, async (request: FastifyRequest<{ Body: { userId: string; achievementId: number } }>, reply: FastifyReply) => {
    const { userId, achievementId } = request.body;

    if (!userId || !achievementId) {
      return reply.status(400).send({ error: 'User ID and Achievement ID required' });
    }

    try {
      const existing = await promisifyDbGet<any>(db, 'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?', [userId, achievementId]);
      if (existing) {
        return reply.status(409).send({ error: 'Achievement already unlocked' });
      }
      await promisifyDbRun(db, 'INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [userId, achievementId]);
      reply.send({ message: 'Achievement unlocked successfully' });
    } catch (err) {
      reply.status(500).send({ error: 'Database error' });
    }
  });

  // Check and unlock achievements based on user stats
  fastify.post<{
    Body: { userId: string };
  }>('/achievement/check', async (request: FastifyRequest<{ Body: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.body;

    if (!userId) {
      return reply.status(400).send({ error: 'User ID required' });
    }

    try {
      const profile = await promisifyDbGet<any>(db, 'SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
      if (!profile) {
        return reply.status(404).send({ error: 'User profile not found' });
      }

      const achievements = await promisifyDbAll<Achievement>(db, 'SELECT * FROM achievements');

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
        const unlockPromises = unlockedAchievements.map(achievement =>
          promisifyDbRun(db, 'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [userId, achievement.id])
        );
        await Promise.all(unlockPromises);
        reply.send({
          message: `${unlockedAchievements.length} achievement(s) unlocked`,
          achievements: unlockedAchievements
        });
      } else {
        reply.send({ message: 'No new achievements unlocked' });
      }
    } catch (err) {
      reply.status(500).send({ error: 'Database error' });
    }
  });
}