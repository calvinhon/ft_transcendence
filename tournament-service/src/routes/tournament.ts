import { FastifyInstance } from 'fastify';
import { db } from '../tournament-logic';
import tournamentCreation from './tournament-creation';
import tournamentManagement from './tournament-management';
import tournamentQueries from './tournament-queries';

export default async function tournamentRoutes(fastify: FastifyInstance) {
  // Register all tournament route modules
  await fastify.register(tournamentCreation);
  await fastify.register(tournamentManagement);
  await fastify.register(tournamentQueries);
}