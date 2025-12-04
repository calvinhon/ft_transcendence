// tournament-service/src/routes/tournament/matches.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MatchService } from '../../services/matchService';
import { MatchResultBody } from '../../types';
import { ResponseUtil } from '../../utils/responses';
import { logger } from '../../utils/logger';

export default async function tournamentMatchRoutes(fastify: FastifyInstance): Promise<void> {
  // Get tournament matches
  fastify.get<{
    Params: { tournamentId: string };
  }>('/tournaments/:tournamentId/matches', async (request: FastifyRequest<{
    Params: { tournamentId: string };
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.tournamentId);

      if (isNaN(tournamentId)) {
        return ResponseUtil.error(reply, 'Invalid tournament ID', 400);
      }

      const matches = await MatchService.getMatchesByRound(tournamentId);
      return ResponseUtil.success(reply, matches, 'Matches retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get tournament matches', {
        error: err.message,
        tournamentId: request.params.tournamentId
      });
      return ResponseUtil.error(reply, 'Failed to retrieve matches', 500);
    }
  });

  // Get match by ID
  fastify.get<{
    Params: { matchId: string };
  }>('/matches/:matchId', async (request: FastifyRequest<{
    Params: { matchId: string };
  }>, reply: FastifyReply) => {
    try {
      const matchId = parseInt(request.params.matchId);

      if (isNaN(matchId)) {
        return ResponseUtil.error(reply, 'Invalid match ID', 400);
      }

      const match = await MatchService.getMatchById(matchId);
      if (!match) {
        return ResponseUtil.error(reply, 'Match not found', 404);
      }

      return ResponseUtil.success(reply, match, 'Match retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get match', {
        error: err.message,
        matchId: request.params.matchId
      });
      return ResponseUtil.error(reply, 'Failed to retrieve match', 500);
    }
  });

  // Submit match result
  fastify.post<{
    Body: MatchResultBody;
  }>('/matches/result', async (request: FastifyRequest<{
    Body: MatchResultBody;
  }>, reply: FastifyReply) => {
    try {
      const { matchId, winnerId, player1Score, player2Score } = request.body;

      const result = await MatchService.submitMatchResult(matchId, { matchId, winnerId, player1Score, player2Score });
      logger.info('Match result submitted', { matchId, winnerId });
      return ResponseUtil.success(reply, result, 'Match result submitted successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to submit match result', {
        error: err.message,
        body: request.body
      });
      return ResponseUtil.error(reply, err.message || 'Failed to submit match result', 500);
    }
  });

  // Legacy match result route (for backward compatibility)
  fastify.put<{
    Params: { matchId: string };
    Body: { winnerId: number; player1Score: number; player2Score: number };
  }>('/matches/:matchId/result', async (request: FastifyRequest<{
    Params: { matchId: string };
    Body: { winnerId: number; player1Score: number; player2Score: number };
  }>, reply: FastifyReply) => {
    try {
      const matchId = parseInt(request.params.matchId);
      const { winnerId, player1Score, player2Score } = request.body;

      if (isNaN(matchId)) {
        return ResponseUtil.error(reply, 'Invalid match ID', 400);
      }

      const result = await MatchService.submitMatchResult(matchId, { matchId, winnerId, player1Score, player2Score });
      logger.info('Match result submitted via legacy API', { matchId, winnerId });
      return ResponseUtil.success(reply, result, 'Match result submitted successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to submit match result via legacy API', {
        error: err.message,
        matchId: request.params.matchId,
        body: request.body
      });
      return ResponseUtil.error(reply, err.message || 'Failed to submit match result', 500);
    }
  });

  // Submit match result (tournament-specific route)
  fastify.post<{
    Params: { tournamentId: string; matchId: string };
    Body: MatchResultBody;
  }>('/tournaments/:tournamentId/matches/:matchId/result', async (request: FastifyRequest<{
    Params: { tournamentId: string; matchId: string };
    Body: MatchResultBody;
  }>, reply: FastifyReply) => {
    try {
      const matchId = parseInt(request.params.matchId);
      const { winnerId, player1Score, player2Score } = request.body;

      if (isNaN(matchId)) {
        return ResponseUtil.error(reply, 'Invalid match ID', 400);
      }

      const result = await MatchService.submitMatchResult(matchId, { matchId, winnerId, player1Score, player2Score });
      logger.info('Match result submitted via tournament route', { matchId, winnerId });
      return ResponseUtil.success(reply, result, 'Match result submitted successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to submit match result via tournament route', {
        error: err.message,
        tournamentId: request.params.tournamentId,
        matchId: request.params.matchId,
        body: request.body
      });
      return ResponseUtil.error(reply, err.message || 'Failed to submit match result', 500);
    }
  });
}