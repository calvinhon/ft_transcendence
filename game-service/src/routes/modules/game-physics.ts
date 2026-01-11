// game-service/src/routes/modules/game-physics.ts
import { Ball, Paddle, Paddles, Powerup } from './types';
import { logger } from './logger';

export class GamePhysics {
  private ballSpeed: number;
  private accelerateOnHit: boolean;
  private gameMode: string;
  private powerupsEnabled: boolean;
  public powerup: Powerup;

  constructor(ballSpeed: number, accelerateOnHit: boolean, gameMode: string, powerupsEnabled: boolean) {
    this.ballSpeed = ballSpeed;
    this.accelerateOnHit = accelerateOnHit;
    this.gameMode = gameMode;
    this.powerupsEnabled = powerupsEnabled;
    this.powerupsEnabled = powerupsEnabled;
    this.powerup = { x: 400, y: 300, active: false, radius: 15 };

    logger.debug(`GamePhysics initialized. Powerups Enabled: ${this.powerupsEnabled}`);
    if (this.powerupsEnabled) {
      this.schedulePowerupSpawn();
    }
  }

  private schedulePowerupSpawn() {
    if (!this.powerupsEnabled) return;

    // Simple random spawn timer between 5s and 15s
    const delay = Math.random() * 10000 + 5000;
    setTimeout(() => {
      if (!this.powerup.active) {
        this.spawnPowerup();
      }
    }, delay);
  }

  private checkPowerupExpiration(paddles: Paddles) {
    const now = Date.now();
    const checkPaddle = (p: Paddle) => {
      if (p.powerupExpires && now > p.powerupExpires) {
        p.height = p.originalHeight || 100;
        p.powerupExpires = undefined;
      }
    };

    if (paddles.team1) paddles.team1.forEach(checkPaddle);
    if (paddles.team2) paddles.team2.forEach(checkPaddle);
    if (paddles.player1) checkPaddle(paddles.player1);
    if (paddles.player2) checkPaddle(paddles.player2);
  }

  private spawnPowerup() {
    // Spawn in center area but not too close to edges
    this.powerup.x = 400;
    this.powerup.y = Math.random() * 300 + 150; // 150 to 450
    this.powerup.active = true;
    logger.debug('Powerup spawned at', this.powerup.x, this.powerup.y);
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

    // Check for powerup collision
    if (this.powerup.active) {
      this.checkPowerupCollision(ball, paddles);
    }

    // Check for powerup expiration
    this.checkPowerupExpiration(paddles);

    return { scored: false };
  }

  private checkPowerupCollision(ball: Ball, paddles: Paddles): void {
    const dx = ball.x - this.powerup.x;
    const dy = ball.y - this.powerup.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Simple circle collision
    if (distance < (5 + this.powerup.radius)) { // ball radius approx 5
      logger.debug('Powerup collected!');
      this.powerup.active = false;

      // Effect: Increase Paddle Size of the last hitter
      if (ball.lastHitter) {
        this.applyPowerupEffect(ball.lastHitter, paddles);
      }

      this.schedulePowerupSpawn();
    }
  }

  private applyPowerupEffect(scorer: 'player1' | 'player2', paddles: Paddles) {
    const applyToPaddle = (p: Paddle) => {
      p.height = (p.originalHeight || 100) * 1.5;
      p.powerupExpires = Date.now() + 10000; // 10 seconds

      // Clamp position to prevent clipping out of bounds
      // Add small buffer (2px) to prevent visual clipping through bottom border
      const maxY = 600 - p.height - 2;
      if (p.y > maxY) {
        p.y = maxY;
      }
    };

    if (this.gameMode === 'arcade' || this.gameMode === 'tournament') {
      const team = scorer === 'player1' ? paddles.team1 : paddles.team2;
      if (team) team.forEach(applyToPaddle);
    } else {
      const p = scorer === 'player1' ? paddles.player1 : paddles.player2;
      if (p) applyToPaddle(p);
    }
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
    // Define paddle boundaries
    // Paddle coordinates are always Top-Left
    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + 10;

    // The collision face depends on the side provided
    // Left paddle: Hit Right side (paddleRight)
    // Right paddle: Hit Left side (paddleLeft)
    const paddleX = side === 'left' ? paddleRight : paddleLeft;

    // Check if ball crosses the paddle's collision plane
    const crossedPaddleX = (prevX <= paddleX && ball.x >= paddleX) || (prevX >= paddleX && ball.x <= paddleX);

    if (crossedPaddleX) {
      // Calculate the y-position where the ball crosses the paddle's collision plane
      const t = (paddleX - prevX) / (ball.x - prevX);
      const crossY = prevY + t * (ball.y - prevY);

      const paddleHeight = paddle.height || 100;

      // Check if the crossing point is within the paddle's y-range
      // Add a buffer (ball radius approx 5-10px) to prevent vertical tunneling at edges
      // Increased tolerance to 8px to catch edge cases better
      const tolerance = 8;
      if (crossY >= paddle.y - tolerance && crossY <= paddle.y + paddleHeight + tolerance) {
        // Adjust ball position
        const offset = side === 'left' ? 1 : -1;
        ball.x = paddleX + offset;
        ball.y = crossY;

        ball.lastHitter = side === 'left' ? 'player1' : 'player2';

        // Debug log for collision
        logger.gameDebug(gameId, `Paddle Hit! Side: ${side}, Y: ${crossY.toFixed(1)}, PaddleY: ${paddle.y.toFixed(1)}, Height: ${paddleHeight}, Tolerance: ${tolerance}`);

        this.handlePaddleHit(ball, paddle, side, gameId);
        return true;
      }

      // Debug Near Miss
      if (Math.abs(ball.x - paddleX) < 20 && crossY > paddle.y - 50 && crossY < paddle.y + paddleHeight + 50) {
        logger.gameDebug(gameId, `Paddle MISS. Side: ${side}, Y: ${crossY.toFixed(1)}, PaddleY: ${paddle.y.toFixed(1)}, Height: ${paddleHeight} (Hit Range: ${paddle.y - tolerance} to ${paddle.y + paddleHeight + tolerance})`);
      }
    }

    return false;
  }

  private handlePaddleHit(ball: Ball, paddle: Paddle, side: 'left' | 'right', gameId: number): void {
    const hitPos = (ball.y - paddle.y) / (paddle.height || 110);
    const angle = side === 'left'
      ? (hitPos - 0.5) * Math.PI / 2
      : Math.PI - (hitPos - 0.5) * Math.PI / 2;

    const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    let newSpeed = currentSpeed;

    if (this.accelerateOnHit) {
      newSpeed = Math.min(currentSpeed * 1.1, this.ballSpeed * 2); // Cap at 2x speed
      logger.game(gameId, `Ball accelerated! ${currentSpeed.toFixed(1)} → ${newSpeed.toFixed(1)}`);
    }

    // Apply "Flick" physics if paddle has vertical velocity
    let finalAngle = angle;
    if (paddle.vy) {
      // If moving in same direction as reflection angle (roughly), add influence
      // -PI/2 is UP, PI/2 is DOWN
      const velocityInfluence = 0.2; // Adjust magnitude of effect
      if (paddle.vy < 0) { // Moving Up
        finalAngle -= velocityInfluence;
      } else if (paddle.vy > 0) { // Moving Down
        finalAngle += velocityInfluence;
      }
      // Clamp angle to prevent too steep reflections
      const maxAngle = Math.PI / 2.5;
      if (side === 'left') {
        finalAngle = Math.max(-maxAngle, Math.min(maxAngle, finalAngle));
      } else {
        // Right side angles are PI +/- value
        const center = Math.PI;
        finalAngle = Math.max(center - maxAngle, Math.min(center + maxAngle, finalAngle));
      }
    }

    ball.dx = Math.abs(newSpeed) * Math.cos(finalAngle);
    // if (side === 'right') ball.dx = -ball.dx; // REMOVED: cos(angle) handles direction (angle ~ PI for right side)
    ball.dy = newSpeed * Math.sin(finalAngle);
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
      // Handle campaign mode with single paddle
      // For campaign mode, the human player always controls the left paddle (player1)
      // We need to get the actual player IDs from the game context, but since we don't have access to it here,
      // we'll assume player1 is the human player (left paddle) for campaign mode
      const paddleKey = 'player1'; // Human player always controls left paddle in campaign mode
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
      paddle.vy = -moveSpeed; // Track velocity
      logger.gameDebug(gameId, 'Paddle moved UP from', oldY, 'to', paddle.y);
      return true;
    } else if (direction === 'down') {
      const paddleHeight = paddle.height || 100;
      // Subtract 2px buffer to prevent clipping
      const maxY = 600 - paddleHeight - 2;
      if (paddle.y < maxY) {
        paddle.y = Math.min(maxY, paddle.y + moveSpeed);
        paddle.vy = moveSpeed; // Track velocity
        logger.gameDebug(gameId, 'Paddle moved DOWN from', oldY, 'to', paddle.y);
        return true;
      }
      return false;
    } else {
      paddle.vy = 0; // Reset velocity if blocked or invalid move
      logger.gameDebug(gameId, 'Movement blocked - direction:', direction, 'currentY:', paddle.y, 'bounds: [0, 600]');
      return false;
    }
  }
}