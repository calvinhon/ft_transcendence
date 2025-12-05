// game-service/src/routes/modules/game-handlers.ts
import { MovePaddleMessage, InputMessage } from './types';
import { activeGames } from './game-logic';
import { logger } from './logger';

// Handles game-specific WebSocket messages
export class GameHandlers {
  static handleMovePaddle(socket: any, data: MovePaddleMessage): void {
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

        // Position-based control for tournament/arcade modes
        if (data.side !== undefined) {
          logger.gameDebug(gameId, 'Position-based control - side:', data.side, 'paddleIndex:', data.paddleIndex);
          game.movePaddleBySide(data.side, data.direction, data.paddleIndex);
        }
        // Player ID-based control for other modes
        else {
          const targetPlayerId = data.playerId || socketPlayerId;
          logger.gameDebug(gameId, 'Player-based control - playerId:', targetPlayerId);
          
          if (data.paddleIndex !== undefined) {
            game.movePaddle(targetPlayerId, data.direction, data.paddleIndex);
          } else {
            game.movePaddle(targetPlayerId, data.direction);
          }
        }

        logger.gameDebug(gameId, 'Paddle movement executed');
        return; // Found the game, no need to continue
      }
    }

    logger.gameDebug(-1, 'No game found for this socket');
  }

  static handleInput(socket: any, data: InputMessage): void {
    logger.gameDebug(-1, 'handleInput called with:', data);
    logger.gameDebug(-1, 'Active games count:', activeGames.size);

    // Find the game this player is in
    for (let [gameId, game] of activeGames) {
      logger.gameDebug(gameId, 'Checking game:', gameId);

      if (game.player1.socket === socket || game.player2.socket === socket) {
        // Determine which player this socket belongs to
        const playerId = game.player1.socket === socket ?
          game.player1.userId : game.player2.userId;
        logger.gameDebug(gameId, 'Found game', gameId, 'for socket player', playerId, 'key:', data.key, 'pressed:', data.pressed);

        // Only process if pressed (ignore release for now, as paddle movement is continuous)
        if (data.pressed) {
          // Determine direction based on key
          let direction: 'up' | 'down' | null = null;
          switch (data.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
              direction = 'up';
              break;
            case 'ArrowDown':
            case 's':
            case 'S':
              direction = 'down';
              break;
          }

          if (direction) {
            logger.gameDebug(gameId, 'Moving paddle for player', playerId, 'direction:', direction);
            game.movePaddle(playerId, direction);
          } else {
            logger.gameDebug(gameId, 'Unknown key:', data.key);
          }
        }

        return; // Found the game, no need to continue
      }
    }

    logger.gameDebug(-1, 'No game found for this socket');
  }

  static handlePauseGame(socket: any, data: any): void {
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
}