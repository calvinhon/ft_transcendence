// tournament-service/src/routes/tournament/participants.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ParticipantService } from '../../services/participantService';
import { TournamentService } from '../../services/tournamentService';
import { JoinTournamentBody } from '../../types';
import { sendSuccess, sendError, createLogger } from '@ft-transcendence/common';

const logger = createLogger('TOURNAMENT-SERVICE');

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

  // Legacy join tournament route (for backward compatibility)
  fastify.post<{
    Params: { tournamentId: string };
    Body: JoinTournamentBody;
  }>('/tournaments/:tournamentId/participants', async (request: FastifyRequest<{
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
      logger.info('User joined tournament via legacy API', { tournamentId, userId });
      return sendSuccess(reply, participant, 'Successfully joined tournament');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to join tournament via legacy API', {
        error: err.message,
        tournamentId: request.params.tournamentId,
        userId: request.body.userId
      });
      return sendError(reply, err.message || 'Failed to join tournament', 500);
    }
  });

  // Get tournament participants
  fastify.get<{
    Params: { tournamentId: string };
  }>('/tournaments/:tournamentId/participants', async (request: FastifyRequest<{
    Params: { tournamentId: string };
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.tournamentId);

      if (isNaN(tournamentId)) {
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      const participants = await TournamentService.getTournamentParticipants(tournamentId);
      return sendSuccess(reply, participants, 'Participants retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get tournament participants', {
        error: err.message,
        tournamentId: request.params.tournamentId
      });
      return sendError(reply, 'Failed to retrieve participants', 500);
    }
  });

  // Leave tournament
  fastify.delete<{
    Params: { tournamentId: string; userId: string };
  }>('/tournaments/:tournamentId/participants/:userId', async (request: FastifyRequest<{
    Params: { tournamentId: string; userId: string };
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.tournamentId);
      const userId = parseInt(request.params.userId);

      if (isNaN(tournamentId) || isNaN(userId)) {
        return sendError(reply, 'Invalid tournament ID or user ID', 400);
      }

      const success = await ParticipantService.leaveTournament(tournamentId, userId);
      if (!success) {
        return sendError(reply, 'Participant not found or cannot leave tournament', 404);
      }

      logger.info('User left tournament', { tournamentId, userId });
      return sendSuccess(reply, null, 'Successfully left tournament');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to leave tournament', {
        error: err.message,
        tournamentId: request.params.tournamentId,
        userId: request.params.userId
      });
      return sendError(reply, err.message || 'Failed to leave tournament', 500);
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

  // Get tournament leaderboard
  fastify.get<{
    Params: { tournamentId: string };
  }>('/tournaments/:tournamentId/leaderboard', async (request: FastifyRequest<{
    Params: { tournamentId: string };
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.tournamentId);

      if (isNaN(tournamentId)) {
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      const leaderboard = await ParticipantService.getTournamentLeaderboard(tournamentId);
      return sendSuccess(reply, leaderboard, 'Leaderboard retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get tournament leaderboard', {
        error: err.message,
        tournamentId: request.params.tournamentId
      });
      return sendError(reply, 'Failed to retrieve leaderboard', 500);
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
}