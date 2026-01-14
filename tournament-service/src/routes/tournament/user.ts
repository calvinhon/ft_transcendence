// tournament-service/src/routes/tournament/user.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TournamentService } from '../../services/tournamentService';
import { sendSuccess, sendError, createLogger } from '@ft-transcendence/common';

const logger = createLogger('TOURNAMENT-SERVICE');

export default async function tournamentUserRoutes(fastify: FastifyInstance): Promise<void> {
  console.log('🏆 [USER-ROUTES] Registering user routes...');

  // Legacy tournament creation route (for frontend compatibility)
  fastify.post<{
    Body: { name: string; description?: string; maxParticipants?: number; createdBy: number };
  }>('/tournaments/create', async (request: FastifyRequest<{
    Body: { name: string; description?: string; maxParticipants?: number; createdBy: number };
  }>, reply: FastifyReply) => {
    if (!request.session || !request.session.userId)
        return console.log('Tournaments Creation'),sendError(reply, "Unauthorized", 401);
    try {
      // Never trust client-provided createdBy; bind to authenticated session.
      const tournament = await TournamentService.createTournament({
        name: request.body?.name,
        createdBy: request.session.userId,
      });
      logger.info('Tournament created via legacy API', { id: tournament.id, name: tournament.name });
      return sendSuccess(reply, tournament, 'Tournament created successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to create tournament via legacy API', { error: err.message, body: request.body });
      return sendError(reply, 'Failed to create tournament', 500);
    }
  });

  console.log('🏆 [USER-ROUTES] All user routes registered successfully');
}