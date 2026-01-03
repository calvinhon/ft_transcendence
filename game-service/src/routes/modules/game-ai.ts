// game-service/src/routes/modules/game-ai.ts
import { Paddles, Powerup } from './types';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('GAME-SERVICE');

export class GameAI {
  private aiDifficulty: 'easy' | 'medium' | 'hard';
  private gameMode: string;
  private ballX: number = 400;
  private ballY: number = 300;
  private prevBallX: number = 0;
  private prevBallY: number = 0;
  private paddleSpeed: number;
  public lastBallUpdate = 0;
  private paddleMissState: WeakMap<any, { lastMissTs: number }> = new WeakMap();

  constructor(aiDifficulty: 'easy' | 'medium' | 'hard', gameMode: string, paddleSpeed: number) {
    this.aiDifficulty = aiDifficulty;
    this.gameMode = gameMode;
    this.paddleSpeed = paddleSpeed;
  }

  updateBallPosition(ballX: number, ballY: number): void {
	this.prevBallY = this.ballY;
	this.prevBallX = this.ballX;
    this.ballX = ballX;
    this.ballY = ballY;
  }

  predictBallY(xTarget: number): number {
    const dx = this.ballX - this.prevBallX;
    // If the ball isn't moving (or isn't moving toward the target paddle), don't extrapolate.
    if (Math.abs(dx) < 0.001) return this.ballY;
    if (xTarget === 50 && dx >= 0) return this.ballY;   // left paddle target, but ball moving right
    if (xTarget === 750 && dx <= 0) return this.ballY;  // right paddle target, but ball moving left
    const dy = this.ballY - this.prevBallY;

    const ticksToTarget = (xTarget - this.ballX) / dx;

    if (!Number.isFinite(ticksToTarget) || ticksToTarget <= 0) return this.ballY;

    let predictedY = this.ballY + dy * ticksToTarget;

    predictedY = this.reflectWithinBounds(predictedY, 600);

    return predictedY;
  }

  private reflectWithinBounds(y: number, max: number): number {
    const period = 2 * max;
    y %= period;
    if (y > max) y = period - y;
    return y;
  }

  moveBotPaddle(paddles: Paddles, gameId: number, team1Players?: any[], team2Players?: any[], powerup?: Powerup): void {

    const paddleCenter = 50;

    const processPaddle = (paddle: any, xTarget: number) => {
    const dxBall = this.ballX - this.prevBallX;
    const predicted = this.predictBallY(xTarget);
    const baseTop = predicted - paddleCenter;
    let desiredTop = baseTop;

    // Default behavior: defend (track predicted ball), with occasional misses/bias.
    const now = Date.now();
    const state = this.paddleMissState.get(paddle) || { lastMissTs: 0 };
    let missChance = 0.05;
    let missCooldown = 5000;
    switch (this.aiDifficulty) {
      case 'easy':
        missChance = 0.15;
        missCooldown = 3000;
        break;
      case 'hard':
        missChance = 0.01;
        missCooldown = 8000;
        break;
    }

    if (now - state.lastMissTs > missCooldown && Math.random() <= missChance) {
      desiredTop += (Math.random() < 0.5 ? -1 : 1) * 100;
      state.lastMissTs = now;
      this.paddleMissState.set(paddle, state);
    }

    const bias = paddle.x < 400 ? -15 : 15;
    desiredTop += bias;

    // Powerup aiming (without abandoning defense):
    // When the ball is approaching this paddle, compute the required hit position
    // so the outgoing reflection (as implemented in GamePhysics) is aimed at the
    // powerup. Blend this "shot" target with the defensive target.
    if (powerup && powerup.active) {
      const paddleHeight = paddle.height || 100;

      const ballApproaching = (xTarget === 50 && dxBall < 0) || (xTarget === 750 && dxBall > 0);
      const ticksToPaddle = ballApproaching ? (xTarget - this.ballX) / dxBall : Number.POSITIVE_INFINITY;

      const powerupDx = Math.abs(powerup.x - xTarget);
      const powerupOnSide = xTarget === 50 ? powerup.x > xTarget + 20 : powerup.x < xTarget - 20;
      const powerupInRange = powerupDx > 1 && powerupDx < 520;

      if (ballApproaching && Number.isFinite(ticksToPaddle) && ticksToPaddle > 0 && ticksToPaddle < 120 && powerupOnSide && powerupInRange) {
        // Aim line: from impact point (xTarget, predicted) toward (powerup.x, powerup.y)
        const dyToPowerupAtImpact = powerup.y - predicted;
        let offsetAngle = Math.atan2(dyToPowerupAtImpact, powerupDx);

        // GamePhysics maps hitPos -> angle offset in [-PI/4, PI/4]
        const maxEdgeAngle = Math.PI / 4;
        offsetAngle = Math.max(-maxEdgeAngle, Math.min(maxEdgeAngle, offsetAngle));

        const hitPos = (offsetAngle / (Math.PI / 2)) + 0.5; // inverse mapping
        const shotTop = predicted - hitPos * paddleHeight;

        // Only attempt if we can plausibly reach the shot position in time.
        const maxMove = this.paddleSpeed * ticksToPaddle;
        const neededMove = Math.abs(shotTop - paddle.y);

        if (neededMove <= maxMove + 15) {
          const w = this.aiDifficulty === 'easy' ? 0.7 : (this.aiDifficulty === 'hard' ? 0.4 : 0.55);
          desiredTop = baseTop * (1 - w) + shotTop * w;
        }
      }
    }

		desiredTop = Math.max(0, Math.min(500, desiredTop));
		const delta = desiredTop - paddle.y;
		if (Math.abs(delta) < 10) return;
		const move = Math.sign(delta) * Math.min(Math.abs(delta), this.paddleSpeed);
		paddle.y = Math.max(0, Math.min(500, paddle.y + move));
	};

    if (this.gameMode === 'arcade') {
      const processTeam = (players: any[] | undefined, teamPaddles: any[] | undefined, xTarget: number) => {
        if (players && players.length > 0 && teamPaddles && teamPaddles.length > 0) {
          players.forEach((player) => {
            if (player.isBot && teamPaddles[player.paddleIndex]) {
              processPaddle(teamPaddles[player.paddleIndex], xTarget);
            }
          });
        }
      };
      // Process Team 1 (left side, xTarget ~ 50)
      if (paddles.team1 && team1Players)
        processTeam(team1Players, paddles.team1, 50);
      // Process Team 2 (right side, xTarget ~ 750)
      if (paddles.team2 && team2Players)
        processTeam(team2Players, paddles.team2, 750);
    } else {
      // Handle campaign mode (player2 is on the right)
      if (paddles.player2)
        processPaddle(paddles.player2, 750);
    }
  }
}