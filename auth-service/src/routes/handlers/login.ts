// auth-service/src/routes/handlers/login.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/authService';
import { validateRequiredFields, sendError, sendSuccess } from '../../utils/responses';

export async function loginHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authService = new AuthService(request.server);
  let username = 'unknown';
  try {
    const body = request.body as { username: string; password: string };
    username = body.username;
    const { password } = body;

    console.log('Login attempt for username:', username);

    const validationError = validateRequiredFields(request.body, ['username', 'password']);
    if (validationError) {
      console.log('Validation failed for', username, 'error:', validationError);
      return sendError(reply, validationError, 400);
    }

    console.log('Validation passed for', username);

    const result = await authService.login(username, password);

    console.log('Login successful for', username);

    sendSuccess(reply, {
      user: result.user,
      token: result.token
    }, 'Login successful');

  } catch (error: any) {
    console.log('Login failed for', username, 'with error:', error.message);
    if (error.message === 'Invalid credentials') {
      sendError(reply, 'Invalid credentials', 401);
    } else {
      console.error('Login error:', error);
      sendError(reply, 'Internal server error', 500);
    }
  }
}