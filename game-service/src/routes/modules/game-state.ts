// game-service/src/routes/modules/game-state.ts
import { GamePlayer } from './types';
import { logger } from './logger';

export class GameStateManager {
  private gameId: number;
  private player1: GamePlayer;
  private player2: GamePlayer;
  private gameState: 'countdown' | 'playing' | 'finished' = 'countdown';
  private countdownValue: number = 3;
  private isPaused: boolean = false;
  private countdownInterval?: any;
  private gameInterval?: any;
  private lastStateTime: number = Date.now();

  constructor(gameId: number, player1: GamePlayer, player2: GamePlayer) {
    this.gameId = gameId;
    this.player1 = player1;
    this.player2 = player2;
  }

  startCountdown(onCountdownUpdate: () => void, onCountdownComplete: () => void): void {
    logger.game(this.gameId, `Starting countdown from 3...`);
    this.gameState = 'countdown';
    this.countdownValue = 3;
    onCountdownUpdate(); // Initial broadcast

    this.countdownInterval = setInterval(() => {
      this.countdownValue--;
      logger.game(this.gameId, `Countdown: ${this.countdownValue}`);

      if (this.countdownValue <= 0) {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
        }
        logger.game(this.gameId, `GO! Game started!`);
        this.gameState = 'playing';
        onCountdownComplete();
      } else {
        onCountdownUpdate();
      }
    }, 1000);
  }

  startGameLoop(onGameUpdate: () => void): void {
    this.gameInterval = setInterval(() => {
      if (this.gameState === 'finished') {
        if (this.gameInterval) {
          clearInterval(this.gameInterval);
        }
        return;
      }

      if (!this.isPaused && this.gameState === 'playing') {
        onGameUpdate();
      }

      const now = Date.now();
      if (now - this.lastStateTime >= 33) { // ~30 FPS
        this.lastStateTime = now;
        // Broadcasting is handled by the caller
      }
    }, 16); // ~60 FPS
  }

  pauseGame(): void {
    this.isPaused = true;
    logger.game(this.gameId, 'Game paused');
  }

  resumeGame(): void {
    this.isPaused = false;
    logger.game(this.gameId, 'Game resumed');
  }

  togglePause(): void {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  endGame(): void {
    this.gameState = 'finished';
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  broadcastPauseState(): void {
    const pauseMessage = {
      type: 'gamePaused',
      isPaused: true,
      gameId: this.gameId
    };

    this.sendToPlayers(pauseMessage);
  }

  broadcastResumeState(): void {
    const resumeMessage = {
      type: 'gameResumed',
      isPaused: false,
      gameId: this.gameId
    };

    this.sendToPlayers(resumeMessage);
  }

  private sendToPlayers(message: any): void {
    if (this.player1.socket.readyState === 1) { // WebSocket.OPEN
      this.player1.socket.send(JSON.stringify(message));
    }
    if (this.player2.socket.readyState === 1) { // WebSocket.OPEN
      this.player2.socket.send(JSON.stringify(message));
    }
  }

  // Getters
  getGameState(): 'countdown' | 'playing' | 'finished' {
    return this.gameState;
  }

  getCountdownValue(): number {
    return this.countdownValue;
  }

  isGamePaused(): boolean {
    return this.isPaused;
  }
}