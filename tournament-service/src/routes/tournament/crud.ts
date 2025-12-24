// tournament-service/src/routes/tournament/crud.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TournamentService } from '../../services/tournamentService';
import { ResponseUtil } from '../../utils/responses';
import { logger } from '../../utils/logger';
import { setTimeout as delay } from 'timers/promises';

export default async function tournamentCrudRoutes(fastify: FastifyInstance): Promise<void> {
  // Get tournament by ID
  fastify.get<{
    Params: { id: string };
  }>('/tournaments/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return ResponseUtil.error(reply, 'Invalid tournament ID', 400);
      }

      const details = await TournamentService.getTournamentDetails(id);
      if (!details) {
        return ResponseUtil.error(reply, 'Tournament not found', 404);
      }

      reply.send(details);
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get tournament', { error: err.message, id: request.params.id });
      return ResponseUtil.error(reply, 'Failed to retrieve tournament', 500);
    }
  });

  // Start tournament (specific route)
  fastify.post<{
    Params: { tournamentId: string };
  }>('/tournaments/:tournamentId/start', async (request: FastifyRequest<{
    Params: { tournamentId: string };
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.tournamentId);

      if (isNaN(tournamentId)) {
        return ResponseUtil.error(reply, 'Invalid tournament ID', 400);
      }

      const tournament = await TournamentService.startTournament(tournamentId);
      logger.info('Tournament started via specific route', { tournamentId });
      return ResponseUtil.success(reply, tournament, 'Tournament started successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to start tournament', {
        error: err.message,
        tournamentId: request.params.tournamentId
      });
      return ResponseUtil.error(reply, err.message || 'Failed to start tournament', 500);
    }
  });
}