import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { friendService } from '../services/friendService';
import { sendSuccess, sendError, createLogger } from '@ft-transcendence/common';

const logger = createLogger('USER-SERVICE-FRIENDS-ROUTES');

export async function friendRoutes(fastify: FastifyInstance): Promise<void> {

    fastify.post('/add', async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.session || !request.session.userId)
            return sendError(reply, "Unauthorized", 401);
        try {
            const userId = request.session.userId;
            const { friendId } = request.body as any;
            if (!friendId) {
                return sendError(reply, 'Missing friendId', 400);
            }

            await friendService.addFriend(userId, friendId);
            sendSuccess(reply, { success: true });
        } catch (error) {
            logger.error('Error adding friend', error);
            sendError(reply, 'Failed to add friend', 500);
        }
    });

    fastify.post('/remove', async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.session || !request.session.userId)
            return sendError(reply, "Unauthorized", 401);
        try {
            const userId = request.session.userId;
            const { friendId } = request.body as any;
            if (!friendId) return sendError(reply, 'Missing friendId', 400);

            await friendService.removeFriend(userId, friendId);
            sendSuccess(reply, { success: true });
        } catch (error) {
            logger.error('Error removing friend', error);
            sendError(reply, 'Failed to remove friend', 500);
        }
    });

    fastify.get<{ Params: { userId: string } }>('/:userId', async (request, reply) => {
        if (!request.session || !request.session.userId)
            return sendError(reply, "Unauthorized", 401);
        try {
            const { userId } = request.params;
            const friends = await friendService.getFriends(parseInt(userId));
            sendSuccess(reply, friends);
        } catch (error) {
            logger.error('Error fetching friends', error);
            sendError(reply, 'Failed to fetch friends', 500);
        }
    });
}
