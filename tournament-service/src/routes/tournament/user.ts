// tournament-service/src/routes/tournament/user.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TournamentService } from '../../services/tournamentService';
import { ParticipantService } from '../../services/participantService';
import { ResponseUtil } from '../../utils/responses';
import { logger } from '../../utils/logger';

export default async function tournamentUserRoutes(fastify: FastifyInstance): Promise<void> {
  console.log('🏆 [USER-ROUTES] Registering user routes...');

  // Legacy tournament creation route (for frontend compatibility)
  fastify.post<{
    Body: { name: string; description?: string; maxParticipants?: number; createdBy: number };
  }>('/tournaments/create', async (request: FastifyRequest<{
    Body: { name: string; description?: string; maxParticipants?: number; createdBy: number };
  }>, reply: FastifyReply) => {
    try {
      const tournament = await TournamentService.createTournament(request.body);
      logger.info('Tournament created via legacy API', { id: tournament.id, name: tournament.name });
      return ResponseUtil.success(reply, tournament, 'Tournament created successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to create tournament via legacy API', { error: err.message, body: request.body });
      return ResponseUtil.error(reply, 'Failed to create tournament', 500);
    }
  });

  console.log('🏆 [USER-ROUTES] All user routes registered successfully');
}