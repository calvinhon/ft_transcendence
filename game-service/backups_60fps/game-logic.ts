// game-service/src/routes/modules/game-logic.ts
import { GamePlayer, Ball, Paddle, Paddles, Scores, GameState, GameSettings } from './types';
import { db } from './database';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('GAME-SERVICE');
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
    const paddleSpeed = this.getPaddleSpeedValue(this.gameSettings.paddleSpeed, this.gameSettings.campaignLevel);

    // Initialize game components
    this.physics = new GamePhysics(ballSpeed, this.gameSettings.accelerateOnHit, this.gameSettings.gameMode, this.gameSettings.powerupsEnabled);
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
      player1: { x: 50, y: 250, height: 100, originalHeight: 100 },
      player2: { x: 750, y: 250, height: 100, originalHeight: 100 }
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
          y: team1Spacing * (i + 1) - 50, // Center each paddle in its section
          height: 100,
          originalHeight: 100
        });
      }

      const team2Spacing = 600 / (team2Count + 1);
      for (let i = 0; i < team2Count; i++) {
        this.paddles.team2.push({
          x: 750,
          y: team2Spacing * (i + 1) - 50,
          height: 100,
          originalHeight: 100
        });
      }

      logger.game(this.gameId, `Initialized ${this.gameSettings.gameMode} mode with ${team1Count} vs ${team2Count} paddles`);
    }

    this.scores = { player1: 0, player2: 0 };
  }

  private getBallSpeedValue(speed: 'slow' | 'medium' | 'fast'): number {
    switch (speed) {
      case 'slow': return 3;     // Slow and easy to track
      case 'medium': return 5;   // Standard speed
      case 'fast': return 7;     // Very fast and intense!
      default: return 5;
    }
  }

  private getPaddleSpeedValue(speed: 'slow' | 'medium' | 'fast', campaignLevel?: number): number {
    let baseSpeed: number;
    switch (speed) {
      case 'slow': baseSpeed = 8; break;      // Slower response
      case 'medium': baseSpeed = 12; break;   // Standard response
      case 'fast': baseSpeed = 16; break;     // Super responsive and intense!
      default: baseSpeed = 10;
    }

    // For campaign mode, increase paddle speed with level
    if (campaignLevel && campaignLevel > 1) {
      const levelBonus = Math.floor((campaignLevel - 1) * 2); // +2 speed per level
      baseSpeed += levelBonus;
    }

    return baseSpeed;
  }

  private getInitialBallDirection(): number {
    return Math.random() > 0.5 ? 1 : -1;
  }

  startCountdown(): void {
    this.stateManager.startCountdown(
      () => this.broadcaster.broadcastGameState(this.ball, this.paddles, this.scoring.getScores(), this.stateManager.getGameState(), this.stateManager.getCountdownValue(), this.physics.powerup),
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

      if (this.gameSettings.gameMode === 'campaign') {
        // In campaign mode, check if player2 is a bot
        shouldActivateAI = this.player2.userId === 0;
      } else if (this.gameSettings.gameMode === 'arcade' || this.gameSettings.gameMode === 'tournament') {
        // In team modes, check if there are any bot players in EITHER team
        const hasTeam1Bots = Boolean(this.gameSettings.team1Players &&
          this.gameSettings.team1Players.some(player => player.isBot === true));

        const hasTeam2Bots = Boolean(this.gameSettings.team2Players &&
          this.gameSettings.team2Players.some(player => player.isBot === true));

        shouldActivateAI = hasTeam1Bots || hasTeam2Bots;
      }

      if (shouldActivateAI) {
        this.ai.updateBallPosition(this.ball.x, this.ball.y);
        this.ai.moveBotPaddle(this.paddles, this.gameId, this.gameSettings.team1Players, this.gameSettings.team2Players);
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
            this.broadcaster.broadcastGameState(this.ball, this.paddles, this.scoring.getScores(), this.stateManager.getGameState(), undefined, this.physics.powerup);
          }, 1000);
        }
      }

      this.broadcaster.broadcastGameState(this.ball, this.paddles, this.scoring.getScores(), this.stateManager.getGameState(), undefined, this.physics.powerup);
    });
  }

  movePaddle(playerId: number, direction: 'up' | 'down', paddleIndex?: number): void {
    const paddleSpeed = this.getPaddleSpeedValue(this.gameSettings.paddleSpeed, this.gameSettings.campaignLevel);
    const moved = this.physics.movePaddle(
      this.paddles,
      playerId,
      direction,
      this.gameSettings.gameMode,
      paddleSpeed,
      this.gameId,
      paddleIndex,
      this.player1.userId,
      this.player2.userId
    );

    if (moved) {
      // Sync tournament paddles - team arrays are the source of truth, sync TO player1/player2 paddles
      if (this.gameSettings.gameMode === 'tournament') {
        if (playerId === this.player1.userId && this.paddles.team1 && this.paddles.team1[0]) {
          this.paddles.player1.y = this.paddles.team1[0].y;
        } else if (playerId === this.player2.userId && this.paddles.team2 && this.paddles.team2[0]) {
          this.paddles.player2.y = this.paddles.team2[0].y;
        }
      }

      this.broadcaster.broadcastGameState(this.ball, this.paddles, this.scoring.getScores(), this.stateManager.getGameState(), undefined, this.physics.powerup);
    }
  }

  movePaddleBySide(side: 'left' | 'right', direction: 'up' | 'down', paddleIndex?: number): void {
    const paddleSpeed = this.getPaddleSpeedValue(this.gameSettings.paddleSpeed, this.gameSettings.campaignLevel);
    const team = side === 'left' ? 'team1' : 'team2';
    const index = paddleIndex ?? 0;

    logger.gameDebug(this.gameId, `Moving ${side} paddle (${team}[${index}]) ${direction}`);

    // Check if this paddle is controlled by a BOT
    const teamPlayers = side === 'left' ? this.gameSettings.team1Players : this.gameSettings.team2Players;
    if (teamPlayers && teamPlayers[index] && teamPlayers[index].isBot) {
      // Ignore user input for Bot paddles
      return;
    }

    const teamPaddles = this.paddles[team as keyof Paddles] as any[];
    if (!teamPaddles || !teamPaddles[index]) {
      logger.gameDebug(this.gameId, `No paddle found at ${team}[${index}]`);
      return;
    }

    const paddle = teamPaddles[index];
    const oldY = paddle.y;

    if (direction === 'up' && paddle.y > 0) {
      paddle.y = Math.max(0, paddle.y - paddleSpeed);
      logger.gameDebug(this.gameId, `Paddle moved UP from ${oldY} to ${paddle.y}`);
    } else if (direction === 'down' && paddle.y < 500) {
      paddle.y = Math.min(500, paddle.y + paddleSpeed);
      logger.gameDebug(this.gameId, `Paddle moved DOWN from ${oldY} to ${paddle.y}`);
    }

    // Sync to player1/player2 paddles for rendering compatibility
    if (side === 'left' && index === 0) {
      this.paddles.player1.y = paddle.y;
    } else if (side === 'right' && index === 0) {
      this.paddles.player2.y = paddle.y;
    }

    this.broadcaster.broadcastGameState(this.ball, this.paddles, this.scoring.getScores(), this.stateManager.getGameState(), undefined, this.physics.powerup);
  }

  pauseGame(): void {
    this.stateManager.pauseGame();
    this.stateManager.broadcastPauseState();
  }

  resumeGame(): void {
    this.physics.resetTime();
    this.stateManager.resumeGame();
    this.stateManager.broadcastResumeState();
  }

  togglePause(): void {
    this.stateManager.togglePause();
    if (this.stateManager.isGamePaused()) {
      this.stateManager.broadcastPauseState();
    } else {
      this.physics.resetTime();
      this.stateManager.broadcastResumeState();
    }
  }

  endGame(): void {
    this.stateManager.endGame();
    activeGames.delete(this.gameId);

    this.scoring.broadcastGameEnd();

    logger.game(this.gameId, `Game removed from active games. Active games count: ${activeGames.size}`);
  }

  forceEndGame(reason?: string): void {
    logger.game(this.gameId, `Force Ending Game: ${reason}`);
    this.stateManager.endGame(); // Stops loop
    activeGames.delete(this.gameId);

    // Save with aborted flag = true
    this.scoring.saveGameResult(true);

    // Optionally broadcast end to remaining players
    this.scoring.broadcastGameEnd();

    logger.game(this.gameId, `Game force-ended and removed from active games.`);
  }

  // Getters for external access
  get isPaused(): boolean {
    return this.stateManager.isGamePaused();
  }

  // Compatibility method for matchmaking
  broadcastGameState(): void {
    this.broadcaster.broadcastGameState(this.ball, this.paddles, this.scoring.getScores(), this.stateManager.getGameState(), this.stateManager.getCountdownValue(), this.physics.powerup);
  }
}