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

    // Store previous position for swept collision detection
    const prevX = ball.x;
    const prevY = ball.y;

    // Update ball position
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with top/bottom walls
    if (ball.y <= 0 || ball.y >= 600) {
      ball.dy = -ball.dy;
    }

    // Swept collision detection for paddles
    const collisionResult = this.checkSweptPaddleCollision(ball, prevX, prevY, paddles, gameId);
    if (collisionResult.collided) {
      return { scored: false };
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

  private checkSweptPaddleCollision(ball: Ball, prevX: number, prevY: number, paddles: Paddles, gameId: number): { collided: boolean } {
    // Check left side paddles
    if (this.gameMode === 'arcade' || this.gameMode === 'tournament') {
      // Check team1 paddles
      if (paddles.team1 && paddles.team1.length > 0) {
        for (const paddle of paddles.team1) {
          if (this.checkSweptCollisionWithPaddle(ball, prevX, prevY, paddle, 'left', gameId)) {
            return { collided: true };
          }
        }
      }
    } else {
      // Check single player1 paddle
      if (this.checkSweptCollisionWithPaddle(ball, prevX, prevY, paddles.player1, 'left', gameId)) {
        return { collided: true };
      }
    }

    // Check right side paddles
    if (this.gameMode === 'arcade' || this.gameMode === 'tournament') {
      // Check team2 paddles
      if (paddles.team2 && paddles.team2.length > 0) {
        for (const paddle of paddles.team2) {
          if (this.checkSweptCollisionWithPaddle(ball, prevX, prevY, paddle, 'right', gameId)) {
            return { collided: true };
          }
        }
      }
    } else {
      // Check single player2 paddle
      if (this.checkSweptCollisionWithPaddle(ball, prevX, prevY, paddles.player2, 'right', gameId)) {
        return { collided: true };
      }
    }

    return { collided: false };
  }

  private checkSweptCollisionWithPaddle(ball: Ball, prevX: number, prevY: number, paddle: Paddle, side: 'left' | 'right', gameId: number): boolean {
    // Define paddle boundaries (10 pixel width)
    const paddleLeft = side === 'left' ? paddle.x : paddle.x - 10;
    const paddleRight = side === 'left' ? paddle.x + 10 : paddle.x;
    const paddleX = side === 'left' ? paddleRight : paddleLeft; // The edge the ball should hit

    // Check if ball crosses the paddle's collision plane
    const crossedPaddleX = (prevX <= paddleX && ball.x >= paddleX) || (prevX >= paddleX && ball.x <= paddleX);

    if (crossedPaddleX) {
      // Calculate the y-position where the ball crosses the paddle's collision plane
      const t = (paddleX - prevX) / (ball.x - prevX);
      const crossY = prevY + t * (ball.y - prevY);

      // Check if the crossing point is within the paddle's y-range
      if (crossY >= paddle.y && crossY <= paddle.y + 110) {
        // Adjust ball position to just outside the paddle boundary
        // Add small offset to prevent sticking
        const offset = side === 'left' ? 1 : -1;
        ball.x = paddleX + offset;
        ball.y = crossY;

        this.handlePaddleHit(ball, paddle, side, gameId);
        return true;
      }
    }

    return false;
  }

  private handlePaddleHit(ball: Ball, paddle: Paddle, side: 'left' | 'right', gameId: number): void {
    const hitPos = (ball.y - paddle.y) / 110;
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

  resetBall(ball: Ball): void {
    ball.x = 400;
    ball.y = 300;
    ball.frozen = true;

    ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ballSpeed;
    ball.dy = (Math.random() - 0.5) * this.ballSpeed;
  }

  unfreezeBall(ball: Ball): void {
    ball.frozen = false;
  }

  movePaddle(paddles: Paddles, playerId: number, direction: 'up' | 'down', gameMode: string, paddleSpeed: number, gameId: number, paddleIndex?: number, player1Id?: number, player2Id?: number): boolean {
    let paddle: Paddle | undefined;
    let team: string;

    // Handle arcade/tournament mode with multiple paddles
    if ((gameMode === 'arcade' || gameMode === 'tournament') && paddleIndex !== undefined) {
      const isPlayer1 = player1Id !== undefined ? playerId === player1Id : playerId === 1;
      team = isPlayer1 ? 'team1' : 'team2';
      const teamPaddles = paddles[team as keyof Paddles] as Paddle[];

      if (!teamPaddles || !teamPaddles[paddleIndex]) {
        logger.gameDebug(gameId, 'Invalid paddle index:', paddleIndex, 'for team:', team);
        return false;
      }

      paddle = teamPaddles[paddleIndex];
    } else if (gameMode === 'tournament') {
      // Handle tournament mode without paddleIndex (local multiplayer)
      // Compare playerId with actual player1Id/player2Id from game
      logger.gameDebug(gameId, 'Tournament mode - playerId:', playerId, 'player1Id:', player1Id, 'player2Id:', player2Id);
      const isPlayer1 = player1Id !== undefined && playerId === player1Id;
      team = isPlayer1 ? 'team1' : 'team2';
      const teamPaddles = paddles[team as keyof Paddles] as Paddle[];

      if (!teamPaddles || !teamPaddles[0]) {
        logger.gameDebug(gameId, 'No paddle found for tournament team:', team);
        return false;
      }

      paddle = teamPaddles[0];
      logger.gameDebug(gameId, 'Tournament paddle selected for', team, 'at position:', paddle.y);
    } else {
      // Handle coop mode with single paddle
      // For coop mode, the human player always controls the left paddle (player1)
      // We need to get the actual player IDs from the game context, but since we don't have access to it here,
      // we'll assume player1 is the human player (left paddle) for coop mode
      const paddleKey = 'player1'; // Human player always controls left paddle in coop mode
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