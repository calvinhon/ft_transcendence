// game-service/src/routes/modules/game-physics.ts
import { Ball, Paddle, Paddles } from './types';
import { logger } from './logger';

export class GamePhysics {
  private ballSpeed: number;
  private accelerateOnHit: boolean;
  private gameMode: string;

  constructor(ballSpeed: number, accelerateOnHit: boolean, gameMode: string) {
    this.ballSpeed = ballSpeed;
    this.accelerateOnHit = accelerateOnHit;
    this.gameMode = gameMode;
  }

  updateBall(ball: Ball, paddles: Paddles, gameId: number): { scored: boolean; scorer?: 'player1' | 'player2' } {
    if (ball.frozen) return { scored: false };

    // Update ball position
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with top/bottom walls
    if (ball.y <= 0 || ball.y >= 600) {
      ball.dy = -ball.dy;
    }

    // Ball collision with paddles - Left side (team1/player1)
    if (ball.x <= 60 && ball.x >= 50) {
      if (this.gameMode === 'arcade' || this.gameMode === 'tournament') {
        // Check team1 paddles
        if (paddles.team1 && paddles.team1.length > 0) {
          for (const paddle of paddles.team1) {
            if (ball.y >= paddle.y && ball.y <= paddle.y + 100) {
              this.handlePaddleHit(ball, paddle, 'left', gameId);
              return { scored: false };
            }
          }
        }
      } else {
        // Check single player1 paddle
        if (ball.y >= paddles.player1.y && ball.y <= paddles.player1.y + 100) {
          this.handlePaddleHit(ball, paddles.player1, 'left', gameId);
          return { scored: false };
        }
      }
    }

    // Ball collision with paddles - Right side (team2/player2)
    if (ball.x >= 740 && ball.x <= 750) {
      if (this.gameMode === 'arcade' || this.gameMode === 'tournament') {
        // Check team2 paddles
        if (paddles.team2 && paddles.team2.length > 0) {
          for (const paddle of paddles.team2) {
            if (ball.y >= paddle.y && ball.y <= paddle.y + 100) {
              this.handlePaddleHit(ball, paddle, 'right', gameId);
              return { scored: false };
            }
          }
        }
      } else {
        // Check single player2 paddle
        if (ball.y >= paddles.player2.y && ball.y <= paddles.player2.y + 100) {
          this.handlePaddleHit(ball, paddles.player2, 'right', gameId);
          return { scored: false };
        }
      }
    }

    // Check for scoring
    if (ball.x < 0) {
      return { scored: true, scorer: 'player2' };
    }
    if (ball.x > 800) {
      return { scored: true, scorer: 'player1' };
    }

    return { scored: false };
  }

  private handlePaddleHit(ball: Ball, paddle: Paddle, side: 'left' | 'right', gameId: number): void {
    const hitPos = (ball.y - paddle.y) / 100;
    const angle = side === 'left'
      ? (hitPos - 0.5) * Math.PI / 2
      : Math.PI + (hitPos - 0.5) * Math.PI / 2;

    const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    let newSpeed = currentSpeed;

    if (this.accelerateOnHit) {
      newSpeed = Math.min(currentSpeed * 1.1, this.ballSpeed * 2); // Cap at 2x speed
      logger.game(gameId, `Ball accelerated! ${currentSpeed.toFixed(1)} → ${newSpeed.toFixed(1)}`);
    }

    ball.dx = Math.abs(newSpeed) * Math.cos(angle);
    ball.dy = newSpeed * Math.sin(angle);
  }

  resetBall(ball: Ball, direction?: 'left' | 'right'): void {
    ball.x = 400;
    ball.y = 300;
    ball.frozen = true;

    if (direction === 'left') {
      ball.dx = -this.ballSpeed;
    } else if (direction === 'right') {
      ball.dx = this.ballSpeed;
    } else {
      ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ballSpeed;
    }

    ball.dy = (Math.random() - 0.5) * this.ballSpeed;
  }

  unfreezeBall(ball: Ball): void {
    ball.frozen = false;
  }

  movePaddle(paddles: Paddles, playerId: number, direction: 'up' | 'down', gameMode: string, paddleSpeed: number, gameId: number, paddleIndex?: number): boolean {
    let paddle: Paddle | undefined;

    // Search for paddle with matching ID
    // Check Team 1
    if (paddles.team1) {
      paddle = paddles.team1.find(p => p.playerId === playerId);
    }

    // Check Team 2 if not found
    if (!paddle && paddles.team2) {
      paddle = paddles.team2.find(p => p.playerId === playerId);
    }

    // Check Single Paddles if not found
    if (!paddle) {
      if (paddles.player1.playerId === playerId) paddle = paddles.player1;
      else if (paddles.player2.playerId === playerId) paddle = paddles.player2;
    }

    if (!paddle) {
      logger.gameDebug(gameId, 'No paddle found for playerId:', playerId);
      return false;
    }

    const oldY = paddle.y;
    const moveSpeed = paddleSpeed;

    if (direction === 'up' && paddle.y > 0) {
      paddle.y = Math.max(0, paddle.y - moveSpeed);
      logger.gameDebug(gameId, 'Paddle moved UP for', playerId, 'from', oldY, 'to', paddle.y);
      return true;
    } else if (direction === 'down' && paddle.y < 500) {
      paddle.y = Math.min(500, paddle.y + moveSpeed);
      logger.gameDebug(gameId, 'Paddle moved DOWN for', playerId, 'from', oldY, 'to', paddle.y);
      return true;
    } else {
      logger.gameDebug(gameId, 'Movement blocked - direction:', direction, 'currentY:', paddle.y, 'bounds: [0, 500]');
      return false;
    }
  }
}