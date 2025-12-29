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
    preHandler: requireJWTAuth
  }, getGdprStatusHandler);

  // Export user data
  fastify.get('/gdpr/export/:userId', {
    preHandler: requireJWTAuth
  }, exportUserDataHandler);

  // Anonymize user account
  fastify.post('/gdpr/anonymize/:userId', {
    preHandler: requireJWTAuth
  }, anonymizeUserHandler);

  // Delete user account
  fastify.delete('/gdpr/delete/:userId', {
    preHandler: requireJWTAuth
  }, deleteUserHandler);

  // Batch routes with /users prefix
  fastify.get('/users/gdpr/status/:userId', {
    preHandler: requireJWTAuth
  }, getGdprStatusHandler);
  fastify.get('/users/gdpr/export/:userId', {
    preHandler: requireJWTAuth
  }, exportUserDataHandler);
  fastify.post('/users/gdpr/anonymize/:userId', {
    preHandler: requireJWTAuth
  }, anonymizeUserHandler);
  fastify.delete('/users/gdpr/delete/:userId', {
    preHandler: requireJWTAuth
  }, deleteUserHandler);
}

export default gdprRoutes;
