// auth-service/src/routes/handlers/forgotPassword.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/authService';
import { validateEmail, sendError, sendSuccess } from '../../utils/responses';

export async function forgotPasswordHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authService = new AuthService();
  try {
    const { email } = request.body as { email: string };

    if (!email) {
      return sendError(reply, 'Email is required', 400);
    }

    if (!validateEmail(email)) {
      return sendError(reply, 'Invalid email format', 400);
    }

    const result = await authService.createPasswordResetToken(email);

    // In production the reset link will be emailed; log for development
    console.log('Reset Link:', result.resetLink);

    sendSuccess(reply, { message: 'If an account with that email exists, a password reset link has been sent.' });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    // Always respond with success to avoid leaking account existence
    sendSuccess(reply, { message: 'If an account with that email exists, a password reset link has been sent.' });
  }
}