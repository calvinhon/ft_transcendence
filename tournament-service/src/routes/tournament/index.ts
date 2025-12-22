// tournament-service/src/routes/tournament/index.ts
import { FastifyInstance } from 'fastify';
import tournamentCrudRoutes from './crud';
import tournamentParticipantRoutes from './participants';
import tournamentMatchRoutes from './matches';
import tournamentUserRoutes from './user';

export default async function tournamentRoutes(fastify: FastifyInstance): Promise<void> {
  // Register all tournament route groups
  console.log('🏆 [TOURNAMENT-INDEX] Registering tournament routes...');
  await tournamentCrudRoutes(fastify);
  console.log('🏆 [TOURNAMENT-INDEX] CRUD routes registered');
  await tournamentParticipantRoutes(fastify);
  console.log('🏆 [TOURNAMENT-INDEX] Participant routes registered');
  await tournamentMatchRoutes(fastify);
  console.log('🏆 [TOURNAMENT-INDEX] Match routes registered');
  await tournamentUserRoutes(fastify);
  console.log('🏆 [TOURNAMENT-INDEX] User routes registered');
}