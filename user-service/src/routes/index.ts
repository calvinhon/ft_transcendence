// user-service/src/routes/index.ts
import { FastifyInstance } from 'fastify';
import { setupProfileRoutes } from './profile';
import { setupAchievementRoutes } from './achievements';
import { setupSearchRoutes } from './search';
import gdprRoutes from './gdpr';


export default async function routes(fastify: FastifyInstance): Promise<void> {
  // Setup all route modules
  await setupProfileRoutes(fastify);
  await setupAchievementRoutes(fastify);
  await setupSearchRoutes(fastify);
  await gdprRoutes(fastify);

}
