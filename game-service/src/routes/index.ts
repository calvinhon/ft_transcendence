// game-service/src/routes/index.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { handleWebSocketMessage, handleWebSocketClose } from './modules/websocket';
import { gameHistoryService } from './modules/game-history-service';
import { gameStatsService } from './modules/game-stats-service';
import { sendSuccess, sendError, sendHealthCheck, createLogger } from '@ft-transcendence/common';
import { onlineUsers } from './modules/online-users';

const logger = createLogger('GAME-SERVICE');

async function gameRoutes(fastify: FastifyInstance): Promise<void> {

  // WebSocket connection for real-time game
  fastify.get('/ws', { websocket: true }, (connection: SocketStream, req: FastifyRequest) => {
    logger.info('=== NEW WEBSOCKET CONNECTION ESTABLISHED ===');
    logger.info('Connection from:', req.socket.remoteAddress);

    connection.socket.on('message', async (message: Buffer | string) => {
      handleWebSocketMessage(connection.socket, message);
    });

    connection.socket.on('close', () => {
      handleWebSocketClose(connection.socket);
    });
  });

  // Get game history
  fastify.get<{
    Params: { userId: string };
  }>('/history/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      const games = await gameHistoryService.getGameHistory(userId);
      const enrichedGames = await gameHistoryService.enrichGamesWithPlayerNames(games);
      sendSuccess(reply, enrichedGames);
    } catch (error) {
      logger.error('Error fetching game history:', error);
      sendError(reply, 'Error fetching game history', 500);
    }
  });

  // Get single game details
  fastify.get<{
    Params: { gameId: string };
  }>('/:gameId', async (request: FastifyRequest<{ Params: { gameId: string } }>, reply: FastifyReply) => {
    try {
      const { gameId } = request.params;
      const game = await gameHistoryService.getGameDetails(parseInt(gameId));

      if (!game) {
        return sendError(reply, 'Game not found', 404);
      }

      const enrichedGame = await gameHistoryService.enrichGameWithPlayerNames(game);
      sendSuccess(reply, enrichedGame);
    } catch (error) {
      logger.error('Error fetching game details:', error);
      sendError(reply, 'Error fetching game details', 500);
    }
  });

  // Get game events
  fastify.get<{
    Params: { gameId: string };
  }>('/:gameId/events', async (request: FastifyRequest<{ Params: { gameId: string } }>, reply: FastifyReply) => {
    try {
      const { gameId } = request.params;
      const events = await gameHistoryService.getGameEvents(parseInt(gameId));
      sendSuccess(reply, events);
    } catch (error) {
      logger.error('Error fetching game events:', error);
      sendError(reply, 'Error fetching game events', 500);
    }
  });

  // Save game result
  fastify.post('/save', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      logger.info('Saving game result:', body);

      // Extract data from request - handle various formats
      // Frontend sends team1: [id, id] (array of numbers) OR team1: [{userId: id}]
      const getFirstId = (team: any[]) => {
        if (!team || !team.length) return 0;
        if (typeof team[0] === 'number') return team[0];
        return team[0].userId || 0;
      };

      const p1FirstId = getFirstId(body.team1);
      const p2FirstId = getFirstId(body.team2);

      const player1Id = body.player1Id || p1FirstId || 0;
      const player2Id = body.player2Id || p2FirstId || 0;

      const player1Score = body.winnerScore ?? body.score1 ?? 0;
      const player2Score = body.loserScore ?? body.score2 ?? 0;

      // If winnerId is provided, use it. Otherwise compute from scores.
      const winnerId = body.winnerId || (player1Score > player2Score ? player1Id : player2Id);
      const gameMode = body.gameMode || body.mode || 'arcade';

      // Save to database
      const result = await gameHistoryService.saveGame({
        player1Id,
        player2Id,
        player1Score,
        player2Score,
        winnerId,
        gameMode,
        team1Players: body.team1 ? JSON.stringify(body.team1) : undefined,
        team2Players: body.team2 ? JSON.stringify(body.team2) : undefined,
        tournamentId: body.tournamentId,
        tournamentMatchId: body.tournamentMatchId,
        skipTournamentNotification: body.skipTournamentNotification, // Pass flag to prevent duplicate updates
      });

      sendSuccess(reply, { saved: true, gameId: result.gameId });
    } catch (error) {
      logger.error('Error saving game result:', error);
      sendError(reply, 'Error saving game result', 500);
    }
  });

  // Get game statistics
  fastify.get<{
    Params: { userId: string };
  }>('/stats/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      const stats = await gameStatsService.getGameStats(userId);
      sendSuccess(reply, stats);
    } catch (error) {
      logger.error('Error fetching game stats:', error);
      sendError(reply, 'Error fetching game statistics', 500);
    }
  });

  // Get currently online users
  fastify.get('/online', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Map keys to array of objects
      const users: any[] = [];
      for (const [id, data] of onlineUsers.entries()) {
        users.push({ userId: id, username: data.username });
      }
      sendSuccess(reply, users);
    } catch (error) {
      logger.error('Error getting online users:', error);
      sendError(reply, 'Error fetching online users', 500);
    }
  });




}

export default gameRoutes;