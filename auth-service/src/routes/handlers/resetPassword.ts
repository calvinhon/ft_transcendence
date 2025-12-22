// auth-service/src/routes/handlers/resetPassword.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/authService';
import { sendError, sendSuccess } from '../../../../shared/responses';

export async function resetPasswordHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authService = new AuthService();
  try {
    const { token, newPassword } = request.body as { token: string; newPassword: string };

    if (!token || !newPassword) {
      return sendError(reply, 'Token and new password are required', 400);
    }

    if (newPassword.length < 6) {
      return sendError(reply, 'Password must be at least 6 characters', 400);
    }

    const result = await authService.resetPassword(token, newPassword);
    sendSuccess(reply, { username: result.username, email: result.email }, 'Password has been reset successfully');
  } catch (error: any) {
    if (error.message === 'Invalid or expired reset token') {
      sendError(reply, error.message, 400);
    } else if (error.message === 'Reset token has expired') {
      sendError(reply, error.message, 400);
    } else {
      console.error('Reset password error:', error);
      sendError(reply, 'Internal server error', 500);
    }
  }
}