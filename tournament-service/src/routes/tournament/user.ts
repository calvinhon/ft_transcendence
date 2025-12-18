// tournament-service/src/routes/tournament/user.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TournamentService } from '../../services/tournamentService';
import { ParticipantService } from '../../services/participantService';
import { ResponseUtil } from '../../utils/responses';
import { logger } from '../../utils/logger';

export default async function tournamentUserRoutes(fastify: FastifyInstance): Promise<void> {
  console.log('🏆 [USER-ROUTES] Registering user routes...');
  // Get user's tournament count
  // fastify.get<{
  //   Params: { userId: string };
  // }>('/user/:userId/count', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
  //   try {
  //     const userId = parseInt(request.params.userId);
  //     if (isNaN(userId)) {
  //       return ResponseUtil.error(reply, 'Invalid user ID', 400);
  //     }

  //     const count = await TournamentService.getUserTournamentCount(userId);
  //     return ResponseUtil.success(reply, { count }, 'Tournament count retrieved successfully');
  //   } catch (error) {
  //     const err = error as Error;
  //     logger.error('Failed to get user tournament count', { error: err.message, userId: request.params.userId });
  //     return ResponseUtil.error(reply, 'Failed to retrieve tournament count', 500);
  //   }
  // });

  // Legacy tournament creation route (for frontend compatibility)
  fastify.post<{
    Body: { name: string; description?: string; maxParticipants?: number; createdBy: number };
  }>('/tournaments/create', async (request: FastifyRequest<{
    Body: { name: string; description?: string; maxParticipants?: number; createdBy: number };
  }>, reply: FastifyReply) => {
    try {
      const tournament = await TournamentService.createTournament(request.body);
      logger.info('Tournament created via legacy API', { id: tournament.id, name: tournament.name });
      return ResponseUtil.success(reply, tournament, 'Tournament created successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to create tournament via legacy API', { error: err.message, body: request.body });
      return ResponseUtil.error(reply, 'Failed to create tournament', 500);
    }
  });

  // Legacy tournament join route (for frontend compatibility)
  // fastify.post<{
  //   Body: { tournamentId: number; userId: number };
  // }>('/join', async (request: FastifyRequest<{ Body: { tournamentId: number; userId: number } }>, reply: FastifyReply) => {
  //   try {
  //     const { tournamentId, userId } = request.body;

  //     if (!tournamentId || !userId) {
  //       return ResponseUtil.error(reply, 'Tournament ID and user ID required', 400);
  //     }

  //     const participant = await ParticipantService.joinTournament(tournamentId, userId);
  //     logger.info('User joined tournament via legacy API', { tournamentId, userId, participantId: participant.id });
  //     return ResponseUtil.success(reply, { participant }, 'Successfully joined tournament');
  //   } catch (error) {
  //     const err = error as Error;
  //     logger.error('Failed to join tournament via legacy API', { error: err.message, body: request.body });
  //     return ResponseUtil.error(reply, err.message || 'Failed to join tournament', 500);
  //   }
  // });
  
  console.log('🏆 [USER-ROUTES] All user routes registered successfully');
}