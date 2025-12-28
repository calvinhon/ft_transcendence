import { FastifyRequest, FastifyReply } from 'fastify';
import { sendSuccess, sendError, createLogger } from '@ft-transcendence/common';
// Hoach added: For session validation
import { AuthService } from '../../services/authService';
const logger = createLogger('AUTH-SERVICE');
// End Hoach added

export async function verifySessionHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // Hoach added: Validate session from HTTP-only cookie + per-tab token from header
    const authService = new AuthService();
    const sessionToken = request.cookies.sessionToken;
    const tabToken = request.headers['x-tab-token'] as string | undefined; // Per-tab token from client

    if (!sessionToken) {
        logger.warn('Verify request without session token');
        // Ensure browser cookie is cleared (HttpOnly cookie cannot be removed by JS)
        reply.clearCookie('sessionToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });
        return sendError(reply, 'Not logged in', 401);
    }

    // Validate session with both cookie and per-tab token
    const user = await authService.validateSession(sessionToken, tabToken);
    if (!user) {
        logger.warn(`Invalid or expired session token${tabToken ? ' or tab token mismatch' : ''}`);
        // Explicitly expire the cookie so browser stops sending it
        reply.clearCookie('sessionToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });
        return sendError(reply, 'Session expired or not valid for this tab', 401);
    }

    logger.info(`Session verified for user ${user.userId}`);
    sendSuccess(reply, { user, valid: true }, 'Session valid');
    // End Hoach added
}
