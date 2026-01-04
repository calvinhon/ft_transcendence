// auth-service/src/routes/handlers/logout.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendSuccess, createLogger } from '@ft-transcendence/common';

const logger = createLogger('AUTH-SERVICE');

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Clear the session cookie
    reply.clearCookie('sessionId', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/'
    });
    await request.session.destroy();

    sendSuccess(reply, {}, 'Logged out successfully');
  } catch (error: any) {
    logger.error('Logout error:', error);
    sendSuccess(reply, {}, 'Logged out successfully'); // Always succeed on logout
  }
}
