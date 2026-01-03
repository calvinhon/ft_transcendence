// game-service/src/routes/modules/websocket.ts
import { WebSocketMessage, JoinGameMessage, MovePaddleMessage } from './types';
import { matchmakingService } from './matchmaking-service';
import { GameHandlers } from './game-handlers';
import { createLogger } from '@ft-transcendence/common';
import { activeConnections, onlineUsers } from './friend-service';

const logger = createLogger('GAME-SERVICE');

export function handleWebSocketMessage(socket: any, message: Buffer | string): void {
  try {
    const data = JSON.parse(message.toString()) as WebSocketMessage;
    // logger.debug('Received WebSocket message:', data.type); // Reduce noise

    switch (data.type) {
      case 'userConnect':
        handleUserConnect(socket, data);
        break;
      case 'joinGame':
        logger.debug('Processing joinGame');
        matchmakingService.handleJoinGame(socket, data as JoinGameMessage);
        break;
      case 'joinBotGame':
        logger.debug('Processing joinBotGame');
        matchmakingService.handleJoinBotGame(socket, data as JoinGameMessage);
        break;
      case 'movePaddle':
        // logger.debug('Processing movePaddle'); // Very noisy
        GameHandlers.handleMovePaddle(socket, data as MovePaddleMessage);
        break;
      case 'pause':
        logger.debug('Processing pause');
        GameHandlers.handlePauseGame(socket, data);
        break;
      case 'disconnect':
        logger.debug('Processing disconnect');
        matchmakingService.handleDisconnect(socket);
        break;
      default:
        logger.debug(`Unknown message type: ${data.type}`);
    }
  } catch (error) {
    logger.error('WebSocket message error:', error);
  }
}

function handleUserConnect(socket: any, data: any): void {
  logger.info(`Processing userConnect for ${data.username} (${data.userId})`);

  // Track in FriendService for online status checks
  activeConnections.add(data.userId);
  onlineUsers.set(data.userId, { username: data.username });

  // Store userId on socket object for cleanup on close
  (socket as any).userId = data.userId;

  // Check if this is a game mode request (arcade or campaign)
  if (data.gameMode) {
    logger.info('Game mode detected:', data.gameMode);

    // Prepare game settings
    const gameSettings = {
      gameMode: data.gameMode || 'arcade',
      aiDifficulty: data.aiDifficulty || 'medium',
      ballSpeed: data.ballSpeed || 'medium',
      paddleSpeed: data.paddleSpeed || 'medium',
      powerupsEnabled: data.powerupsEnabled || false,
      accelerateOnHit: data.accelerateOnHit || false,
      scoreToWin: data.scoreToWin || 5,
      team1PlayerCount: data.team1PlayerCount || 1,
      team2PlayerCount: data.team2PlayerCount || 1
    };

    logger.info('Starting game with settings:', gameSettings);
    logger.info('Team 1 players:', data.team1Players);
    logger.info('Team 2 players:', data.team2Players);

    // Start the bot game directly with team player data
    matchmakingService.handleJoinBotGame(socket, {
      type: 'joinBotGame',
      userId: data.userId,
      username: data.username,
      gameSettings: gameSettings,
      team1Players: data.team1Players,
      team2Players: data.team2Players
    });
  } else {
    // Just acknowledge connection
    socket.send(JSON.stringify({
      type: 'connectionAck',
      message: 'WebSocket connection established'
    }));
  }
}

export function handleWebSocketClose(socket: any): void {
  matchmakingService.handleDisconnect(socket);

  // Remove from FriendService online tracking
  if ((socket as any).userId) {
    const userId = (socket as any).userId;
    activeConnections.delete(userId);
    onlineUsers.delete(userId);
    logger.debug(`User ${userId} disconnected (cleaned up)`);
  }
}