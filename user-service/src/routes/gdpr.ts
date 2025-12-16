// user-service/src/routes/gdpr.ts
import { FastifyInstance } from 'fastify';
import {
  exportUserDataHandler,
  anonymizeUserHandler,
  deleteUserHandler,
  getGdprStatusHandler
} from './handlers/gdpr';

async function gdprRoutes(fastify: FastifyInstance): Promise<void> {
  // Get user GDPR status and rights
  fastify.get('/gdpr/status/:userId', getGdprStatusHandler);

  // Export user data
  fastify.get('/gdpr/export/:userId', exportUserDataHandler);

  // Anonymize user account
  fastify.post('/gdpr/anonymize/:userId', anonymizeUserHandler);

  // Delete user account
  fastify.delete('/gdpr/delete/:userId', deleteUserHandler);

  // Batch routes with /users prefix
  fastify.get('/users/gdpr/status/:userId', getGdprStatusHandler);
  fastify.get('/users/gdpr/export/:userId', exportUserDataHandler);
  fastify.post('/users/gdpr/anonymize/:userId', anonymizeUserHandler);
  fastify.delete('/users/gdpr/delete/:userId', deleteUserHandler);
}

export default gdprRoutes;
