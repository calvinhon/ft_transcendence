// auth-service/src/routes/handlers/logout.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendSuccess, sendError, createLogger } from '@ft-transcendence/common';
// Hoach added: For session management
import { AuthService } from '../../services/authService';
// End Hoach added

const logger = createLogger('AUTH-SERVICE');

//Hoach edited: Simplified logout to just clear JWT cookie, no session deletion
export async function logoutHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Clear the token cookie
    reply.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    logger.info('User logged out');
    return sendSuccess(reply, { message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    return sendError(reply, 'Logout failed', 500);
  }
}
//Hoach edit ended
