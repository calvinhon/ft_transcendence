// auth-service/src/routes/auth.ts
import { FastifyInstance } from 'fastify';
import { registerHandler } from './handlers/register';
import { loginHandler } from './handlers/login';
import { logoutHandler } from './handlers/logout';
import { profileHandler } from './handlers/profile';
import { forgotPasswordHandler } from './handlers/forgotPassword';
import { resetPasswordHandler } from './handlers/resetPassword';
import { verifySessionHandler } from './handlers/verify';
//Hoach edited: Added OAuth and 2FA imports
import { oauthInitHandler, oauthCallbackHandler } from './handlers/oauth';
import {
  handleSetup2FA,
  handleVerify2FA,
  handleDisable2FA,
  handleGet2FAStatus,
} from './handlers/twoFactorHandlers';
//Hoach edit ended

async function authRoutes(fastify: FastifyInstance, opts?: unknown): Promise<void> {
  // Register routes
  fastify.post('/register', registerHandler);
  fastify.post('/login', loginHandler);
  fastify.post('/logout', logoutHandler);
  fastify.get('/profile/:userId', profileHandler);
  fastify.post('/verify', verifySessionHandler); // Add verify
  fastify.post('/forgot-password', forgotPasswordHandler);
  fastify.post('/reset-password', resetPasswordHandler);

  //Hoach edited: Added OAuth and 2FA routes
  // OAuth routes
  fastify.get('/oauth/init', oauthInitHandler);
  fastify.get('/oauth/callback', oauthCallbackHandler);

  // 2FA routes
  fastify.post('/2fa/setup', handleSetup2FA);
  fastify.post('/2fa/verify', handleVerify2FA);
  fastify.post('/2fa/disable', handleDisable2FA);
  fastify.get('/2fa/status', handleGet2FAStatus);
  //Hoach edit ended

  return Promise.resolve();
}

export default authRoutes;