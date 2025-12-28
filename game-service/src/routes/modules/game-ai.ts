// game-service/src/routes/modules/game-ai.ts
import { Paddles } from './types';
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

  constructor(aiDifficulty: 'easy' | 'medium' | 'hard', gameMode: string, paddleSpeed: number) {
    this.aiDifficulty = aiDifficulty;
    this.gameMode = gameMode;
    this.paddleSpeed = paddleSpeed;
  }

  updateBallPosition(ballX: number, ballY: number): void {
	this.prevBallY = this.ballY;
	this.prevBallX = this.ballX;
	
    let errorFactor = 2;
    switch (this.aiDifficulty) {
      case 'medium':
        errorFactor = 1;
        break;
      case 'hard':
        errorFactor = 0.5;
        break;
    }
    this.ballX = ballX;
    this.ballY = ballY;
  }

  predictBallY(): number {
    const dx = this.ballX - this.prevBallX;
    if (dx < 0.5) return this.ballY;
    const dy = this.ballY - this.prevBallY;

    const xTarget = 750;
    const ticksToTarget = (xTarget - this.ballX) / dx;

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

  moveBotPaddle(paddles: Paddles, gameId: number, team2Players?: any[]): void {

    const paddleCenter = 50;

    const processPaddle = (paddle: any) => {
      const predicted = this.predictBallY();
      let desiredTop = predicted - paddleCenter;

      desiredTop = Math.max(0, Math.min(500, desiredTop));

      const delta = desiredTop - paddle.y;
      if (Math.abs(delta) < 4) return;

      const move = Math.sign(delta) * Math.min(Math.abs(delta), this.paddleSpeed);
      paddle.y = Math.max(0, Math.min(500, paddle.y + move));
    };

	if (paddles.player2)
        processPaddle(paddles.player2);
  }
}