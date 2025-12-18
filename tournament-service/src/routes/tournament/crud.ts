// tournament-service/src/routes/tournament/crud.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TournamentService } from '../../services/tournamentService';
import { CreateTournamentBody, TournamentQuery } from '../../types';
import { ResponseUtil } from '../../utils/responses';
import { logger } from '../../utils/logger';

export default async function tournamentCrudRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all tournaments
  fastify.get<{
    Querystring: TournamentQuery;
  }>('/tournaments', async (request: FastifyRequest<{ Querystring: TournamentQuery }>, reply: FastifyReply) => {
    try {
      const page = parseInt(request.query.page || '1');
      const limit = parseInt(request.query.limit || '10');
      const status = request.query.status;

      const result = await TournamentService.getTournaments(page, limit, status);
      // Return tournaments array directly for frontend compatibility
      reply.send(result.tournaments);
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get tournaments', { error: err.message, query: request.query });
      return ResponseUtil.error(reply, 'Failed to retrieve tournaments', 500);
    }
  });

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

      // Return details directly for frontend compatibility
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

  // Record tournament result on blockchain
  fastify.post<{
    Body: { tournamentId: number; winnerId: number };
  }>('/blockchain/record', async (request: FastifyRequest<{ Body: { tournamentId: number; winnerId: number } }>, reply: FastifyReply) => {
    try {
      const { tournamentId, winnerId } = request.body;

      if (!tournamentId || !winnerId) {
        return ResponseUtil.error(reply, 'Tournament ID and winner ID required', 400);
      }

      // Get tournament details
      const tournament = await TournamentService.getTournamentById(tournamentId);
      if (!tournament || tournament.status !== 'finished') {
        return ResponseUtil.error(reply, 'Finished tournament not found', 404);
      }

      // Get all participants with their final rankings
      const participants = await TournamentService.getTournamentParticipants(tournamentId);
      const rankingsForBlockchain = participants.map(p => ({
        userId: p.user_id,
        rank: p.final_rank || (p.user_id === winnerId ? 1 : 2)
      }));

      // Import blockchain functions
      const { recordRank, isBlockchainAvailable } = await import('../../blockchain');

      // Check if blockchain is available
      const blockchainAvailable = await isBlockchainAvailable();
      if (!blockchainAvailable) {
        return ResponseUtil.error(reply, 'Blockchain service unavailable', 503);
      }

      // Record on blockchain
      const txHash = await recordRank(tournamentId, rankingsForBlockchain[0].userId, rankingsForBlockchain[0].rank);

      logger.info('Tournament recorded on blockchain', { tournamentId, winnerId, txHash });
      return ResponseUtil.success(reply, {
        message: 'Tournament recorded on blockchain successfully',
        transactionHash: txHash,
        participants: participants.length,
        winner: winnerId
      }, 'Tournament recorded on blockchain successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Blockchain recording failed', { error: err.message, body: request.body });
      return ResponseUtil.error(reply, 'Blockchain recording failed', 500);
    }
  });

  // Legacy start tournament route (for backward compatibility)
  fastify.post<{
    Params: { tournamentId: string };
  }>('/start/:tournamentId', async (request: FastifyRequest<{
    Params: { tournamentId: string };
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.tournamentId);

      if (isNaN(tournamentId)) {
        return ResponseUtil.error(reply, 'Invalid tournament ID', 400);
      }

      const tournament = await TournamentService.startTournament(tournamentId);
      logger.info('Tournament started via legacy route', { tournamentId });
      return ResponseUtil.success(reply, tournament, 'Tournament started successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to start tournament via legacy route', {
        error: err.message,
        tournamentId: request.params.tournamentId
      });
      return ResponseUtil.error(reply, err.message || 'Failed to start tournament', 500);
    }
  });

  // Legacy get tournament details route (for backward compatibility)
  fastify.get<{
    Params: { tournamentId: string };
  }>('/details/:tournamentId', async (request: FastifyRequest<{
    Params: { tournamentId: string };
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.tournamentId);

      if (isNaN(tournamentId)) {
        return ResponseUtil.error(reply, 'Invalid tournament ID', 400);
      }

      const details = await TournamentService.getTournamentDetails(tournamentId);
      if (!details) {
        return ResponseUtil.error(reply, 'Tournament not found', 404);
      }

      return ResponseUtil.success(reply, details, 'Tournament details retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get tournament details via legacy route', {
        error: err.message,
        tournamentId: request.params.tournamentId
      });
      return ResponseUtil.error(reply, 'Failed to retrieve tournament details', 500);
    }
  });

  // Health check
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return ResponseUtil.success(reply, {
      status: 'healthy',
      service: 'tournament-service',
      timestamp: new Date().toISOString(),
      modules: ['tournaments', 'matches', 'participants', 'bracket']
    }, 'Service is healthy');
  });
}