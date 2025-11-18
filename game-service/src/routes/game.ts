// game-service/src/routes/game.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import * as WebSocket from 'ws';
import { GamePlayer, GameSettings } from '../types.js';
import { PongGame, onlineUsers, activeGames, db } from '../game-logic.js';

// Routes
async function gameRoutes(fastify: FastifyInstance): Promise<void> {
  // WebSocket endpoint
  fastify.get('/ws', { websocket: true }, (connection: SocketStream) => {
    connection.socket.on('message', (message: WebSocket.RawData) => {
      try {
        const data = JSON.parse(message.toString());
        switch (data.type) {
          case 'userConnect':
            if (!onlineUsers.has(data.userId)) onlineUsers.set(data.userId, new Set());
            onlineUsers.get(data.userId)!.add(connection.socket);
            if (data.gameMode) handleJoinBotGame(connection.socket, data);
            else connection.socket.send(JSON.stringify({ type: 'connectionAck' }));
            break;
          case 'joinBotGame': handleJoinBotGame(connection.socket, data); break;
          case 'movePaddle': handleMovePaddle(connection.socket, data); break;
          case 'pause': handlePauseGame(connection.socket, data); break;
        }
      } catch (e) { console.error('WebSocket error:', e); }
    });
    connection.socket.on('close', () => handleDisconnect(connection.socket));
  });

  // Helper functions
  function handleJoinBotGame(socket: WebSocket, data: any) {
    const player1: GamePlayer = { userId: data.userId, username: data.username, socket };
    const player2: GamePlayer = data.player2Id ? { userId: data.player2Id, username: data.player2Name, socket: { readyState: WebSocket.OPEN, send: () => {} } as any }
                                              : { userId: 0, username: 'Bot', socket: { readyState: WebSocket.OPEN, send: () => {} } as any };
    db.run('INSERT INTO games (player1_id, player2_id, game_mode) VALUES (?, ?, ?)', [player1.userId, player2.userId, data.gameSettings?.gameMode || 'coop'],
           function(err: Error | null) {
             if (!err) {
               const game = new PongGame(player1, player2, this.lastID, data.gameSettings);
               activeGames.set(this.lastID, game);
               const startMsg = { type: 'gameStart', gameId: this.lastID, players: { player1: { userId: player1.userId, username: player1.username }, player2: { userId: player2.userId, username: player2.username } }, gameSettings: data.gameSettings };
               socket.send(JSON.stringify(startMsg));
               setTimeout(() => game.broadcastGameState(), 100);
             }
           });
  }

  function handleMovePaddle(socket: WebSocket, data: any) {
    for (const [_, game] of activeGames) {
      if (game.player1.socket === socket || game.player2.socket === socket) {
        game.movePaddle(data.playerId || (game.player1.socket === socket ? game.player1.userId : game.player2.userId), data.direction, data.paddleIndex);
        break;
      }
    }
  }

  function handlePauseGame(socket: WebSocket, data: any) {
    for (const [_, game] of activeGames) {
      if (game.player1.socket === socket || game.player2.socket === socket) {
        if (data.paused !== undefined) data.paused ? game.isPaused = true : game.isPaused = false;
        else game.isPaused = !game.isPaused;
        break;
      }
    }
  }

  function handleDisconnect(socket: WebSocket) {
    for (const [userId, sockets] of onlineUsers) {
      if (sockets.has(socket)) {
        sockets.delete(socket);
        if (sockets.size === 0) onlineUsers.delete(userId);
        break;
      }
    }
    for (const [_, game] of activeGames) {
      if (game.player1.socket === socket || game.player2.socket === socket) {
        game.endGame();
        break;
      }
    }
  }

  // API endpoints
  fastify.get('/history/:userId', async (req: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    db.all('SELECT * FROM games WHERE player1_id=? OR player2_id=? ORDER BY started_at DESC LIMIT 50', [req.params.userId, req.params.userId], (err: Error | null, games: any[]) => {
      if (err) reply.status(500).send({ error: 'Database error' });
      else reply.send(games);
    });
  });

  fastify.get('/stats/:userId', async (req: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    db.get('SELECT COUNT(*) as total, SUM(CASE WHEN winner_id=? THEN 1 ELSE 0 END) as wins FROM games WHERE (player1_id=? OR player2_id=?) AND status="finished"',
           [req.params.userId, req.params.userId, req.params.userId], (err: Error | null, stats: any) => {
      if (err) reply.status(500).send({ error: 'Database error' });
      else reply.send({ totalGames: stats.total || 0, wins: stats.wins || 0, losses: (stats.total || 0) - (stats.wins || 0), winRate: stats.total ? ((stats.wins || 0) / stats.total * 100) : 0 });
    });
  });

  fastify.get('/online', async (req: FastifyRequest, reply: FastifyReply) => {
    const users = Array.from(onlineUsers.keys()).map(id => ({ user_id: id, username: `User${id}`, status: 'online', last_seen: new Date().toISOString(), is_bot: false }));
    const bots = [{ user_id: 'bot_easy', username: 'EasyBot', status: 'online', last_seen: new Date().toISOString(), is_bot: true },
                  { user_id: 'bot_medium', username: 'MediumBot', status: 'online', last_seen: new Date().toISOString(), is_bot: true },
                  { user_id: 'bot_hard', username: 'HardBot', status: 'online', last_seen: new Date().toISOString(), is_bot: true }];
    reply.send([...users, ...bots]);
  });
}

export default gameRoutes;
