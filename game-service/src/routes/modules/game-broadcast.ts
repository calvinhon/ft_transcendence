// game-service/src/routes/modules/game-broadcast.ts
import { GamePlayer, Ball, Paddles, Scores, GameState, Powerup } from './types';
import { logger } from './logger';

export class GameBroadcaster {
  private gameId: number;
  private player1: GamePlayer;
  private player2: GamePlayer;

  constructor(gameId: number, player1: GamePlayer, player2: GamePlayer) {
    this.gameId = gameId;
    this.player1 = player1;
    this.player2 = player2;
  }

  broadcastGameState(ball: Ball, paddles: Paddles, scores: Scores, gameState: 'countdown' | 'playing' | 'finished', countdownValue?: number, powerup?: Powerup): void {
    const gameStateMessage: GameState = {
      type: 'gameState',
      ball,
      paddles,
      scores,
      gameState,
      powerup
    };

    // Add countdown value if in countdown state
    if (gameState === 'countdown' && countdownValue !== undefined) {
      gameStateMessage.countdownValue = countdownValue;
    }

    logger.gameDebug(this.gameId, 'Broadcasting game state:', JSON.stringify(gameStateMessage));

    this.sendToPlayers(gameStateMessage);
  }

  private sendToPlayers(message: any): void {
    if (this.player1.socket.readyState === 1) { // WebSocket.OPEN
      this.player1.socket.send(JSON.stringify(message));
    }
    if (this.player2.socket.readyState === 1) { // WebSocket.OPEN
      this.player2.socket.send(JSON.stringify(message));
    }
  }
}