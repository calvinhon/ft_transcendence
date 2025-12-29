import { FastifyRequest, FastifyReply } from 'fastify';
import { sendSuccess, sendError, createLogger } from '@ft-transcendence/common';
// Hoach added: For session validation
import { AuthService } from '../../services/authService';
import { JWTPayload } from '../../types';
const logger = createLogger('AUTH-SERVICE');
// End Hoach added

//Hoach edited: Changed verify to use JWT verification instead of session validation
export async function verifySessionHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = request.cookies.token;

  if (!token) {
    logger.warn('Verify request without token');
    reply.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    return sendError(reply, 'Not logged in', 401);
  }

  try {
    const decoded = await request.server.jwt.verify(token) as JWTPayload;
    logger.info(`Token verified for user ${decoded.userId}`);
    sendSuccess(reply, { user: decoded, valid: true }, 'Token valid');
  } catch (error) {
    logger.warn('Invalid token');
    reply.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    return sendError(reply, 'Invalid token', 401);
  }
}
//Hoach edit ended
