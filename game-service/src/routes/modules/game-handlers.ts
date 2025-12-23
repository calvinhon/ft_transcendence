// game-service/src/routes/modules/game-handlers.ts
import { MovePaddleMessage } from './types';
import { activeGames } from './game-logic';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('GAME-SERVICE');

// Anti-cheat validation state
interface PlayerInputState {
  lastTimestamp: number;
  lastPosition: number;
  inputCount: number;
  rateLimitWindow: number;
}

const playerInputStates = new Map<number, PlayerInputState>();

// Handles game-specific WebSocket messages
export class GameHandlers {
  // Anti-cheat validation for paddle movements
  private static validatePaddleInput(playerId: number, data: MovePaddleMessage): boolean {
    const now = Date.now();
    const currentState = playerInputStates.get(playerId) || {
      lastTimestamp: 0,
      lastPosition: 200, // Default center position
      inputCount: 0,
      rateLimitWindow: now
    };

    // Rate limiting: max 10 inputs per second
    if (now - currentState.rateLimitWindow > 1000) {
      currentState.inputCount = 0;
      currentState.rateLimitWindow = now;
    }
    
    if (currentState.inputCount >= 10) {
      logger.debug(`Rate limit exceeded for player ${playerId}`);
      return false;
    }

    // Timestamp validation: prevent time-travel (old timestamps)
    if (data.timestamp && data.timestamp < currentState.lastTimestamp) {
      logger.debug(`Time-travel detected for player ${playerId}: ${data.timestamp} < ${currentState.lastTimestamp}`);
      return false;
    }

    // Position validation: check for impossible jumps
    if (data.position !== undefined) {
      const positionDelta = Math.abs(data.position - currentState.lastPosition);
      const timeDelta = data.timestamp ? (data.timestamp - currentState.lastTimestamp) : 100; // Default 100ms
      const velocity = positionDelta / timeDelta; // pixels per ms
      
      // Max reasonable velocity: 1 pixel per ms (very fast but possible)
      if (velocity > 1) {
        logger.debug(`Suspicious velocity for player ${playerId}: ${velocity} pixels/ms`);
        return false;
      }

      // Position bounds: paddle should stay within game area (allowing some margin)
      if (data.position < -50 || data.position > 450) { // Game height is 400, paddle height is 50
        logger.debug(`Invalid position for player ${playerId}: ${data.position}`);
        return false;
      }
    }

    // Update state
    currentState.lastTimestamp = data.timestamp || now;
    if (data.position !== undefined) {
      currentState.lastPosition = data.position;
    }
    currentState.inputCount++;

    playerInputStates.set(playerId, currentState);
    return true;
  }

  static handleMovePaddle(socket: any, data: MovePaddleMessage): void {
    logger.debug('handleMovePaddle called with:', data);
    logger.debug('Active games count:', activeGames.size);

    // Find the game this player is in
    for (let [gameId, game] of activeGames) {
      logger.gameDebug(gameId, 'Checking game:', gameId);
      logger.gameDebug(gameId, 'Player1 socket === current socket:', game.player1.socket === socket);
      logger.gameDebug(gameId, 'Player2 socket === current socket:', game.player2.socket === socket);

      if (game.player1.socket === socket || game.player2.socket === socket) {
        // Determine which player this socket belongs to
        const socketPlayerId = game.player1.socket === socket ?
          game.player1.userId : game.player2.userId;
        
        // Anti-cheat validation
        if (!this.validatePaddleInput(socketPlayerId, data)) {
          logger.gameDebug(gameId, `Invalid input rejected for player ${socketPlayerId}`);
          return; // Reject suspicious input
        }

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

    logger.debug('No game found for this socket');
  }

  /*
  static handleInput(socket: any, data: InputMessage): void {
    logger.debug('handleInput called with:', data);
    logger.debug('Active games count:', activeGames.size);

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

    logger.debug('No game found for this socket');
  }
  */

  /*
  static handlePauseGame(socket: any, data: any): void {
    logger.debug(-1, 'handlePauseGame called with:', data);
    logger.debug('Active games count:', activeGames.size);

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

    logger.debug('No game found for this socket');
  }
  */
}