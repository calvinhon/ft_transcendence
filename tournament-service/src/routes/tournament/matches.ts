// tournament-service/src/routes/tournament/matches.ts
import axios from 'axios';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MatchService } from '../../services/matchService';
import { MatchResultBody } from '../../types';
import { sendSuccess, sendError, createLogger } from '@ft-transcendence/common';

const logger = createLogger('TOURNAMENT-SERVICE');

let serverSecret: string | null = null;

async function getServerSecret(): Promise<string | null> {
  if (serverSecret) return serverSecret;
  try {
    const response = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Server_Session`, {
      headers: { 'X-Vault-Token': process.env.VAULT_TOKEN }
    });
    serverSecret = response?.data?.data?.data?.Secret ?? null;
    if (!serverSecret) {
      logger.warn('Vault Server_Session secret missing Secret field');
      return null;
    }
    logger.info('Successfully retrieved server secret.');
    return serverSecret;
  } catch (err: any) {
    logger.warn('Error retrieving server secret from Vault', { error: err?.message });
    return null;
  }
}

async function isAuthorized(request: FastifyRequest): Promise<boolean> {
  if (request.session && request.session.userId) return true;
  const headerSecret = request.headers['x-microservice-secret'];
  if (typeof headerSecret !== 'string' || !headerSecret) return false;
  const expected = await getServerSecret();
  return !!expected && headerSecret === expected;
}

export default async function tournamentMatchRoutes(fastify: FastifyInstance): Promise<void> {
  // Submit match result (game-service route)
  fastify.post<{
    Body: MatchResultBody;
  }>('/matches/result', async (request: FastifyRequest<{
    Body: MatchResultBody;
  }>, reply: FastifyReply) => {
    if (!(await isAuthorized(request))) return sendError(reply, 'Unauthorized', 401);
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
  }>('/tournaments/:tournamentId/matches/:matchId/result', async (request: FastifyRequest<{
    Params: { tournamentId: string; matchId: string };
    Body: MatchResultBody;
  }>, reply: FastifyReply) => {
    if (!(await isAuthorized(request))) return sendError(reply, 'Unauthorized', 401);
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