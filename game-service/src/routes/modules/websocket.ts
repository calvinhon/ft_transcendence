// game-service/src/routes/modules/websocket.ts
import { WebSocketMessage, JoinGameMessage, MovePaddleMessage } from './types';
import { addOnlineUser, removeOnlineUser } from './online-users';
import { handleJoinGame, handleJoinBotGame, handleDisconnect } from './matchmaking';
import { activeGames } from './game-logic';
import { logger } from './logger';

export function handleWebSocketMessage(socket: any, message: Buffer | string): void {
  try {
    const data = JSON.parse(message.toString()) as WebSocketMessage;
    logger.ws('Received WebSocket message:', data);
    logger.ws('Message type:', data.type);

    switch (data.type) {
      case 'userConnect':
        logger.ws('Processing userConnect');
        // Track user as online when they connect with authentication
        addOnlineUser(data.userId, data.username, socket);

        // Check if this is a game mode request (arcade or coop)
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
          handleJoinBotGame(socket, {
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
        break;
      case 'joinGame':
        logger.ws('Processing joinGame');
        handleJoinGame(socket, data as JoinGameMessage);
        break;
      case 'joinBotGame':
        logger.ws('Processing joinBotGame');
        handleJoinBotGame(socket, data as JoinGameMessage);
        break;
      case 'movePaddle':
        logger.ws('Processing movePaddle - calling handleMovePaddle');
        handleMovePaddle(socket, data as MovePaddleMessage);
        break;
      case 'pause':
        logger.ws('Processing pause');
        handlePauseGame(socket, data);
        break;
      case 'disconnect':
        logger.ws('Processing disconnect');
        handleDisconnect(socket);
        break;
      default:
        logger.ws('Unknown message type:', data.type);
    }
  } catch (error) {
    logger.error('WebSocket message error:', error);
  }
}

export function handleWebSocketClose(socket: any): void {
  handleDisconnect(socket);
}

function handleMovePaddle(socket: any, data: MovePaddleMessage): void {
  logger.gameDebug(-1, 'handleMovePaddle called with:', data);
  logger.gameDebug(-1, 'Active games count:', activeGames.size);

  // Find the game this player is in
  for (let [gameId, game] of activeGames) {
    logger.gameDebug(gameId, 'Checking game:', gameId);
    logger.gameDebug(gameId, 'Player1 socket === current socket:', game.player1.socket === socket);
    logger.gameDebug(gameId, 'Player2 socket === current socket:', game.player2.socket === socket);

    if (game.player1.socket === socket || game.player2.socket === socket) {
      // Determine which player this socket belongs to
      const socketPlayerId = game.player1.socket === socket ?
        game.player1.userId : game.player2.userId;
      logger.gameDebug(gameId, 'Found game', gameId, 'for socket player', socketPlayerId, 'direction:', data.direction);

      // For tournament local multiplayer, use data.playerId to distinguish which paddle
      // For other modes, use the socket-determined playerId
      const targetPlayerId = data.playerId || socketPlayerId;
      logger.gameDebug(gameId, 'Target paddle playerId:', targetPlayerId, '(from data.playerId:', data.playerId, ')');

      // Pass paddleIndex for arcade mode
      if (data.paddleIndex !== undefined) {
        logger.gameDebug(gameId, 'Arcade mode - paddleIndex:', data.paddleIndex);
        game.movePaddle(targetPlayerId, data.direction, data.paddleIndex);
      } else {
        game.movePaddle(targetPlayerId, data.direction);
      }

      logger.gameDebug(gameId, 'Paddle movement executed for playerId', targetPlayerId);
      return; // Found the game, no need to continue
    }
  }

  logger.gameDebug(-1, 'No game found for this socket');
}

function handlePauseGame(socket: any, data: any): void {
  logger.gameDebug(-1, 'handlePauseGame called with:', data);
  logger.gameDebug(-1, 'Active games count:', activeGames.size);

  // Find the game this player is in
  for (let [gameId, game] of activeGames) {
    logger.gameDebug(gameId, 'Checking game:', gameId);

    if (game.player1.socket === socket || game.player2.socket === socket) {
      const playerId = game.player1.socket === socket ?
        game.player1.userId : game.player2.userId;
      logger.gameDebug(gameId, `Found game ${gameId} for player ${playerId}, current paused state: ${game.isPaused}`);

      // Toggle pause state based on the message
      if (data.paused !== undefined) {
        if (data.paused && !game.isPaused) {
          game.pauseGame();
          logger.gameDebug(gameId, `Game ${gameId} paused by player ${playerId}`);
        } else if (!data.paused && game.isPaused) {
          game.resumeGame();
          logger.gameDebug(gameId, `Game ${gameId} resumed by player ${playerId}`);
        }
      } else {
        // If no paused state specified, toggle current state
        game.togglePause();
        logger.gameDebug(gameId, `Game ${gameId} pause toggled by player ${playerId}, new state: ${game.isPaused ? 'paused' : 'resumed'}`);
      }
      return; // Found the game, no need to continue
    }
  }

  logger.gameDebug(-1, 'No game found for this socket');
}