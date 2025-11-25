// auth-service/src/routes/auth.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/authService';
import { RegisterRequestBody } from '../types';
import { validateRequiredFields, validateEmail, sendError, sendSuccess } from '../utils/responses';

async function authRoutes(fastify: FastifyInstance, opts?: unknown): Promise<void> {
  // plugin initialization
  // Register user (only this route for now)
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const authService = new AuthService(fastify);
    try {
      const { username, email, password } = request.body as RegisterRequestBody;
      const validationError = validateRequiredFields(request.body, ['username', 'email', 'password']);
      if (validationError) return sendError(reply, validationError, 400);
      if (!validateEmail(email)) return sendError(reply, 'Invalid email format', 400);
      if (password.length < 6) return sendError(reply, 'Password must be at least 6 characters', 400);
      const result = await authService.register(username, email, password);
      sendSuccess(reply, { userId: result.userId, username }, 'User registered successfully', 201);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        sendError(reply, 'Username or email already exists', 409);
      } else {
        console.error('Registration error:', error);
        sendError(reply, 'Internal server error', 500);
      }
    }
  });

  // Forgot password endpoint
  fastify.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const authService = new AuthService(fastify);
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
  });

  // Reset password endpoint
  fastify.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const authService = new AuthService(fastify);
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
  });

  // Verify token
  fastify.post('/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const authService = new AuthService(fastify);
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
  });

  // Get user profile
  fastify.get('/profile/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const authService = new AuthService(fastify);
    try {
      const { userId } = request.params as { userId: string };
      const userIdNum = parseInt(userId, 10);

      if (isNaN(userIdNum)) {
        return sendError(reply, 'Invalid user ID', 400);
      }

      const userProfile = await authService.getUserProfile(userIdNum);
      sendSuccess(reply, userProfile);

    } catch (error: any) {
      if (error.message === 'User not found') {
        sendError(reply, 'User not found', 404);
      } else {
        console.error('Profile fetch error:', error);
        sendError(reply, 'Internal server error', 500);
      }
    }
  });

  // Login user
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const authService = new AuthService(fastify);
    try {
      const { username, password } = request.body as { username: string; password: string };

      const validationError = validateRequiredFields(request.body, ['username', 'password']);
      if (validationError) {
        return sendError(reply, validationError, 400);
      }

      const result = await authService.login(username, password);

      sendSuccess(reply, {
        user: result.user,
        token: result.token
      }, 'Login successful');

    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        sendError(reply, 'Invalid credentials', 401);
      } else {
        console.error('Login error:', error);
        sendError(reply, 'Internal server error', 500);
      }
    }
  });
  // plugin setup complete
  return Promise.resolve();
}

export default authRoutes;