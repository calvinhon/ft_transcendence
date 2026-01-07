// game-service/src/routes/modules/websocket.ts
import { WebSocketMessage, JoinGameMessage, MovePaddleMessage, InputMessage } from './types';
import { addOnlineUser } from './online-users';
import { matchmakingService } from './matchmaking-service';
import { GameHandlers } from './game-handlers';
import { logger } from './logger';
// cleaned up

export function handleWebSocketMessage(socket: any, message: Buffer | string): void {
  try {
    const data = JSON.parse(message.toString()) as WebSocketMessage;
    // logger.ws('Received WebSocket message:', data.type); // Reduce noise

    switch (data.type) {
      case 'userConnect':
        handleUserConnect(socket, data);
        break;
      case 'joinGame':
        logger.ws('Processing joinGame');
        matchmakingService.handleJoinGame(socket, data as JoinGameMessage);
        break;
      case 'joinBotGame':
        logger.ws('Processing joinBotGame');
        matchmakingService.handleJoinBotGame(socket, data as JoinGameMessage);
        break;
      case 'movePaddle':
        // logger.ws('Processing movePaddle'); // Very noisy
        GameHandlers.handleMovePaddle(socket, data as MovePaddleMessage);
        break;
      case 'input':
        // logger.ws('Processing input'); // Noisy
        GameHandlers.handleInput(socket, data as InputMessage);
        break;
      case 'pause':
        logger.ws('Processing pause');
        GameHandlers.handlePauseGame(socket, data);
        break;
      case 'disconnect':
        logger.ws('Processing disconnect');
        matchmakingService.handleDisconnect(socket);
        break;
      default:
        logger.ws('Unknown message type:', data.type);
    }
  } catch (error) {
    logger.error('WebSocket message error:', error);
  }
}

function handleUserConnect(socket: any, data: any): void {
  logger.ws(`Processing userConnect for ${data.username} (${data.userId})`);
  // Track user as online when they connect with authentication
  addOnlineUser(data.userId, data.username, socket);

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
      team2PlayerCount: data.team2PlayerCount || 1,
      // Tournament-specific fields for score swapping
      tournamentId: data.tournamentId,
      tournamentMatchId: data.tournamentMatchId,
      tournamentPlayer1Id: data.tournamentPlayer1Id
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
      message: 'You are now tracked as online'
    }));
  }
}

export function handleWebSocketClose(socket: any): void {
  matchmakingService.handleDisconnect(socket);

  // Remove from FriendService online tracking
  if ((socket as any).userId) {
    // activeConnections usage removed
    logger.ws(`User ${(socket as any).userId} disconnected (cleaned up)`);
    logger.ws(`User ${(socket as any).userId} disconnected (cleaned up)`);
  }
}