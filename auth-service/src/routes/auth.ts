// auth-service/src/routes/auth.ts
import { FastifyInstance } from 'fastify';
import { registerHandler } from './handlers/register';
import { loginHandler } from './handlers/login';
import { logoutHandler } from './handlers/logout';
import { profileHandler, profileOauthIdentificationHandler } from './handlers/profile';
import { forgotPasswordHandler } from './handlers/forgotPassword';
import { resetPasswordHandler } from './handlers/resetPassword';
import { verifySessionHandler } from './handlers/verify';
//Hoach edited: Added OAuth and 2FA imports
import { oauthInitHandler, oauthCallbackHandler } from './handlers/oauth';
// import {
//   handleSetup2FA,
//   handleVerify2FA,
//   handleDisable2FA,
//   handleGet2FAStatus,
// } from './handlers/twoFactorHandlers';
//Hoach edit ended
import { oauthInitHandler, oauthCallbackHandler } from './handlers/oauth';

async function authRoutes(fastify: FastifyInstance, opts?: unknown): Promise<void> {
  console.log('�🚀🚀 AUTH ROUTES FUNCTION STARTED 🚀🚀🚀');

  // Register routes
  fastify.post('/register', registerHandler);
  console.log('✅ Registered /register');
  fastify.post('/login', loginHandler);
  console.log('✅ Registered /login');
  fastify.post('/logout', logoutHandler);
  fastify.get('/profile/:userId', profileHandler);
  fastify.get('/profile/oauth/:userId', profileOauthIdentificationHandler);
  fastify.post('/verify', verifySessionHandler); // Add verify
  fastify.post('/forgot-password', forgotPasswordHandler);
  fastify.post('/reset-password', resetPasswordHandler);
  fastify.get('/oauth/callback', oauthCallbackHandler);
  fastify.get('/oauth/init', oauthInitHandler);

  console.log('🔍 Before OAuth routes');
  //Hoach edited: Added OAuth and 2FA routes
  console.log('🔍 About to register OAuth routes...');
  try {
    // OAuth routes
    fastify.get('/oauth/init', oauthInitHandler);
    console.log('✅ Registered /oauth/init');
    fastify.get('/oauth/callback', oauthCallbackHandler);
    console.log('✅ Registered /oauth/callback');

    // Test route
    fastify.get('/test-oauth', async (request, reply) => {
      console.log('🎯 Test OAuth route called!');
      reply.send({ message: 'OAuth routes are working!' });
    });
    console.log('✅ Registered /test-oauth');
  } catch (error) {
    console.error('❌ Error registering OAuth routes:', error);
  }

  // 2FA routes
  // fastify.post('/2fa/setup', handleSetup2FA);
  // fastify.post('/2fa/verify', handleVerify2FA);
  // fastify.post('/2fa/disable', handleDisable2FA);
  // fastify.get('/2fa/status', handleGet2FAStatus);
  //Hoach edit ended

  return Promise.resolve();
}

export default authRoutes;