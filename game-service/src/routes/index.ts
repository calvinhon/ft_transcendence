// game-service/src/routes/index.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { handleWebSocketMessage, handleWebSocketClose } from './modules/websocket';
import { getOnlineUsers } from './modules/online-users';
import { db } from './modules/database';
import { GameRecord, GameStats } from './modules/types';

async function gameRoutes(fastify: FastifyInstance): Promise<void> {
  // Chat routes were removed/disabled from this service. If chat is
  // reintroduced later, add the appropriate import and uncomment the
  // initialization call here.

  // WebSocket connection for real-time game
  fastify.get('/ws', { websocket: true }, (connection: SocketStream, req: FastifyRequest) => {
    console.log('=== NEW WEBSOCKET CONNECTION ESTABLISHED ===');
    console.log('Connection from:', req.socket.remoteAddress);

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
    const { userId } = request.params;

    return new Promise<void>((resolve, reject) => {
      db.all(
        `SELECT g.*
         FROM games g
         WHERE g.player1_id = ? OR g.player2_id = ?
         ORDER BY g.started_at DESC
         LIMIT 50`,
        [userId, userId],
        async (err: Error | null, games: GameRecord[]) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            try {
              // Enrich games with player names from user service
              const enrichedGames: GameRecord[] = [];

              console.log(`[GAME-SERVICE] Enriching ${games.length} games for user ${userId}`);

              for (const game of games) {
                const enrichedGame = { ...game };

                console.log(`[GAME-SERVICE] Game ${game.id}:`, {
                  player1_id: game.player1_id,
                  player2_id: game.player2_id,
                  game_mode: game.game_mode,
                  tournament_match_id: (game as any).tournament_match_id
                });

                // Fetch player names from user service
                try {
                  if (game.player1_id) {
                    const player1Response = await fetch(`http://user-service:3000/profile/${game.player1_id}`);
                    if (player1Response.ok) {
                      const player1Data = await player1Response.json() as any;
                      enrichedGame.player1_name = player1Data.display_name || `User${game.player1_id}`;
                    } else {
                      enrichedGame.player1_name = `User${game.player1_id}`;
                    }
                  }

                  if (game.player2_id) {
                    const player2Response = await fetch(`http://user-service:3000/profile/${game.player2_id}`);
                    if (player2Response.ok) {
                      const player2Data = await player2Response.json() as any;
                      enrichedGame.player2_name = player2Data.display_name || `User${game.player2_id}`;
                    } else {
                      enrichedGame.player2_name = `User${game.player2_id}`;
                    }
                  }
                } catch (fetchError) {
                  console.log('Could not fetch player names:', fetchError);
                  enrichedGame.player1_name = `User${game.player1_id}`;
                  enrichedGame.player2_name = `User${game.player2_id}`;
                }

                enrichedGames.push(enrichedGame);
              }

              reply.send(enrichedGames);
              resolve();
            } catch (error) {
              console.error('Error enriching games:', error);
              reply.status(500).send({ error: 'Error fetching game history' });
              reject(error);
            }
          }
        }
      );
    });
  });

  // Get game statistics
  fastify.get<{
    Params: { userId: string };
  }>('/stats/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    return new Promise<void>((resolve, reject) => {
      db.get(
        `SELECT
         COUNT(*) as total_games,
         SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins,
         SUM(CASE WHEN winner_id != ? AND winner_id IS NOT NULL THEN 1 ELSE 0 END) as losses
         FROM games
         WHERE (player1_id = ? OR player2_id = ?) AND status = 'finished'`,
        [userId, userId, userId, userId],
        (err: Error | null, stats: any) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            const gameStats: GameStats = {
              totalGames: stats.total_games || 0,
              wins: stats.wins || 0,
              losses: stats.losses || 0,
              winRate: stats.total_games > 0 ? parseFloat(((stats.wins || 0) / stats.total_games * 100).toFixed(2)) : 0
            };
            reply.send(gameStats);
            resolve();
          }
        }
      );
    });
  });

  // Get currently online users
  fastify.get('/online', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const onlineUsers = getOnlineUsers();
      reply.send(onlineUsers);
    } catch (error) {
      console.error('Error getting online users:', error);
      reply.status(500).send({ error: 'Error fetching online users' });
    }
  });
}

export default gameRoutes;