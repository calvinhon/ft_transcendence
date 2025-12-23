// tournament-service/src/routes/index.ts
import { FastifyInstance } from 'fastify';
import tournamentRoutes from './tournament/index';

export default async function routes(fastify: FastifyInstance): Promise<void> {
  // Register all tournament routes
  await tournamentRoutes(fastify);
}