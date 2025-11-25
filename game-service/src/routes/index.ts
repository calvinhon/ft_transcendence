// game-service/src/routes/index.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { handleWebSocketMessage, handleWebSocketClose } from './modules/websocket';
import { getOnlineUsers } from './modules/online-users';
import { gameHistoryService } from './modules/game-history-service';
import { gameStatsService } from './modules/game-stats-service';
import { logger } from './modules/logger';

async function gameRoutes(fastify: FastifyInstance): Promise<void> {
  // Chat routes were removed/disabled from this service. If chat is
  // reintroduced later, add the appropriate import and uncomment the
  // initialization call here.

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
      reply.send(enrichedGames);
    } catch (error) {
      logger.error('Error fetching game history:', error);
      reply.status(500).send({ error: 'Error fetching game history' });
    }
  });

  // Get game statistics
  fastify.get<{
    Params: { userId: string };
  }>('/stats/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      const stats = await gameStatsService.getGameStats(userId);
      reply.send(stats);
    } catch (error) {
      logger.error('Error fetching game stats:', error);
      reply.status(500).send({ error: 'Error fetching game statistics' });
    }
  });

  // Get currently online users
  fastify.get('/online', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const onlineUsers = getOnlineUsers();
      reply.send(onlineUsers);
    } catch (error) {
      logger.error('Error getting online users:', error);
      reply.status(500).send({ error: 'Error fetching online users' });
    }
  });

  // Health check
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({
      status: 'healthy',
      service: 'game-service',
      timestamp: new Date().toISOString(),
      modules: ['websocket', 'game-history', 'game-stats', 'online-users']
    });
  });
}

export default gameRoutes;