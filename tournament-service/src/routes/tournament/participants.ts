// tournament-service/src/routes/tournament/participants.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ParticipantService } from '../../services/participantService';
import { TournamentService } from '../../services/tournamentService';
import { JoinTournamentBody } from '../../types';
import { sendSuccess, sendError, createLogger } from '@ft-transcendence/common';

const logger = createLogger('TOURNAMENT-SERVICE');

export default async function tournamentParticipantRoutes(fastify: FastifyInstance): Promise<void> {
  const getAllowedParticipantIds = (session: any): Set<number> => {
    const allowed = new Set<number>();
    if (session && typeof session.userId === 'number') allowed.add(session.userId);

    const localPlayers = session?.localPlayers;
    if (Array.isArray(localPlayers)) {
      for (const p of localPlayers) {
        const userId = (p && typeof p.userId === 'number') ? p.userId : undefined;
        if (typeof userId === 'number') allowed.add(userId);
      }
    }

    return allowed;
  };

  // Join tournament
  fastify.post<{
    Params: { tournamentId: string };
    Body: JoinTournamentBody;
  }>('/tournaments/:tournamentId/join', async (request: FastifyRequest<{
    Params: { tournamentId: string };
    Body: JoinTournamentBody;
  }>, reply: FastifyReply) => {
    if (!request.session || !request.session.userId)
        return console.log('Tournaments Join'),sendError(reply, "Unauthorized", 401);
    try {
      const tournamentId = parseInt(request.params.tournamentId);
      const { userId, alias, avatarUrl } = request.body;

      if (isNaN(tournamentId)) {
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      if (typeof userId !== 'number' || Number.isNaN(userId)) {
        return sendError(reply, 'Invalid user ID', 400);
      }

      // Only the tournament creator (host) can add participants.
      const tournament = await TournamentService.getTournamentById(tournamentId);
      if (!tournament) return sendError(reply, 'Tournament not found', 404);
      if (tournament.created_by !== request.session.userId) {
        return sendError(reply, 'Only tournament creator can add participants', 403);
      }

      // Accept only IDs from this session: host userId + session.localPlayers (+ bots with <= 0 ids).
      const allowed = getAllowedParticipantIds(request.session as any);
      if (userId > 0 && !allowed.has(userId)) {
        return sendError(reply, 'Participant is not authorized for this session', 403);
      }

      const participant = await ParticipantService.joinTournament(tournamentId, userId, alias, avatarUrl);
      logger.info('User joined tournament', { tournamentId, userId, alias });
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
  }>('/user/:userId/rankings', async (request: FastifyRequest<{
    Params: { userId: string };
  }>, reply: FastifyReply) => {
    if (!request.session || !request.session.userId)
        return console.log('User Rankings'),sendError(reply, "Unauthorized", 401);
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
  }>('/tournaments/user/:userId', async (request: FastifyRequest<{
    Params: { userId: string };
  }>, reply: FastifyReply) => {
    if (!request.session || !request.session.userId)
        return console.log('Tournaments Users'),sendError(reply, "Unauthorized", 401);
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
  }>('/tournaments/participant/:tournamentId', async (request: FastifyRequest<{ Params: { tournamentId: string } }>, reply: FastifyReply) => {
    if (!request.session || !request.session.userId)
        return console.log('Tournaments Participants'),sendError(reply, "Unauthorized", 401);
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