// game-service/src/routes/modules/game-ai.ts
import { Paddles } from './types';
import { logger } from './logger';

export class GameAI {
  private aiDifficulty: 'easy' | 'medium' | 'hard';
  private gameMode: string;
  private ballX: number = 400;
  private ballY: number = 300;
  private paddleSpeed: number;

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
    let reactionDelay = false;
    let errorMargin = 0;
    let moveSpeed = this.paddleSpeed;

    // Adjust AI behavior based on difficulty
    switch (this.aiDifficulty) {
      case 'easy':
        reactionDelay = Math.random() > 0.4; // 40% chance bot doesn't react
        errorMargin = 30; // Large error margin
        break;
      case 'medium':
        reactionDelay = Math.random() > 0.6; // 20% chance bot doesn't react
        errorMargin = 15; // Medium error margin
        break;
      case 'hard':
        reactionDelay = Math.random() > 0.8; // Only 2% chance bot doesn't react (nearly perfect)
        errorMargin = 5; // Very small error margin (nearly perfect aim)
        break;
    }

    if (reactionDelay) return; // Sometimes bot doesn't react

    // Handle arcade/tournament mode with multiple paddles
    if (this.gameMode === 'arcade' || this.gameMode === 'tournament') {
      if (paddles.team2 && paddles.team2.length > 0) {
        // Only control paddles that correspond to bot players
        if (team2Players && team2Players.length > 0) {
          team2Players.forEach((player, index) => {
            if (player.isBot && paddles.team2 && paddles.team2[player.paddleIndex]) {
              this.moveSingleBotPaddle(paddles.team2[player.paddleIndex], errorMargin, moveSpeed);
            }
          });
        } else {
          // Fallback: if no team2Players data, control all paddles (legacy behavior)
          paddles.team2.forEach((botPaddle) => {
            this.moveSingleBotPaddle(botPaddle, errorMargin, moveSpeed);
          });
        }
      }
    } else {
      // Handle coop mode with single paddle
      if (paddles.player2) {
        this.moveSingleBotPaddle(paddles.player2, errorMargin, moveSpeed);
      }
    }
  }

  private moveSingleBotPaddle(botPaddle: any, errorMargin: number, moveSpeed: number): void {
    const paddleCenter = botPaddle.y + 50; // Center of 100px paddle
    const ballY = this.ballY + errorMargin * (Math.random() - 0.5); // Add some randomness

    if (paddleCenter < ballY - errorMargin && botPaddle.y < 500) {
      botPaddle.y = Math.min(500, botPaddle.y + moveSpeed); // Move down
    } else if (paddleCenter > ballY + errorMargin && botPaddle.y > 0) {
      botPaddle.y = Math.max(0, botPaddle.y - moveSpeed); // Move up
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