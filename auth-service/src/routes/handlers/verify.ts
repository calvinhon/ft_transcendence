// auth-service/src/routes/handlers/verify.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/authService';
import { sendError, sendSuccess } from '../../utils/responses';

export async function verifyHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authService = new AuthService(request.server);
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return sendError(reply, 'No token provided', 401);
    }

    const decoded = await authService.verifyToken(token);
    sendSuccess(reply, { valid: true, user: decoded });

  } catch (error: any) {
    if (error.message === 'Invalid token') {
      sendError(reply, 'Invalid token', 401);
    } else {
      console.error('Token verification error:', error);
      sendError(reply, 'Internal server error', 500);
    }
  }
}