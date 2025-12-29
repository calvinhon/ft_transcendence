// tournament-service/src/routes/tournament/participants.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ParticipantService } from '../../services/participantService';
import { JoinTournamentBody } from '../../types';
import { sendSuccess, sendError, createLogger, requireJWTAuth } from '@ft-transcendence/common';

const logger = createLogger('TOURNAMENT-SERVICE');

export default async function tournamentParticipantRoutes(fastify: FastifyInstance): Promise<void> {
  // Join tournament
  fastify.post<{
    Params: { tournamentId: string };
    Body: JoinTournamentBody;
  }>('/tournaments/:tournamentId/join', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect tournament join routes
  }, async (request: FastifyRequest<{
    Params: { tournamentId: string };
    Body: JoinTournamentBody;
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.tournamentId);
      const { userId } = request.body;

      if (isNaN(tournamentId)) {
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      const participant = await ParticipantService.joinTournament(tournamentId, userId);
      logger.info('User joined tournament', { tournamentId, userId });
      return sendSuccess(reply, participant, 'Successfully joined tournament');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to join tournament', {
        error: err.message,
        tournamentId: request.params.tournamentId,
        userId: request.body.userId
      });
      return sendError(reply, err.message || 'Failed to join tournament', 500);
    }
  });

  // Get user's tournament rankings
  fastify.get<{
    Params: { userId: string };
  }>('/user/:userId/rankings', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect user rankings routes
  }, async (request: FastifyRequest<{
    Params: { userId: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = parseInt(request.params.userId);

      if (isNaN(userId)) {
        return sendError(reply, 'Invalid user ID', 400);
      }

      const rankings = await ParticipantService.getUserRankings(userId);
      return sendSuccess(reply, rankings, 'User rankings retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get user rankings', {
        error: err.message,
        userId: request.params.userId
      });
      return sendError(reply, 'Failed to retrieve user rankings', 500);
    }
  });

  // Get user tournaments
  fastify.get<{
    Params: { userId: string };
  }>('/tournaments/user/:userId', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect user tournaments routes
  }, async (request: FastifyRequest<{
    Params: { userId: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = parseInt(request.params.userId);

      if (isNaN(userId)) {
        return sendError(reply, 'Invalid user ID', 400);
      }

      const tournaments = await ParticipantService.getUserTournaments(userId);
      return sendSuccess(reply, tournaments, 'User tournaments retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get user tournaments', {
        error: err.message,
        userId: request.params.userId
      });
      return sendError(reply, 'Failed to retrieve user tournaments', 500);
    }
  });

  // Get all tournament participants
  fastify.get<{
    Params: { tournamentId: string };
  }>('/tournaments/participant/:tournamentId', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect tournament participants routes
  }, async (request: FastifyRequest<{ Params: { tournamentId: string } }>, reply: FastifyReply) => {
	try {
		const id = parseInt(request.params.tournamentId, 10);
		if (Number.isNaN(id)) return sendError(reply, 'Invalid tournament ID', 400);
		const participants = await ParticipantService.getTournamentParticipants(id);
		return sendSuccess(reply, participants, 'Tournament participants retrieved successfully');
	} catch (error) {
		return sendError(reply, 'Failed to retrieve tournament participants', 500);
	}
  })
}