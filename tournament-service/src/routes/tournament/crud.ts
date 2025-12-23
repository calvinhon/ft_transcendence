// tournament-service/src/routes/tournament/crud.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TournamentService } from '../../services/tournamentService';
import { CreateTournamentBody, TournamentQuery } from '../../types';
import { sendSuccess, sendError, sendHealthCheck, createLogger } from '@ft-transcendence/common';

const logger = createLogger('TOURNAMENT-SERVICE');

export default async function tournamentCrudRoutes(fastify: FastifyInstance): Promise<void> {
  // Create tournament
  fastify.post<{
    Body: CreateTournamentBody;
  }>('/tournaments', async (request: FastifyRequest<{ Body: CreateTournamentBody }>, reply: FastifyReply) => {
    try {
      const tournament = await TournamentService.createTournament(request.body);
      logger.info('Tournament created via API', { id: tournament.id, name: tournament.name });
      return sendSuccess(reply, tournament, 'Tournament created successfully', 201);
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to create tournament', { error: err.message, body: request.body });
      return sendError(reply, 'Failed to create tournament', 500);
    }
  });

  // Legacy create tournament route (for backward compatibility)
  fastify.post<{
    Body: CreateTournamentBody;
  }>('/create', async (request: FastifyRequest<{ Body: CreateTournamentBody }>, reply: FastifyReply) => {
    try {
      const tournament = await TournamentService.createTournament(request.body);
      logger.info('Tournament created via legacy API', { id: tournament.id, name: tournament.name });
      return sendSuccess(reply, { id: tournament.id }, 'Tournament created successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to create tournament via legacy API', { error: err.message, body: request.body });
      return sendError(reply, 'Failed to create tournament', 500);
    }
  });

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
      return sendError(reply, 'Failed to retrieve tournaments', 500);
    }
  });

  // Get tournament by ID
  fastify.get<{
    Params: { id: string };
  }>('/tournaments/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      const details = await TournamentService.getTournamentDetails(id);
      if (!details) {
        return sendError(reply, 'Tournament not found', 404);
      }

      // Return details directly for frontend compatibility
      reply.send(details);
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get tournament', { error: err.message, id: request.params.id });
      return sendError(reply, 'Failed to retrieve tournament', 500);
    }
  });

  // Update tournament
  fastify.put<{
    Params: { id: string };
    Body: Partial<CreateTournamentBody>;
  }>('/tournaments/:id', async (request: FastifyRequest<{
    Params: { id: string };
    Body: Partial<CreateTournamentBody>;
  }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      const tournament = await TournamentService.updateTournament(id, request.body);
      if (!tournament) {
        return sendError(reply, 'Tournament not found', 404);
      }

      return sendSuccess(reply, tournament, 'Tournament updated successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to update tournament', { error: err.message, id: request.params.id, body: request.body });
      return sendError(reply, err.message || 'Failed to update tournament', 500);
    }
  });

  // Delete tournament
  fastify.delete<{
    Params: { id: string };
  }>('/tournaments/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      if (isNaN(id)) {
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      const deleted = await TournamentService.deleteTournament(id);
      if (!deleted) {
        return sendError(reply, 'Tournament not found', 404);
      }

      return sendSuccess(reply, null, 'Tournament deleted successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to delete tournament', { error: err.message, id: request.params.id });
      return sendError(reply, err.message || 'Failed to delete tournament', 500);
    }
  });

  // Update tournament status (start)
  fastify.put<{
    Params: { id: string };
    Body: { action: 'start'; startedBy: number };
  }>('/tournaments/:id/status', async (request: FastifyRequest<{
    Params: { id: string };
    Body: { action: 'start'; startedBy: number };
  }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      const { action, startedBy } = request.body;

      if (isNaN(id)) {
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      if (action === 'start') {
        const tournament = await TournamentService.startTournament(id, startedBy);
        if (!tournament) {
          return sendError(reply, 'Tournament not found or cannot be started', 404);
        }
        logger.info('Tournament started', { id });
        return sendSuccess(reply, tournament, 'Tournament started successfully');
      } else {
        return sendError(reply, 'Invalid action. Use "start"', 400);
      }
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to update tournament status', {
        error: err.message,
        id: request.params.id,
        action: request.body.action
      });
      return sendError(reply, err.message || 'Failed to update tournament status', 500);
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
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      const tournament = await TournamentService.startTournament(tournamentId);
      logger.info('Tournament started via specific route', { tournamentId });
      return sendSuccess(reply, tournament, 'Tournament started successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to start tournament', {
        error: err.message,
        tournamentId: request.params.tournamentId
      });
      return sendError(reply, err.message || 'Failed to start tournament', 500);
    }
  });

  // Record tournament result on blockchain
  fastify.post<{
    Body: { tournamentId: number; winnerId: number };
  }>('/blockchain/record', async (request: FastifyRequest<{ Body: { tournamentId: number; winnerId: number } }>, reply: FastifyReply) => {
    try {
      const { tournamentId, winnerId } = request.body;

      if (!tournamentId || !winnerId) {
        return sendError(reply, 'Tournament ID and winner ID required', 400);
      }

      // Get tournament details
      const tournament = await TournamentService.getTournamentById(tournamentId);
      if (!tournament || tournament.status !== 'finished') {
        return sendError(reply, 'Finished tournament not found', 404);
      }

      // Get all participants with their final rankings
      const participants = await TournamentService.getTournamentParticipants(tournamentId);
      const rankingsForBlockchain = participants.map(p => ({
        userId: p.user_id,
        rank: p.final_rank || (p.user_id === winnerId ? 1 : 2)
      }));

      // Import blockchain functions
      const { recordTournamentOnBlockchain, isBlockchainAvailable } = await import('../../blockchain');

      // Check if blockchain is available
      const blockchainAvailable = await isBlockchainAvailable();
      if (!blockchainAvailable) {
        return sendError(reply, 'Blockchain service unavailable', 503);
      }

      // Record on blockchain
      const txHash = await recordTournamentOnBlockchain(tournamentId, rankingsForBlockchain);

      logger.info('Tournament recorded on blockchain', { tournamentId, winnerId, txHash });
      return sendSuccess(reply, {
        message: 'Tournament recorded on blockchain successfully',
        transactionHash: txHash,
        participants: participants.length,
        winner: winnerId
      }, 'Tournament recorded on blockchain successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Blockchain recording failed', { error: err.message, body: request.body });
      return sendError(reply, 'Blockchain recording failed', 500);
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
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      const tournament = await TournamentService.startTournament(tournamentId);
      logger.info('Tournament started via legacy route', { tournamentId });
      return sendSuccess(reply, tournament, 'Tournament started successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to start tournament via legacy route', {
        error: err.message,
        tournamentId: request.params.tournamentId
      });
      return sendError(reply, err.message || 'Failed to start tournament', 500);
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
        return sendError(reply, 'Invalid tournament ID', 400);
      }

      const details = await TournamentService.getTournamentDetails(tournamentId);
      if (!details) {
        return sendError(reply, 'Tournament not found', 404);
      }

      return sendSuccess(reply, details, 'Tournament details retrieved successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get tournament details via legacy route', {
        error: err.message,
        tournamentId: request.params.tournamentId
      });
      return sendError(reply, 'Failed to retrieve tournament details', 500);
    }
  });

}
