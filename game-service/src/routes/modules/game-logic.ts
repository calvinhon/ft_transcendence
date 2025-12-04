// game-service/src/routes/modules/game-logic.ts
import { GamePlayer, Ball, Paddle, Paddles, Scores, GameState, GameSettings } from './types';
import { db } from './database';
import { logger } from './logger';
import { GamePhysics } from './game-physics';
import { GameAI } from './game-ai';
import { GameStateManager } from './game-state';
import { GameScoring } from './game-scoring';
import { GameBroadcaster } from './game-broadcast';

// Global state for active games
export const activeGames = new Map<number, PongGame>();

export class PongGame {
  gameId: number;
  player1: GamePlayer;
  player2: GamePlayer;
  ball!: Ball;
  paddles!: Paddles;
  scores!: Scores;
  gameSettings: GameSettings;

  // Game components
  private physics: GamePhysics;
  private ai: GameAI;
  private stateManager: GameStateManager;
  private scoring: GameScoring;
  private broadcaster: GameBroadcaster;

  constructor(player1: GamePlayer, player2: GamePlayer, gameId: number, gameSettings?: GameSettings) {
    this.gameId = gameId;
    this.player1 = player1;
    this.player2 = player2;

    // Set default game settings if not provided
    this.gameSettings = gameSettings || {
      gameMode: 'arcade',
      aiDifficulty: 'medium',
      ballSpeed: 'medium',
      paddleSpeed: 'medium',
      powerupsEnabled: false,
      accelerateOnHit: false,
      scoreToWin: 5
    };

    // Convert string settings to numeric values
    const ballSpeed = this.getBallSpeedValue(this.gameSettings.ballSpeed);
    const paddleSpeed = this.getPaddleSpeedValue(this.gameSettings.paddleSpeed);

    // Initialize game components
    this.physics = new GamePhysics(ballSpeed, this.gameSettings.accelerateOnHit, this.gameSettings.gameMode);
    this.ai = new GameAI(this.gameSettings.aiDifficulty, this.gameSettings.gameMode, paddleSpeed);
    this.stateManager = new GameStateManager(gameId, player1, player2);
    this.scoring = new GameScoring(gameId, player1, player2, this.gameSettings.scoreToWin);
    this.broadcaster = new GameBroadcaster(gameId, player1, player2);

    // Initialize game objects
    this.initializeGameObjects();

    logger.game(this.gameId, `Created with settings:`, this.gameSettings);
    this.startCountdown();
  }

  private initializeGameObjects(): void {
    // Initialize ball
    this.ball = {
      x: 400,
      y: 300,
      dx: this.getInitialBallDirection() * this.getBallSpeedValue(this.gameSettings.ballSpeed),
      dy: (Math.random() - 0.5) * this.getBallSpeedValue(this.gameSettings.ballSpeed),
      frozen: true // Freeze ball during initial countdown
    };

    // Initialize paddles based on game mode
    this.paddles = {
      player1: { x: 50, y: 250 },
      player2: { x: 750, y: 250 }
    };

    if (this.gameSettings.gameMode === 'arcade' || this.gameSettings.gameMode === 'tournament') {
      const team1Count = this.gameSettings.team1PlayerCount || 1;
      const team2Count = this.gameSettings.team2PlayerCount || 1;

      this.paddles.team1 = [];
      this.paddles.team2 = [];

      // Distribute paddles across height
      const team1Spacing = 600 / (team1Count + 1);
      for (let i = 0; i < team1Count; i++) {
        this.paddles.team1.push({
          x: 50,
          y: team1Spacing * (i + 1) - 50 // Center each paddle in its section
        });
      }

      const team2Spacing = 600 / (team2Count + 1);
      for (let i = 0; i < team2Count; i++) {
        this.paddles.team2.push({
          x: 750,
          y: team2Spacing * (i + 1) - 50
        });
      }

      logger.game(this.gameId, `Initialized ${this.gameSettings.gameMode} mode with ${team1Count} vs ${team2Count} paddles`);
    }

    this.scores = { player1: 0, player2: 0 };
  }

  private getBallSpeedValue(speed: 'slow' | 'medium' | 'fast'): number {
    switch (speed) {
      case 'slow': return 6;     // Slow and easy to track
      case 'medium': return 8;   // Standard speed
      case 'fast': return 12;    // Very fast and intense!
      default: return 8;
    }
  }

  private getPaddleSpeedValue(speed: 'slow' | 'medium' | 'fast'): number {
    switch (speed) {
      case 'slow': return 8;      // Slower response
      case 'medium': return 13;   // Standard response
      case 'fast': return 18;     // Super responsive and intense!
      default: return 10;
    }
  }

  private getInitialBallDirection(): number {
    return Math.random() > 0.5 ? 1 : -1;
  }

  startCountdown(): void {
    this.stateManager.startCountdown(
      () => this.broadcaster.broadcastGameState(this.ball, this.paddles, this.scoring.getScores(), this.stateManager.getGameState(), this.stateManager.getCountdownValue()),
      () => {
        this.physics.unfreezeBall(this.ball);
        this.startGameLoop();
      }
    );
  }

  startGameLoop(): void {
    this.stateManager.startGameLoop(() => {
      // Check if AI control is needed based on game mode
      let shouldActivateAI = false;

      if (this.gameSettings.gameMode === 'coop') {
        // In coop mode, check if player2 is a bot
        shouldActivateAI = this.player2.userId === 0;
      } else if (this.gameSettings.gameMode === 'arcade' || this.gameSettings.gameMode === 'tournament') {
        // In team modes, check if there are any bot players in team2
        shouldActivateAI = Boolean(this.gameSettings.team2Players &&
          this.gameSettings.team2Players.some(player => player.isBot === true));
      }

      if (shouldActivateAI) {
        this.ai.updateBallPosition(this.ball.x, this.ball.y);
        this.ai.moveBotPaddle(this.paddles, this.gameId, this.gameSettings.team2Players);
      }

      const result = this.physics.updateBall(this.ball, this.paddles, this.gameId);

      if (result.scored) {
        const gameFinished = this.scoring.scorePoint(result.scorer!);
        this.physics.resetBall(this.ball);

        if (gameFinished) {
          this.endGame();
        } else {
          // Reset ball after a delay
          setTimeout(() => {
            this.physics.unfreezeBall(this.ball);
            this.broadcaster.broadcastGameState(this.ball, this.paddles, this.scoring.getScores(), this.stateManager.getGameState());
          }, 1000);
        }
      }

      this.broadcaster.broadcastGameState(this.ball, this.paddles, this.scoring.getScores(), this.stateManager.getGameState());
    });
  }

  movePaddle(playerId: number, direction: 'up' | 'down', paddleIndex?: number): void {
    const paddleSpeed = this.getPaddleSpeedValue(this.gameSettings.paddleSpeed);
    const moved = this.physics.movePaddle(
      this.paddles,
      playerId,
      direction,
      this.gameSettings.gameMode,
      paddleSpeed,
      this.gameId,
      paddleIndex
    );

    if (moved) {
      // Sync tournament paddles
      if (this.gameSettings.gameMode === 'tournament') {
        if (playerId === this.player1.userId && this.paddles.team1 && this.paddles.team1[0]) {
          this.paddles.team1[0].y = this.paddles.player1.y;
        } else if (playerId === this.player2.userId && this.paddles.team2 && this.paddles.team2[0]) {
          this.paddles.team2[0].y = this.paddles.player2.y;
        }
      }

      this.broadcaster.broadcastGameState(this.ball, this.paddles, this.scoring.getScores(), this.stateManager.getGameState());
    }
  }

  pauseGame(): void {
    this.stateManager.pauseGame();
    this.stateManager.broadcastPauseState();
  }

  resumeGame(): void {
    this.stateManager.resumeGame();
    this.stateManager.broadcastResumeState();
  }

  togglePause(): void {
    this.stateManager.togglePause();
    if (this.stateManager.isGamePaused()) {
      this.stateManager.broadcastPauseState();
    } else {
      this.stateManager.broadcastResumeState();
    }
  }

  endGame(): void {
    this.stateManager.endGame();
    activeGames.delete(this.gameId);

    this.scoring.saveGameResult();
    this.scoring.broadcastGameEnd();

    logger.game(this.gameId, `Game removed from active games. Active games count: ${activeGames.size}`);
  }

  // Getters for external access
  get isPaused(): boolean {
    return this.stateManager.isGamePaused();
  }

  get gameState(): 'countdown' | 'playing' | 'finished' {
    return this.stateManager.getGameState();
  }

  // Compatibility method for matchmaking
  broadcastGameState(): void {
    this.broadcaster.broadcastGameState(this.ball, this.paddles, this.scoring.getScores(), this.stateManager.getGameState(), this.stateManager.getCountdownValue());
  }
}