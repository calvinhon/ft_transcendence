// auth-service/src/routes/handlers/logout.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { sendSuccess, createLogger } from '@ft-transcendence/common';
// Hoach added: For session management
import { AuthService } from '../../services/authService';
// End Hoach added

const logger = createLogger('AUTH-SERVICE');

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Hoach added: Delete session from DB
    const authService = new AuthService();
    const sessionToken = request.cookies.sessionToken;

    if (sessionToken) {
      try {
        await authService.logout(sessionToken);
        logger.info('Session deleted on logout');
      } catch (error) {
        logger.error('Error deleting session:', error);
      }
    }
    // End Hoach added

    // Clear the session cookie
    reply.clearCookie('sessionToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    sendSuccess(reply, {}, 'Logged out successfully');
  } catch (error: any) {
    logger.error('Logout error:', error);
    sendSuccess(reply, {}, 'Logged out successfully'); // Always succeed on logout
  }
}
