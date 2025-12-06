// auth-service/src/routes/auth.ts
import { FastifyInstance } from 'fastify';
import { registerHandler } from './handlers/register';
import { loginHandler } from './handlers/login';
import { verifyHandler } from './handlers/verify';
import { logoutHandler } from './handlers/logout';
import { profileHandler } from './handlers/profile';
import { forgotPasswordHandler } from './handlers/forgotPassword';
import { resetPasswordHandler } from './handlers/resetPassword';
import { oauthInitHandler, oauthCallbackHandler } from './handlers/oauth';
import {
  handleSetup2FA,
  handleVerify2FA,
  handleDisable2FA,
  handleGet2FAStatus,
} from './handlers/twoFactorHandlers.js';

async function authRoutes(fastify: FastifyInstance, opts?: unknown): Promise<void> {
  // Register routes
  fastify.post('/register', registerHandler);
  fastify.post('/login', loginHandler);
  fastify.post('/verify', verifyHandler);
  fastify.post('/logout', logoutHandler);
  fastify.get('/profile/:userId', profileHandler);
  fastify.post('/forgot-password', forgotPasswordHandler);
  fastify.post('/reset-password', resetPasswordHandler);

  // OAuth routes
  fastify.get('/oauth/init', oauthInitHandler);
  fastify.get('/oauth/callback', oauthCallbackHandler);

  // 2FA routes
  fastify.post('/2fa/setup', handleSetup2FA);
  fastify.post('/2fa/verify', handleVerify2FA);
  fastify.post('/2fa/disable', handleDisable2FA);
  fastify.get('/2fa/status', handleGet2FAStatus);

  // Also register with /auth prefix for direct access (e.g., from Vite proxy)
  fastify.post('/auth/register', registerHandler);
  fastify.post('/auth/login', loginHandler);
  fastify.post('/auth/verify', verifyHandler);
  fastify.post('/auth/logout', logoutHandler);
  fastify.get('/auth/profile/:userId', profileHandler);
  fastify.post('/auth/forgot-password', forgotPasswordHandler);
  fastify.post('/auth/reset-password', resetPasswordHandler);
  fastify.get('/auth/oauth/init', oauthInitHandler);
  fastify.get('/auth/oauth/callback', oauthCallbackHandler);
  
  // 2FA routes with /auth prefix
  fastify.post('/auth/2fa/setup', handleSetup2FA);
  fastify.post('/auth/2fa/verify', handleVerify2FA);
  fastify.post('/auth/2fa/disable', handleDisable2FA);
  fastify.get('/auth/2fa/status', handleGet2FAStatus);

  return Promise.resolve();
}

export default authRoutes;