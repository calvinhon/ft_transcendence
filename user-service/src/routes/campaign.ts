// Hoach - campaign progression- backend
// user-service/src/routes/campaign.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database';
import { promisifyDbRun, promisifyDbGet, createLogger } from '@ft-transcendence/common';

const logger = createLogger('CAMPAIGN');
const MAX_CAMPAIGN_LEVEL = 3;

export async function campaignRoutes(fastify: FastifyInstance): Promise<void> {

    /**
     * POST /campaign/advance
     * Called ONLY by game-service after a verified campaign victory.
     * Validates that progression is legitimate - can only advance by 1 level.
     */
    fastify.post<{
        Body: {
            userId: number;
            completedLevel: number;
            gameId: number;
        };
    }>('/campaign/advance', async (request: FastifyRequest<{ Body: { userId: number; completedLevel: number; gameId: number } }>, reply: FastifyReply) => {
        const { userId, completedLevel, gameId } = request.body;

        // Validate input
        if (!userId || !completedLevel || !gameId) {
            return reply.status(400).send({ error: 'Missing required fields' });
        }

        if (completedLevel < 1 || completedLevel > MAX_CAMPAIGN_LEVEL) {
            return reply.status(400).send({ error: 'Invalid campaign level' });
        }

        try {
            // Get current campaign level from database
            const profile = await promisifyDbGet(db, 
                'SELECT campaign_level, campaign_mastered FROM user_profiles WHERE user_id = ?', 
                [userId]
            ) as any;

            if (!profile) {
                return reply.status(404).send({ error: 'User profile not found' });
            }

            const currentLevel = profile.campaign_level || 1;
            const alreadyMastered = profile.campaign_mastered === 1;

            // SECURITY: Only allow completing the current level or replaying previous levels
            // Cannot skip levels
            if (completedLevel > currentLevel) {
                logger.warn(`Security: User ${userId} tried to complete level ${completedLevel} but is at level ${currentLevel}`);
                return reply.status(403).send({ 
                    error: 'Invalid progression', 
                    message: `Cannot complete level ${completedLevel} when current level is ${currentLevel}` 
                });
            }

            // Calculate new level
            let newLevel = currentLevel;
            let newMastered = alreadyMastered;

            if (completedLevel === currentLevel && currentLevel < MAX_CAMPAIGN_LEVEL) {
                // Advance to next level
                newLevel = currentLevel + 1;
                logger.info(`User ${userId} advancing from level ${currentLevel} to ${newLevel}`);
            } else if (completedLevel === currentLevel && currentLevel === MAX_CAMPAIGN_LEVEL) {
                // Completed final level - mark as mastered
                newMastered = true;
                logger.info(`User ${userId} has mastered the campaign!`);
            } else {
                // Replaying a previous level - no advancement needed
                logger.info(`User ${userId} replayed level ${completedLevel} (current: ${currentLevel})`);
            }

            // Update database
            await promisifyDbRun(db,
                'UPDATE user_profiles SET campaign_level = ?, campaign_mastered = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                [newLevel, newMastered ? 1 : 0, userId]
            );

            logger.info(`User ${userId} completed level ${completedLevel}. New level: ${newLevel}, Mastered: ${newMastered}, GameId: ${gameId}`);

            return reply.send({ 
                success: true, 
                newLevel, 
                mastered: newMastered 
            });
        } catch (err) {
            logger.error('Error advancing level:', err);
            return reply.status(500).send({ error: 'Database error' });
        }
    });

    /**
     * GET /campaign/:userId
     * Get campaign progress for a user - read-only endpoint for frontend
     */
    fastify.get<{
        Params: { userId: string };
    }>('/campaign/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
        const { userId } = request.params;

        try {
            const profile = await promisifyDbGet(db,
                'SELECT campaign_level, campaign_mastered FROM user_profiles WHERE user_id = ?',
                [userId]
            ) as any;

            if (!profile) {
                return reply.send({ level: 1, mastered: false });
            }

            return reply.send({
                level: profile.campaign_level || 1,
                mastered: profile.campaign_mastered === 1
            });
        } catch (err) {
            logger.error('Error fetching campaign progress:', err);
            return reply.status(500).send({ error: 'Database error' });
        }
    });
}
