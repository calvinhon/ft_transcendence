// tournament-service/src/routes/tournament/participants.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ParticipantService } from '../../services/participantService';
import { JoinTournamentBody } from '../../types';
import { ResponseUtil } from '../../utils/responses';
import { logger } from '../../utils/logger';

export default async function tournamentParticipantRoutes(fastify: FastifyInstance): Promise<void> {
  // Join tournament
  fastify.post<{
    Params: { tournamentId: string };
    Body: JoinTournamentBody;
  }>('/tournaments/:tournamentId/join', async (request: FastifyRequest<{
    Params: { tournamentId: string };
    Body: JoinTournamentBody;
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.tournamentId);
      const { userId } = request.body;

      if (isNaN(tournamentId)) {
        return ResponseUtil.error(reply, 'Invalid tournament ID', 400);
      }

      const participant = await ParticipantService.joinTournament(tournamentId, userId);
      logger.info('User joined tournament', { tournamentId, userId });
      return ResponseUtil.success(reply, participant, 'Successfully joined tournament');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to join tournament', {
        error: err.message,
        tournamentId: request.params.tournamentId,
        userId: request.body.userId
      });
      return ResponseUtil.error(reply, err.message || 'Failed to join tournament', 500);
    }
  });

  // Get user's tournament rankings
  fastify.get<{
    Params: { userId: string };
  }>('/user/:userId/rankings', async (request: FastifyRequest<{
    Params: { userId: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = parseInt(request.params.userId);

      if (isNaN(userId)) {
        return ResponseUtil.error(reply, 'Invalid user ID', 400);
      }

      const rankings = await ParticipantService.getUserRankings(userId);
      return ResponseUtil.success(reply, rankings, 'User rankings retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get user rankings', {
        error: err.message,
        userId: request.params.userId
      });
      return ResponseUtil.error(reply, 'Failed to retrieve user rankings', 500);
    }
  });

  // Get user tournaments
  fastify.get<{
    Params: { userId: string };
  }>('/tournaments/user/:userId', async (request: FastifyRequest<{
    Params: { userId: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = parseInt(request.params.userId);

      if (isNaN(userId)) {
        return ResponseUtil.error(reply, 'Invalid user ID', 400);
      }

      const tournaments = await ParticipantService.getUserTournaments(userId);
      return ResponseUtil.success(reply, tournaments, 'User tournaments retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get user tournaments', {
        error: err.message,
        userId: request.params.userId
      });
      return ResponseUtil.error(reply, 'Failed to retrieve user tournaments', 500);
    }
  });
}