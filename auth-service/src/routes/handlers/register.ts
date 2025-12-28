// auth-service/src/routes/handlers/register.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/authService';
import { RegisterRequestBody } from '../../types';
import { validateRequiredFields, validateEmail, sendError, sendSuccess, createLogger, validatePassword, ERROR_MESSAGES } from '@ft-transcendence/common';

const logger = createLogger('AUTH-SERVICE');

export async function registerHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authService = new AuthService();
  try {
    const { username, email, password } = request.body as RegisterRequestBody;
    const validationError = validateRequiredFields(request.body, ['username', 'email', 'password']);
    if (validationError) return sendError(reply, validationError, 400);
    if (!validateEmail(email)) return sendError(reply, ERROR_MESSAGES.INVALID_EMAIL_FORMAT, 400);
    const passwordError = validatePassword(password);
    if (passwordError) return sendError(reply, passwordError, 400);
    const result = await authService.register(username, email, password);

    // Hoach added: Create session and return tabToken for per-tab enforcement
    const { sessionToken, tabToken } = await authService.createSession(result.userId);

    reply.setCookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 5 * 60 // 5 minutes (matches backend TTL for Option 3: short-lived sessions)
    });
    // End Hoach added

    sendSuccess(reply, { user: { userId: result.userId, username }, tabToken }, 'User registered successfully', 201);
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      sendError(reply, 'Username or email already exists', 409);
    } else {
      logger.error('Registration error:', error);
      sendError(reply, ERROR_MESSAGES.INTERNAL_SERVER_ERROR, 500);
    }
  }
}