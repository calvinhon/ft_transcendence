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
    // Smoother AI Logic
    // No random "skipping" frames (causes jitter). Instead, limit speed and tracking accuracy.

    const paddleHeight = 100;
    const paddleHalfHeight = paddleHeight / 2;
    const paddleCenterOffset = 50;

    // Difficulty Configuration
    let maxSpeed = this.paddleSpeed;
    let targetError = 0;
    let lazyFactor = 0; // 0 = Instant reaction, 1 = Very lazy

    switch (this.aiDifficulty) {
      case 'easy':
        maxSpeed = this.paddleSpeed * 0.5; // 50% Speed
        targetError = 40; // Aim +/- 40px from ball
        lazyFactor = 0.2; // Smoothly lag behind
        break;
      case 'medium':
        maxSpeed = this.paddleSpeed * 0.8; // 80% Speed
        targetError = 15; // Aim +/- 15px
        lazyFactor = 0.1;
        break;
      case 'hard':
        maxSpeed = this.paddleSpeed * 1.1; // 110% Speed (Slightly faster than base)
        targetError = 0; // Aim perfectly
        lazyFactor = 0.05; // Very sharp reaction
        break;
    }

    let targetY = this.ballY;

    // Add error only if we don't have a stable target yet (optional, or just use constant offset per volley)
    // For simplicity, we'll aim for the ballY but clamp the movement speed.

    // Level 3 "Hard but not perfect": maybe add a sine wave error or just use the targetError
    // Actually, "Hard but not always perfect" -> mostly hits, sometimes misses corner cases?
    // High speed but slight tracking delay is usually enough to make it beatable.

    // Apply movement
    const processPaddle = (paddle: any) => {
      const currentCenter = paddle.y + paddleCenterOffset;
      let dist = targetY - currentCenter;

      // Deadzone to prevent micro-jitter when aligned
      if (Math.abs(dist) < 5) return;

      // Cap speed
      let move = dist * (1 - lazyFactor); // Proportional control
      if (Math.abs(move) > maxSpeed) {
        move = Math.sign(move) * maxSpeed;
      }

      let newY = paddle.y + move;

      // Bounds check
      if (newY < 0) newY = 0;
      if (newY > 500) newY = 500; // Assuming canvas height 600 - paddle 100

      paddle.y = newY;
    };


    // Handle arcade/tournament/campaign mode with multiple paddles
    if (this.gameMode === 'arcade' || this.gameMode === 'tournament' || this.gameMode === 'campaign') {
      if (paddles.team2 && paddles.team2.length > 0) {
        if (team2Players && team2Players.length > 0) {
          team2Players.forEach((player, index) => {
            if (player.isBot && paddles.team2 && paddles.team2[player.paddleIndex]) {
              processPaddle(paddles.team2[player.paddleIndex]);
            }
          });
        } else {
          // Fallback
          paddles.team2.forEach((botPaddle) => {
            processPaddle(botPaddle);
          });
        }
      }
    } else {
      // Handle coop mode
      if (paddles.player2) {
        processPaddle(paddles.player2);
      }
    }
  }

  private moveSingleBotPaddle(botPaddle: any, errorMargin: number, moveSpeed: number): void {
    // Deprecated in favor of inline logic above
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