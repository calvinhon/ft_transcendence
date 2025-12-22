// auth-service/src/routes/handlers/register.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/authService';
import { RegisterRequestBody } from '../../types';
import { validateRequiredFields, validateEmail, sendError, sendSuccess } from '../../../../shared/responses';

export async function registerHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authService = new AuthService();
  try {
    const { username, email, password } = request.body as RegisterRequestBody;
    const validationError = validateRequiredFields(request.body, ['username', 'email', 'password']);
    if (validationError) return sendError(reply, validationError, 400);
    if (!validateEmail(email)) return sendError(reply, 'Invalid email format', 400);
    if (password.length < 6) return sendError(reply, 'Password must be at least 6 characters', 400);
    const result = await authService.register(username, email, password);

    sendSuccess(reply, { user: { userId: result.userId, username } }, 'User registered successfully', 201);
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      sendError(reply, 'Username or email already exists', 409);
    } else {
      console.error('Registration error:', error);
      sendError(reply, 'Internal server error', 500);
    }
  }
}