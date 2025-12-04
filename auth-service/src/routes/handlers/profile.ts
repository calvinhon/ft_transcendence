// auth-service/src/routes/handlers/profile.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/authService';
import { sendError, sendSuccess } from '../../utils/responses';

export async function profileHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authService = new AuthService(request.server);
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
      console.error('Profile fetch error:', error);
      sendError(reply, 'Internal server error', 500);
    }
  }
}