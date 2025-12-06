// auth-service/src/routes/handlers/login.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/authService';
import { validateRequiredFields, sendError, sendSuccess } from '../../utils/responses';

export async function loginHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authService = new AuthService(request.server);
  let identifier = 'unknown';
  try {
    const body = request.body as { username: string; password: string; totpToken?: string };
    identifier = body.username;
    const { password, totpToken } = body;

    console.log('Login attempt for identifier:', identifier);

    const validationError = validateRequiredFields(request.body, ['username', 'password']);
    if (validationError) {
      console.log('Validation failed for', identifier, 'error:', validationError);
      return sendError(reply, validationError, 400);
    }

    console.log('Validation passed for', identifier);

    const result = await authService.login(identifier, password, totpToken);

    console.log('Login successful for', identifier);

    // Set JWT as HTTP-only cookie
    reply.setCookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 // 24 hours in seconds
    });

    sendSuccess(reply, {
      user: result.user
    }, 'Login successful');

  } catch (error: any) {
    console.log('Login failed for', identifier, 'with error:', error.message);
    if (error.message === 'Invalid credentials') {
      sendError(reply, 'Invalid credentials', 401);
    } else {
      console.error('Login error:', error);
      sendError(reply, 'Internal server error', 500);
    }
  }
}