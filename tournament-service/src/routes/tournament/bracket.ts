// tournament-service/src/routes/tournament/bracket.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TournamentService } from '../../services/tournamentService';
import { MatchService } from '../../services/matchService';
import { sendSuccess, sendError, createLogger } from '@ft-transcendence/common';

const logger = createLogger('TOURNAMENT-SERVICE');

export default async function tournamentBracketRoutes(fastify: FastifyInstance): Promise<void> {
  // Get tournament bracket
  fastify.get<{
    Params: { tournamentId: string };
  }>('/tournaments/:tournamentId/bracket', async (request: FastifyRequest<{
    Params: { tournamentId: string };
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.tournamentId);

      if (isNaN(tournamentId)) {
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      const details = await TournamentService.getTournamentDetails(tournamentId);
      if (!details) {
        return sendError(reply, 'Tournament not found', 404);
      }

      return sendSuccess(reply, details.bracket, 'Bracket retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get tournament bracket', {
        error: err.message,
        tournamentId: request.params.tournamentId
      });
      return sendError(reply, 'Failed to retrieve bracket', 500);
    }
  });

  // Get tournament bracket visualization
  fastify.get<{
    Params: { tournamentId: string };
  }>('/tournaments/:tournamentId/bracket/visualization', async (request: FastifyRequest<{
    Params: { tournamentId: string };
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.tournamentId);

      if (isNaN(tournamentId)) {
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      const details = await TournamentService.getTournamentDetails(tournamentId);
      if (!details) {
        return sendError(reply, 'Tournament not found', 404);
      }

      // Return full tournament details for visualization
      return sendSuccess(reply, details, 'Bracket visualization retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get bracket visualization', {
        error: err.message,
        tournamentId: request.params.tournamentId
      });
      return sendError(reply, 'Failed to retrieve bracket visualization', 500);
    }
  });

  // Get current round bracket
  fastify.get<{
    Params: { tournamentId: string };
  }>('/tournaments/:tournamentId/bracket/current-round', async (request: FastifyRequest<{
    Params: { tournamentId: string };
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.tournamentId);

      if (isNaN(tournamentId)) {
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      const pendingMatches = await MatchService.getPendingMatches(tournamentId);
      if (pendingMatches.length === 0) {
        return sendSuccess(reply, { currentRound: null, matches: [] }, 'Tournament completed');
      }

      const currentRound = Math.min(...pendingMatches.map(m => m.round));
      const currentRoundMatches = pendingMatches.filter(m => m.round === currentRound);

      return sendSuccess(reply, {
        currentRound,
        matches: currentRoundMatches
      }, 'Current round bracket retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get current round bracket', {
        error: err.message,
        tournamentId: request.params.tournamentId
      });
      return sendError(reply, 'Failed to retrieve current round bracket', 500);
    }
  });
}