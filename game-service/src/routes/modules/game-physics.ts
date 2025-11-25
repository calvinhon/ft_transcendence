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
    let team: string;

    // Handle arcade/tournament mode with multiple paddles
    if ((gameMode === 'arcade' || gameMode === 'tournament') && paddleIndex !== undefined) {
      const isPlayer1 = playerId === 1; // Assuming player1 has lower ID
      team = isPlayer1 ? 'team1' : 'team2';
      const teamPaddles = paddles[team as keyof Paddles] as Paddle[];

      if (!teamPaddles || !teamPaddles[paddleIndex]) {
        logger.gameDebug(gameId, 'Invalid paddle index:', paddleIndex, 'for team:', team);
        return false;
      }

      paddle = teamPaddles[paddleIndex];
    } else {
      // Handle coop mode with single paddle
      const paddleKey = playerId === 1 ? 'player1' : 'player2';
      paddle = paddles[paddleKey as keyof Paddles] as Paddle;

      if (!paddle) {
        logger.gameDebug(gameId, 'Invalid player for paddle movement:', playerId);
        return false;
      }
    }

    if (!paddle) return false;

    const oldY = paddle.y;
    const moveSpeed = paddleSpeed;

    if (direction === 'up' && paddle.y > 0) {
      paddle.y = Math.max(0, paddle.y - moveSpeed);
      logger.gameDebug(gameId, 'Paddle moved UP from', oldY, 'to', paddle.y);
      return true;
    } else if (direction === 'down' && paddle.y < 500) {
      paddle.y = Math.min(500, paddle.y + moveSpeed);
      logger.gameDebug(gameId, 'Paddle moved DOWN from', oldY, 'to', paddle.y);
      return true;
    } else {
      logger.gameDebug(gameId, 'Movement blocked - direction:', direction, 'currentY:', paddle.y, 'bounds: [0, 500]');
      return false;
    }
  }
}