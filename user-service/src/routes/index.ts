// user-service/src/routes/index.ts
import { FastifyInstance } from 'fastify';
import { setupProfileRoutes } from './profile';
import { setupAchievementRoutes } from './achievements';
import { setupSearchRoutes } from './search';

export default async function routes(fastify: FastifyInstance): Promise<void> {
  // Setup all route modules
  await setupProfileRoutes(fastify);
  await setupAchievementRoutes(fastify);
  await setupSearchRoutes(fastify);

  // Health check
  fastify.get('/health', async (request, reply) => {
    reply.send({
      status: 'healthy',
      service: 'user-service',
      timestamp: new Date().toISOString(),
      modules: ['profile', 'achievements', 'search']
    });
  });
}