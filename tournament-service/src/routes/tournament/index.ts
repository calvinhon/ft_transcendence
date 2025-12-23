// tournament-service/src/routes/tournament/index.ts
import { FastifyInstance } from 'fastify';
import tournamentCrudRoutes from './crud';
import tournamentParticipantRoutes from './participants';
import tournamentMatchRoutes from './matches';
import tournamentBracketRoutes from './bracket';
import tournamentUserRoutes from './user';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('TOURNAMENT-SERVICE');

export default async function tournamentRoutes(fastify: FastifyInstance): Promise<void> {
  // Register all tournament route groups
  logger.info('🏆 [TOURNAMENT-INDEX] Registering tournament routes...');
  await tournamentCrudRoutes(fastify);
  logger.info('🏆 [TOURNAMENT-INDEX] CRUD routes registered');
  await tournamentParticipantRoutes(fastify);
  logger.info('🏆 [TOURNAMENT-INDEX] Participant routes registered');
  await tournamentMatchRoutes(fastify);
  logger.info('🏆 [TOURNAMENT-INDEX] Match routes registered');
  await tournamentBracketRoutes(fastify);
  logger.info('🏆 [TOURNAMENT-INDEX] Bracket routes registered');
  await tournamentUserRoutes(fastify);
  logger.info('🏆 [TOURNAMENT-INDEX] User routes registered');
}