// user-service/src/routes/gdpr.ts
import { FastifyInstance } from 'fastify';
import { requireJWTAuth } from '@ft-transcendence/common';
import {
  exportUserDataHandler,
  anonymizeUserHandler,
  deleteUserHandler,
  getGdprStatusHandler
} from './handlers/gdpr';

async function gdprRoutes(fastify: FastifyInstance): Promise<void> {
  // Get user GDPR status and rights
  fastify.get('/gdpr/status/:userId', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect GDPR status routes
  }, getGdprStatusHandler);

  // Export user data
  fastify.get('/gdpr/export/:userId', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect GDPR export routes
  }, exportUserDataHandler);

  // Anonymize user account
  fastify.post('/gdpr/anonymize/:userId', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect GDPR anonymize routes
  }, anonymizeUserHandler);

  // Delete user account
  fastify.delete('/gdpr/delete/:userId', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect GDPR delete routes
  }, deleteUserHandler);

  // Batch routes with /users prefix
  fastify.get('/users/gdpr/status/:userId', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect GDPR status routes
  }, getGdprStatusHandler);
  fastify.get('/users/gdpr/export/:userId', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect GDPR export routes
  }, exportUserDataHandler);
  fastify.post('/users/gdpr/anonymize/:userId', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect GDPR anonymize routes
  }, anonymizeUserHandler);
  fastify.delete('/users/gdpr/delete/:userId', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect GDPR delete routes
  }, deleteUserHandler);
}

export default gdprRoutes;
