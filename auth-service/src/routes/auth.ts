// auth-service/src/routes/auth.ts
import { FastifyInstance } from 'fastify';
import { registerHandler } from './handlers/register';
import { loginHandler } from './handlers/login';
import { logoutHandler } from './handlers/logout';
import { profileHandler, profileOauthIdentificationHandler } from './handlers/profile';
import { verifySessionHandler, establishSessionHandler } from './handlers/verify';
import { oauthInitHandler, oauthCallbackHandler } from './handlers/oauth';

async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register routes
  fastify.post('/register', registerHandler);
  fastify.post('/login', loginHandler);
  fastify.post('/logout', logoutHandler);
  fastify.get('/profile/:userId', profileHandler);
  fastify.get('/profile/oauth/:userId', profileOauthIdentificationHandler);
  fastify.post('/verify', verifySessionHandler); // Add verify
  fastify.post('/establish-session', establishSessionHandler); // Establish session for OAuth
  fastify.get('/oauth/callback', oauthCallbackHandler);
  fastify.get('/oauth/init', oauthInitHandler);

  return Promise.resolve();
}

export default authRoutes;