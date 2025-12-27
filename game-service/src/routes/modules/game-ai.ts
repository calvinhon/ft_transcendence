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

  moveBotPaddle(paddles: Paddles, gameId: number, team1Players?: any[], team2Players?: any[]): void {
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
        maxSpeed = this.paddleSpeed * 0.4; // 40% Speed (Slower)
        targetError = 60; // Aim +/- 60px from ball
        lazyFactor = 0.25; // Smoothly lag behind
        break;
      case 'medium':
        maxSpeed = this.paddleSpeed * 0.7; // 70% Speed
        targetError = 30; // Aim +/- 30px
        lazyFactor = 0.1;
        break;
      case 'hard':
        maxSpeed = this.paddleSpeed * 1.2; // 120% Speed (Fast)
        targetError = 10; // Aim +/- 10px (Very accurate but not perfect)
        lazyFactor = 0.02; // Sharp reaction
        break;
    }

    let targetY = this.ballY;

    // Apply movement
    const processPaddle = (paddle: any) => {
      const h = paddle.height || 100;
      const centerY = paddle.y + (h / 2);
      let dist = targetY - centerY;

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
      const maxY = 600 - h;
      if (newY > maxY) newY = maxY; // Dynamic boundary

      paddle.y = newY;
    };


    // Handle arcade/tournament/campaign mode with multiple paddles
    if (this.gameMode === 'arcade' || this.gameMode === 'tournament') {
      const processTeam = (players: any[], teamPaddles: any[]) => {
        if (players && players.length > 0 && teamPaddles && teamPaddles.length > 0) {
          players.forEach((player, index) => {
            if (player.isBot && teamPaddles[player.paddleIndex]) {
              processPaddle(teamPaddles[player.paddleIndex]);
            }
          });
        }
      };

      // Process Team 1
      if (paddles.team1 && team1Players) {
        processTeam(team1Players, paddles.team1);
      }

      // Process Team 2
      if (paddles.team2 && team2Players) {
        processTeam(team2Players, paddles.team2);
      } else if (paddles.team2 && !team2Players) {
        // Fallback for older existing tests or legacy calls (assumes all Team 2 are bots if no player data)
        paddles.team2.forEach((botPaddle) => {
          processPaddle(botPaddle);
        });
      }
    } else {
      // Handle campaign mode
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