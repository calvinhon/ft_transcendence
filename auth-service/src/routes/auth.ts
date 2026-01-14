// auth-service/src/routes/auth.ts
import { FastifyInstance } from 'fastify';
import { registerHandler } from './handlers/register';
import { loginHandler } from './handlers/login';
import { logoutHandler } from './handlers/logout';
import { profileHandler } from './handlers/profile';
import { verifySessionHandler, establishSessionHandler } from './handlers/verify';
import { oauthInitHandler, oauthCallbackHandler } from './handlers/oauth';
import {
  getLocalPlayersHandler,
  addLocalPlayerWithPasswordHandler,
  registerLocalPlayerHandler,
  addLocalPlayerFromOAuthHandler,
  addBotLocalPlayerHandler,
  deleteLocalPlayerHandler,
  clearLocalPlayersHandler,
  updateLocalPlayerHandler
} from './handlers/localPlayers';

async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register routes
  fastify.post('/register', registerHandler);
  fastify.post('/login', loginHandler);
  fastify.post('/logout', logoutHandler);
  fastify.get('/profile/:userId', profileHandler);
  fastify.post('/verify', verifySessionHandler); // Add verify
  fastify.post('/establish-session', establishSessionHandler); // Establish session for OAuth
  fastify.get('/oauth/callback', oauthCallbackHandler);
  fastify.get('/oauth/init', oauthInitHandler);

  // Local players (stored server-side in the host session)
  fastify.get('/local-players', getLocalPlayersHandler);
  fastify.post('/local-players/add', addLocalPlayerWithPasswordHandler);
  fastify.post('/local-players/register', registerLocalPlayerHandler);
  fastify.post('/local-players/add-oauth', addLocalPlayerFromOAuthHandler);
  fastify.post('/local-players/add-bot', addBotLocalPlayerHandler);
  fastify.delete('/local-players/:userId', deleteLocalPlayerHandler);
  fastify.post('/local-players/clear', clearLocalPlayersHandler);
  fastify.post('/local-players/update', updateLocalPlayerHandler);

  return Promise.resolve();
}

export default authRoutes;