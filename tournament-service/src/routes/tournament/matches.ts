// tournament-service/src/routes/tournament/matches.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MatchService } from '../../services/matchService';
import { MatchResultBody } from '../../types';
import { sendSuccess, sendError, createLogger, requireJWTAuth } from '@ft-transcendence/common';

const logger = createLogger('TOURNAMENT-SERVICE');

export default async function tournamentMatchRoutes(fastify: FastifyInstance): Promise<void> {
  // Submit match result (game-service route)
  fastify.post<{
    Body: MatchResultBody;
  }>('/matches/result', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect match result routes
  }, async (request: FastifyRequest<{
    Body: MatchResultBody;
  }>, reply: FastifyReply) => {
    try {
      const { matchId, winnerId, player1Score, player2Score } = request.body;

      const result = await MatchService.submitMatchResult(matchId, { matchId, winnerId, player1Score, player2Score });
      logger.info('Match result submitted', { matchId, winnerId });
      return sendSuccess(reply, result, 'Match result submitted successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to submit match result', {
        error: err.message,
        body: request.body
      });
      return sendError(reply, err.message || 'Failed to submit match result', 500);
    }
  });

  // Submit match result (tournament-specific route)
  fastify.post<{
    Params: { tournamentId: string; matchId: string };
    Body: MatchResultBody;
  }>('/tournaments/:tournamentId/matches/:matchId/result', {
    preHandler: requireJWTAuth //Hoach edited: Added JWT authentication to protect tournament match result routes
  }, async (request: FastifyRequest<{
    Params: { tournamentId: string; matchId: string };
    Body: MatchResultBody;
  }>, reply: FastifyReply) => {
    try {
      const matchId = parseInt(request.params.matchId);
      const { winnerId, player1Score, player2Score } = request.body;

      if (isNaN(matchId)) {
        return sendError(reply, 'Invalid match ID', 400);
      }

      const result = await MatchService.submitMatchResult(matchId, { matchId, winnerId, player1Score, player2Score });
      logger.info('Match result submitted via tournament route', { matchId, winnerId });
      return sendSuccess(reply, result, 'Match result submitted successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to submit match result via tournament route', {
        error: err.message,
        tournamentId: request.params.tournamentId,
        matchId: request.params.matchId,
        body: request.body
      });
      return sendError(reply, err.message || 'Failed to submit match result', 500);
    }
  });
}