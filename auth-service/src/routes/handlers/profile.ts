// auth-service/src/routes/handlers/profile.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/authService';
import { getQuery } from '../../utils/database';
import { sendError, sendSuccess, createLogger, ERROR_MESSAGES } from '@ft-transcendence/common';

const logger = createLogger('AUTH-SERVICE');

export async function profileHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authService = new AuthService();
  try {
    const { userId } = request.params as { userId: string };
    const userIdNum = parseInt(userId, 10);

    if (isNaN(userIdNum)) {
      return sendError(reply, 'Invalid user ID', 400);
    }

    const userProfile = await authService.getUserProfile(userIdNum);
    sendSuccess(reply, userProfile);

  } catch (error: any) {
    if (error.message === 'User not found') {
      sendError(reply, 'User not found', 404);
    } else {
      logger.error('Profile fetch error:', error);
      sendError(reply, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 500);
    }
  }
}

export async function profileOauthIdentificationHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { userId } = request.params as { userId: string };
    const userIdNum = parseInt(userId, 10);

    if (isNaN(userIdNum)) {
      return sendError(reply, 'Invalid user ID', 400);
    }
    const oauthValue = await getQuery<any>('SELECT oauth_provider FROM users WHERE id = ?', [userId]);

    if (!oauthValue)
      throw new Error('User not found');

    sendSuccess(reply, oauthValue);
  } catch (err: any) {
    console.log(err.message);
    sendError(reply, err.message, 404);
  }
}