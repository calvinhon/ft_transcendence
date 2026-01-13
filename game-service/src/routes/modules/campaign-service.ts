// Hoach - campaign progression- backend
// game-service/src/routes/modules/campaign-service.ts
import axios from 'axios';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('CAMPAIGN-SERVICE');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3002';

export class CampaignProgressionService {
    private static instance: CampaignProgressionService;

    public static getInstance(): CampaignProgressionService {
        if (!CampaignProgressionService.instance) {
            CampaignProgressionService.instance = new CampaignProgressionService();
        }
        return CampaignProgressionService.instance;
    }

    /**
     * Called by game-service when a campaign game ends.
     * Only advances level if the human player won.
     * This is the ONLY way to advance campaign level - server-side verification.
     */
    async handleCampaignGameEnd(params: {
        gameId: number;
        humanPlayerId: number;
        winnerId: number;
        campaignLevel: number;
    }): Promise<{ success: boolean; newLevel?: number; mastered?: boolean }> {
        const { gameId, humanPlayerId, winnerId, campaignLevel } = params;

        // Only advance if human won
        if (winnerId !== humanPlayerId) {
            logger.info(`[${gameId}] Campaign loss for player ${humanPlayerId} at level ${campaignLevel}`);
            return { success: false };
        }

        logger.info(`[${gameId}] Campaign victory! Player ${humanPlayerId} beat level ${campaignLevel}`);

        try {
            // Call user-service to advance campaign level
            const response = await axios.post(`${USER_SERVICE_URL}/api/user/campaign/advance`, {
                userId: humanPlayerId,
                completedLevel: campaignLevel,
                gameId: gameId  // For verification/audit trail
            });

            logger.info(`[${gameId}] Campaign level advanced for player ${humanPlayerId}: ${JSON.stringify(response.data)}`);
            return {
                success: true,
                newLevel: response.data.newLevel,
                mastered: response.data.mastered
            };
        } catch (error: any) {
            logger.error(`[${gameId}] Failed to advance campaign level:`, error.message);
            return { success: false };
        }
    }
}

export const campaignProgressionService = CampaignProgressionService.getInstance();
