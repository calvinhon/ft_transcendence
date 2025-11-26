// tournament-service/src/routes/tournament/index.ts
import { FastifyInstance } from 'fastify';
import tournamentCrudRoutes from './crud';
import tournamentParticipantRoutes from './participants';
import tournamentMatchRoutes from './matches';
import tournamentBracketRoutes from './bracket';

export default async function tournamentRoutes(fastify: FastifyInstance): Promise<void> {
  // Register all tournament route groups
  await tournamentCrudRoutes(fastify);
  await tournamentParticipantRoutes(fastify);
  await tournamentMatchRoutes(fastify);
  await tournamentBracketRoutes(fastify);
}