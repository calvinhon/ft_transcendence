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

  // Predict the Y coordinate when the ball reaches xTarget (defaults to right-side 750)
  predictBallY(xTarget: number = 750): number {
    const dx = this.ballX - this.prevBallX;
    if (dx < 0.5) return this.ballY;
    const dy = this.ballY - this.prevBallY;

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

  moveBotPaddle(paddles: Paddles, gameId: number, team1Players?: any[], team2Players?: any[]): void {

    const paddleCenter = 50;

    const processPaddle = (paddle: any, xTarget: number = 750) => {
      const predicted = this.predictBallY(xTarget);
      let desiredTop = predicted - paddleCenter;

      desiredTop = Math.max(0, Math.min(500, desiredTop));

      const delta = desiredTop - paddle.y;
      if (Math.abs(delta) < 4) return;

      const move = Math.sign(delta) * Math.min(Math.abs(delta), this.paddleSpeed);
      paddle.y = Math.max(0, Math.min(500, paddle.y + move));
    };

	// if (paddles.player2)
    //     processPaddle(paddles.player2);

	// Handle arcade/tournament/campaign mode with multiple paddles
    if (this.gameMode === 'arcade' || this.gameMode === 'tournament') {
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
      if (paddles.team1 && team1Players) {
        processTeam(team1Players, paddles.team1, 50);
      }

      // Process Team 2 (right side, xTarget ~ 750)
      if (paddles.team2 && team2Players) {
        processTeam(team2Players, paddles.team2, 750);
      } else if (paddles.team2 && !team2Players) {
        // Fallback for older existing tests or legacy calls (assumes all Team 2 are bots if no player data)
        paddles.team2.forEach((botPaddle) => {
          processPaddle(botPaddle, 750);
        });
      }
    } else {
      // Handle campaign mode (player2 is on the right)
      if (paddles.player2) {
        processPaddle(paddles.player2, 750);
      }
    }
  }
}