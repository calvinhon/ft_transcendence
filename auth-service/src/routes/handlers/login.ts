// auth-service/src/routes/handlers/login.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/authService';
import { validateRequiredFields, sendError, sendSuccess, createLogger, ERROR_MESSAGES } from '@ft-transcendence/common';

const logger = createLogger('AUTH-SERVICE');

export async function loginHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authService = new AuthService();
  let identifier = 'unknown';
  try {
    const body = request.body as { username: string; password: string };
    identifier = body.username;
    const { password } = body;

    logger.info('Login attempt for identifier:', identifier);

    const validationError = validateRequiredFields(request.body, ['username', 'password']);
    if (validationError) {
      logger.info('Validation failed for', identifier, 'error:', validationError);
      return sendError(reply, validationError, 400);
    }

    logger.info('Validation passed for', identifier);

    const user = await authService.login(identifier, password);

    logger.info('Login successful for', identifier);

    sendSuccess(reply, {
      user
    }, 'Login successful');

  } catch (error: any) {
    logger.warn('Login failed for', identifier, 'with error:', error.message);
    if (error.message === 'Invalid credentials') {
      sendError(reply, 'Invalid credentials', 401);
    } else {
      logger.error('Login error:', error);
      sendError(reply, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 500);
    }
  }
}