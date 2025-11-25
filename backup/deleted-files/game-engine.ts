/// <reference types="node" />
// game-engine.ts
// Contains the PongGame class and related game logic

import { db, activeGames, waitingPlayers, matchTimers, addOnlineUser, removeOnlineUser } from './game-utils';
import type { GamePlayer, GameSettings, GameState } from './modules/types';

// PongGame class implementation extracted from game.ts
export class PongGame {
    gameId: number;
    player1: GamePlayer;
    player2: GamePlayer;
    ball: any;
    paddles: any;
    scores: any;
    gameState: 'countdown' | 'playing' | 'finished';
    countdownValue: number;
    ballFrozen: boolean;
    maxScore: number;
    lastStateTime: number;
    isPaused: boolean;
    gameInterval?: NodeJS.Timeout;
    countdownInterval?: NodeJS.Timeout;
    gameSettings: GameSettings;
    ballSpeed: number;
    paddleSpeed: number;
    aiDifficulty: 'easy' | 'medium' | 'hard';
    powerupsEnabled: boolean;
    accelerateOnHit: boolean;
    constructor(player1: GamePlayer, player2: GamePlayer, gameId: number, gameSettings?: GameSettings) {
        this.gameId = gameId;
        this.player1 = player1;
        this.player2 = player2;
        this.gameSettings = gameSettings || {
            gameMode: 'arcade',
            aiDifficulty: 'medium',
            ballSpeed: 'medium',
            paddleSpeed: 'medium',
            powerupsEnabled: false,
            accelerateOnHit: false,
            scoreToWin: 5
        };
        this.ballSpeed = this.getBallSpeedValue(this.gameSettings.ballSpeed);
        this.paddleSpeed = this.getPaddleSpeedValue(this.gameSettings.paddleSpeed);
        this.aiDifficulty = this.gameSettings.aiDifficulty;
        this.powerupsEnabled = this.gameSettings.powerupsEnabled;
        this.accelerateOnHit = this.gameSettings.accelerateOnHit;
        this.ball = {
            x: 400,
            y: 300,
            dx: this.getInitialBallDirection() * this.ballSpeed,
            dy: (Math.random() - 0.5) * this.ballSpeed
        };
        this.paddles = {
            player1: { y: 250, x: 50 },
            player2: { y: 250, x: 750 }
        };
        if (this.gameSettings.gameMode === 'arcade' || this.gameSettings.gameMode === 'tournament') {
            const team1Count = this.gameSettings.team1PlayerCount || 1;
            const team2Count = this.gameSettings.team2PlayerCount || 1;
            this.paddles.team1 = [];
            const team1Spacing = 600 / (team1Count + 1);
            for (let i = 0; i < team1Count; i++) {
                this.paddles.team1.push({ x: 50, y: team1Spacing * (i + 1) - 50 });
            }
            this.paddles.team2 = [];
            const team2Spacing = 600 / (team2Count + 1);
            for (let i = 0; i < team2Count; i++) {
                this.paddles.team2.push({ x: 750, y: team2Spacing * (i + 1) - 50 });
            }
        }
        this.scores = { player1: 0, player2: 0 };
        this.gameState = 'countdown';
        this.countdownValue = 3;
        this.ballFrozen = true;
        this.maxScore = this.gameSettings.scoreToWin;
        this.lastStateTime = 0;
        this.isPaused = false;
        this.startCountdown();
    }

    private getBallSpeedValue(speed: 'slow' | 'medium' | 'fast'): number {
        switch (speed) {
            case 'slow': return 4;
            case 'medium': return 8;
            case 'fast': return 15;
            default: return 8;
        }
    }

    private getPaddleSpeedValue(speed: 'slow' | 'medium' | 'fast'): number {
        switch (speed) {
            case 'slow': return 8;
            case 'medium': return 14;
            case 'fast': return 25;
            default: return 14;
        }
    }

    private getInitialBallDirection(): number {
        return Math.random() > 0.5 ? 1 : -1;
    }

    startCountdown(): void {
        console.log(`[GAME-SERVICE] startCountdown called for gameId=${this.gameId}`);
        this.broadcastGameState();
        this.countdownInterval = setInterval(() => {
            this.countdownValue--;
            this.broadcastGameState(); // Always broadcast after countdown changes
            if (this.countdownValue <= 0) {
                if (this.countdownInterval) {
                    clearInterval(this.countdownInterval);
                }
                this.gameState = 'playing';
                this.ballFrozen = false;
                this.broadcastGameState();
                this.startGameLoop();
            }
        }, 1000);
    }

    startGameLoop(): void {
        console.log(`[GAME-SERVICE] startGameLoop called for gameId=${this.gameId}`);
        this.gameInterval = setInterval(() => {
            if (this.gameState === 'finished') {
                if (this.gameInterval) {
                    clearInterval(this.gameInterval);
                }
                return;
            }
            if (!this.isPaused && this.gameState === 'playing') {
                if (this.player2.userId === 0) {
                    this.moveBotPaddle();
                }
                this.updateBall();
            }
            // Always broadcast every tick for reliability
            this.broadcastGameState();
        }, 1000 / 60);
    }

    moveBotPaddle(): void {
        const paddle = this.paddles.player2;
        const paddleCenter = paddle.y + 50; // Paddle height 100, center at y + 50
        const ballCenter = this.ball.y;
        const paddleSpeed = 5; // Adjust speed as needed

        if (ballCenter < paddleCenter - 10) {
            paddle.y -= paddleSpeed;
        } else if (ballCenter > paddleCenter + 10) {
            paddle.y += paddleSpeed;
        }

        // Keep paddle within bounds
        paddle.y = Math.max(0, Math.min(500, paddle.y));
    }

    movePaddle(playerId: number, direction: string, paddleIndex?: number): void {
        console.log(`[GAME-SERVICE] movePaddle called: playerId=${playerId}, direction=${direction}`);
        const paddleSpeed = 10;
        let paddle;

        if (playerId === this.player1.userId) {
            paddle = this.paddles.player1;
        } else if (playerId === this.player2.userId) {
            paddle = this.paddles.player2;
        } else {
            return; // Invalid player
        }

        if (direction === 'up') {
            paddle.y -= paddleSpeed;
        } else if (direction === 'down') {
            paddle.y += paddleSpeed;
        }

        // Keep paddle within bounds (0 to 500 for 100px height paddle)
        paddle.y = Math.max(0, Math.min(500, paddle.y));
    }

    updateBall(): void {
        if (this.ballFrozen) return;

        // Move ball
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // Wall collision (top/bottom)
        if (this.ball.y <= 0 || this.ball.y >= 600) {
            this.ball.dy *= -1;
            this.ball.y = Math.max(0, Math.min(600, this.ball.y));
        }

        // Paddle collision (left)
        const paddle1 = this.paddles.player1;
        if (
            this.ball.x <= paddle1.x + 10 &&
            this.ball.y >= paddle1.y &&
            this.ball.y <= paddle1.y + 100
        ) {
            this.ball.dx *= -1;
            this.ball.x = paddle1.x + 10;
        }

        // Paddle collision (right)
        const paddle2 = this.paddles.player2;
        if (
            this.ball.x >= paddle2.x - 10 &&
            this.ball.y >= paddle2.y &&
            this.ball.y <= paddle2.y + 100
        ) {
            this.ball.dx *= -1;
            this.ball.x = paddle2.x - 10;
        }

        // Score left (player2 scores)
        if (this.ball.x < 0) {
            this.scores.player2 += 1;
            this.resetBall(1);
        }
        // Score right (player1 scores)
        if (this.ball.x > 800) {
            this.scores.player1 += 1;
            this.resetBall(-1);
        }

        // End game if max score reached
        if (
            this.scores.player1 >= this.maxScore ||
            this.scores.player2 >= this.maxScore
        ) {
            this.endGame();
        }
    }

    resetBall(direction: number): void {
        this.ball.x = 400;
        this.ball.y = 300;
        this.ball.dx = direction * this.ballSpeed;
        this.ball.dy = (Math.random() - 0.5) * this.ballSpeed;
        this.ballFrozen = true;
        setTimeout(() => {
            this.ballFrozen = false;
        }, 1000);
    }

    broadcastGameState(): void {
        const stateMessage = {
            type: 'gameState',
            gameId: this.gameId,
            gameState: this.gameState,
            countdownValue: this.countdownValue,
            scores: this.scores,
            ball: this.ball,
            paddles: this.paddles,
            isPaused: this.isPaused,
            gameSettings: this.gameSettings
        };
        if (this.player1.socket && this.player1.socket.readyState === 1) {
            this.player1.socket.send(JSON.stringify(stateMessage));
        }
        if (this.player2.socket && this.player2.socket.readyState === 1) {
            this.player2.socket.send(JSON.stringify(stateMessage));
        }
    }

    endGame(): void {
        this.gameState = 'finished';
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
        }
        activeGames.delete(this.gameId);
    }
}
// Export any additional helpers if needed
