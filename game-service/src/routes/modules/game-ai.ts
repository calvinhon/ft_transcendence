// game-service/src/routes/modules/game-ai.ts
import { Paddles } from './types';
import { logger } from './logger';

export class GameAI {
  private aiDifficulty: 'easy' | 'medium' | 'hard';
  private gameMode: string;
  private ballX: number = 400;
  private ballY: number = 300;
  private paddleSpeed: number;
  
  // Simple smoothing: reduce decision frequency
  private frameCounter: number = 0;
  private targetY: number = 300; // Consistent target position

  constructor(aiDifficulty: 'easy' | 'medium' | 'hard', gameMode: string, paddleSpeed: number) {
    this.aiDifficulty = aiDifficulty;
    this.gameMode = gameMode;
    this.paddleSpeed = paddleSpeed;
  }

  updateBallPosition(ballX: number, ballY: number): void {
    this.ballX = ballX;
    this.ballY = ballY;
  }

  moveBotPaddle(paddles: Paddles, gameId: number, team2Players?: any[]): void {
    this.frameCounter++;
    
    // Make decisions every 4 frames (15 FPS) for smooth movement
    const decisionFrequency = 4;
    if (this.frameCounter % decisionFrequency !== 0) {
      // Continue moving towards current target
      this.smoothMoveTowardsTarget(paddles, team2Players);
      return;
    }

    // Update target position based on ball with some error margin
    let errorMargin = 0;
    switch (this.aiDifficulty) {
      case 'easy': errorMargin = 25; break;
      case 'medium': errorMargin = 12; break;
      case 'hard': errorMargin = 3; break;
    }
    
    // Sometimes don't react (difficulty-based)
    const reactionChance = this.aiDifficulty === 'easy' ? 0.3 : this.aiDifficulty === 'medium' ? 0.5 : 0.9;
    if (Math.random() > reactionChance) {
      this.smoothMoveTowardsTarget(paddles, team2Players);
      return;
    }

    // Set new target with consistent error margin
    this.targetY = this.ballY + (Math.random() - 0.5) * errorMargin * 2;
    this.targetY = Math.max(50, Math.min(550, this.targetY)); // Keep within bounds
    
    this.smoothMoveTowardsTarget(paddles, team2Players);
  }

  private smoothMoveTowardsTarget(paddles: Paddles, team2Players?: any[]): void {
    // Handle arcade/tournament mode with multiple paddles
    if (this.gameMode === 'arcade' || this.gameMode === 'tournament') {
      if (paddles.team2 && paddles.team2.length > 0) {
        if (team2Players && team2Players.length > 0) {
          team2Players.forEach((player) => {
            if (player.isBot && paddles.team2 && paddles.team2[player.paddleIndex]) {
              this.movePaddleTowardsTarget(paddles.team2[player.paddleIndex]);
            }
          });
        } else {
          paddles.team2.forEach((botPaddle) => {
            this.movePaddleTowardsTarget(botPaddle);
          });
        }
      }
    } else {
      // Handle coop mode with single paddle
      if (paddles.player2) {
        this.movePaddleTowardsTarget(paddles.player2);
      }
    }
  }

  private movePaddleTowardsTarget(paddle: any): void {
    const paddleCenter = paddle.y + 50;
    const deadzone = 8; // Small deadzone to prevent micro-movements
    
    if (paddleCenter < this.targetY - deadzone && paddle.y < 500) {
      paddle.y += this.paddleSpeed;
    } else if (paddleCenter > this.targetY + deadzone && paddle.y > 0) {
      paddle.y -= this.paddleSpeed;
    }
  }

  // For tournament mode, we might want more sophisticated AI
  moveTournamentBot(paddles: Paddles, gameId: number): void {
    if (this.gameMode !== 'tournament' || !paddles.team2 || !paddles.team2[0]) {
      return;
    }

    // In tournament mode, use the same logic but potentially with different difficulty
    this.moveBotPaddle(paddles, gameId);
  }
}