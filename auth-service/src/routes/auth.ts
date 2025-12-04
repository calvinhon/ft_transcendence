// auth-service/src/routes/auth.ts
import { FastifyInstance } from 'fastify';
import { registerHandler } from './handlers/register';
import { loginHandler } from './handlers/login';
import { verifyHandler } from './handlers/verify';
import { logoutHandler } from './handlers/logout';
import { profileHandler } from './handlers/profile';
import { forgotPasswordHandler } from './handlers/forgotPassword';
import { resetPasswordHandler } from './handlers/resetPassword';

async function authRoutes(fastify: FastifyInstance, opts?: unknown): Promise<void> {
  // Register routes
  fastify.post('/register', registerHandler);
  fastify.post('/login', loginHandler);
  fastify.post('/verify', verifyHandler);
  fastify.post('/logout', logoutHandler);
  fastify.get('/profile/:userId', profileHandler);
  fastify.post('/forgot-password', forgotPasswordHandler);
  fastify.post('/reset-password', resetPasswordHandler);

  // Also register with /auth prefix for direct access (e.g., from Vite proxy)
  fastify.post('/auth/register', registerHandler);
  fastify.post('/auth/login', loginHandler);
  fastify.post('/auth/verify', verifyHandler);
  fastify.post('/auth/logout', logoutHandler);
  fastify.get('/auth/profile/:userId', profileHandler);
  fastify.post('/auth/forgot-password', forgotPasswordHandler);
  fastify.post('/auth/reset-password', resetPasswordHandler);

  return Promise.resolve();
}

export default authRoutes;