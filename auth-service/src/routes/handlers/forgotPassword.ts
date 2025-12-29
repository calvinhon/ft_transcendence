// auth-service/src/routes/handlers/forgotPassword.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/authService';
import { validateEmail, sendError, sendSuccess, createLogger, ERROR_MESSAGES } from '@ft-transcendence/common';

const logger = createLogger('AUTH-SERVICE');

export async function forgotPasswordHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authService = new AuthService(request.server);
  try {
    const { email } = request.body as { email: string };

    if (!email) {
      return sendError(reply, 'Email is required', 400);
    }

    if (!validateEmail(email)) {
      return sendError(reply, ERROR_MESSAGES.INVALID_EMAIL_FORMAT, 400);
    }

    const result = await authService.createPasswordResetToken(email);

    // In production the reset link will be emailed; log for development
    logger.info('Reset Link:', result.resetLink);

    sendSuccess(reply, { message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error: any) {
    logger.error('Forgot password error:', error);
    // Always respond with success to avoid leaking account existence
    sendSuccess(reply, { message: 'If an account with that email exists, a password reset link has been sent.' });
  }
}