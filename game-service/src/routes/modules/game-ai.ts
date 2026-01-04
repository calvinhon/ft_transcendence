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
	private paddleErrState: WeakMap<any, { lastErrTs: number }> = new WeakMap();

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

	private predictBallYAtPaddle(xTarget: number): number {
		const dx = this.ballX - this.prevBallX;
		const dy0 = this.ballY - this.prevBallY;

		if (Math.abs(dx) < 0.001) return this.ballY;
		if (xTarget === 50 && dx >= 0) return this.ballY;
		if (xTarget === 750 && dx <= 0) return this.ballY;

		let x = this.ballX;
		let y = this.ballY;
		let dy = dy0;

		for (let i = 0; i < 2000; i++) {
			const prevX = x;
			const prevY = y;

			const nextX = x + dx;
			const nextY = y + dy;

			const crossed = dx < 0
				? (prevX >= xTarget && nextX <= xTarget)
				: (prevX <= xTarget && nextX >= xTarget);

			if (crossed) {
				const t = (xTarget - prevX) / (nextX - prevX);
				if (!Number.isFinite(t)) return this.ballY;
				return prevY + t * (nextY - prevY);
			}

			x = nextX;
			y = nextY;

			if (y <= 0 || y >= 600) {
				dy = -dy;
			}
		}

		return this.ballY;
	}

	moveBotPaddle(paddles: Paddles, gameId: number, team1Players?: any[], team2Players?: any[], powerup?: Powerup): void {

		const paddleCenter = 50;

		const processPaddle = (paddle: any, xTarget: number) => {
			const dxBall = this.ballX - this.prevBallX;
			const predicted = this.predictBallYAtPaddle(xTarget);
			const baseTop = predicted - paddleCenter;
			let desiredTop = baseTop;
			const powerupAccuracy = { easy: 0.05, medium: 0.25, hard: 1.00 };
			const accuracy = powerupAccuracy[this.aiDifficulty];

			if (powerup && powerup.active &&
				((xTarget === 50 && dxBall < 0) || (xTarget === 750 && dxBall > 0)) &&
				powerup.x !== undefined && powerup.y !== undefined) {
				if (Math.random() <= accuracy) {
					const paddleHeight = paddle.height || 110;

					const ticksToPaddle = (xTarget - this.ballX) / dxBall;

					const powerupDx = Math.abs(powerup.x - xTarget);

					const dyToPowerupAtImpact = powerup.y - predicted;
					let hitAngle = Math.atan2(dyToPowerupAtImpact, powerupDx);

					const maxEdgeAngle = Math.PI / 4;
					hitAngle = Math.max(-maxEdgeAngle, Math.min(maxEdgeAngle, hitAngle));

					const hitPos = (hitAngle / (Math.PI / 2)) + 0.5;
					const shotTop = predicted - hitPos * paddleHeight;

					const maxMove = this.paddleSpeed * ticksToPaddle;
					const neededMove = Math.abs(shotTop - paddle.y);
					const stretch = this.aiDifficulty === 'easy' ? 100 : (this.aiDifficulty === 'medium' ? 50 : 0);

					if (neededMove <= maxMove + stretch) {
						desiredTop = shotTop;
						paddle.vy = 0;
					}
				}
			}

			const now = Date.now();
			const state = this.paddleErrState.get(paddle) || { lastErrTs: 0 };
			let errChance = 0.15;
			let errCooldown = 3000;
			switch (this.aiDifficulty) {
				case 'medium':
				errChance = 0.05;
				errCooldown = 5000;
				break;
				case 'hard':
				errChance = 0.01;
				errCooldown = 8000;
				break;
			}

			if (now - state.lastErrTs > errCooldown && Math.random() <= errChance) {
				desiredTop += (Math.random() < 0.5 ? -1 : 1) * 100;
				state.lastErrTs = now;
				this.paddleErrState.set(paddle, state);
			}

			desiredTop = Math.max(0, Math.min(600 - paddle.height, desiredTop));
			const delta = desiredTop - paddle.y;
			const move = Math.sign(delta) * Math.min(Math.abs(delta), this.paddleSpeed);
			paddle.y = Math.max(0, Math.min(600 - paddle.height, paddle.y + move));
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
		if (paddles.team1 && team1Players)
			processTeam(team1Players, paddles.team1, 50);
		if (paddles.team2 && team2Players)
			processTeam(team2Players, paddles.team2, 750);
		} else {
		if (paddles.player2)
			processPaddle(paddles.player2, 750);
		}
	}
}