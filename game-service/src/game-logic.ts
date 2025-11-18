// game-service/src/game-logic.ts
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as WebSocket from 'ws';
import { GamePlayer, Ball, Paddle, Paddles, Scores, GameSettings } from './types.js';

// Global state
export const onlineUsers = new Map<number, Set<WebSocket>>();
export const activeGames = new Map<number, PongGame>();
export const waitingPlayers: GamePlayer[] = [];
export const db = new sqlite3.Database(path.join(__dirname, '../database/games.db'));

// Initialize database
db.run(`CREATE TABLE IF NOT EXISTS games (id INTEGER PRIMARY KEY AUTOINCREMENT, player1_id INTEGER, player2_id INTEGER, player1_score INTEGER DEFAULT 0, player2_score INTEGER DEFAULT 0, status TEXT DEFAULT 'active', started_at DATETIME DEFAULT CURRENT_TIMESTAMP, finished_at DATETIME, winner_id INTEGER, game_mode TEXT DEFAULT 'coop')`);

// PongGame class
export class PongGame {
  gameId: number; player1: GamePlayer; player2: GamePlayer; ball: Ball; paddles: Paddles; scores: Scores;
  gameState: 'countdown' | 'playing' | 'finished'; maxScore: number; isPaused: boolean;
  private gameInterval?: ReturnType<typeof setInterval>; countdownValue: number; ballFrozen: boolean;
  gameSettings: GameSettings; ballSpeed: number; paddleSpeed: number; aiDifficulty: 'easy' | 'medium' | 'hard';

  constructor(player1: GamePlayer, player2: GamePlayer, gameId: number, gameSettings?: GameSettings) {
    this.gameId = gameId; this.player1 = player1; this.player2 = player2;
    this.gameSettings = gameSettings || { gameMode: 'coop', aiDifficulty: 'medium', ballSpeed: 'medium', paddleSpeed: 'medium', powerupsEnabled: false, accelerateOnHit: false, scoreToWin: 5 };
    this.ballSpeed = { slow: 4, medium: 8, fast: 15 }[this.gameSettings.ballSpeed];
    this.paddleSpeed = { slow: 8, medium: 14, fast: 25 }[this.gameSettings.paddleSpeed];
    this.aiDifficulty = this.gameSettings.aiDifficulty;
    this.ball = { x: 400, y: 300, dx: Math.random() > 0.5 ? this.ballSpeed : -this.ballSpeed, dy: (Math.random() - 0.5) * this.ballSpeed };
    this.paddles = { player1: { y: 250, x: 50 }, player2: { y: 250, x: 750 } };
    if (this.gameSettings.gameMode === 'arcade' || this.gameSettings.gameMode === 'tournament') {
      const t1c = this.gameSettings.team1PlayerCount || 1, t2c = this.gameSettings.team2PlayerCount || 1;
      this.paddles.team1 = Array.from({ length: t1c }, (_, i) => ({ x: 50, y: 600 / (t1c + 1) * (i + 1) - 50 }));
      this.paddles.team2 = Array.from({ length: t2c }, (_, i) => ({ x: 750, y: 600 / (t2c + 1) * (i + 1) - 50 }));
    }
    this.scores = { player1: 0, player2: 0 }; this.gameState = 'countdown'; this.countdownValue = 3; this.ballFrozen = true;
    this.maxScore = this.gameSettings.scoreToWin; this.isPaused = false;
    this.startCountdown();
  }

  startCountdown() {
    const interval = setInterval(() => {
      this.countdownValue--;
      if (this.countdownValue <= 0) { clearInterval(interval); this.gameState = 'playing'; this.ballFrozen = false; this.startGameLoop(); }
      this.broadcastGameState();
    }, 1000);
  }

  startGameLoop() {
    this.gameInterval = setInterval(() => {
      if (this.gameState === 'finished') return;
      if (!this.isPaused && this.gameState === 'playing') {
        if (this.player2.userId === 0) this.moveBotPaddle();
        this.updateBall();
      }
      this.broadcastGameState();
    }, 1000 / 60);
  }

  moveBotPaddle() {
    const ballY = this.ball.y;
    const difficulty = { easy: [2, 0.6, 50], medium: [4, 0.8, 25], hard: [8, 0.98, 5] }[this.aiDifficulty];
    if (Math.random() > difficulty[1]) return;
    const move = (paddles: Paddle[]) => paddles.forEach(p => {
      if (p.y + 50 < ballY - difficulty[2] && p.y < 500) p.y += difficulty[0];
      else if (p.y + 50 > ballY + difficulty[2] && p.y > 0) p.y -= difficulty[0];
    });
    if (this.paddles.team2) move(this.paddles.team2); else {
      const p = this.paddles.player2;
      if (p.y + 50 < ballY - difficulty[2] && p.y < 500) p.y += difficulty[0];
      else if (p.y + 50 > ballY + difficulty[2] && p.y > 0) p.y -= difficulty[0];
    }
  }

  updateBall() {
    if (this.gameState !== 'playing' || this.ballFrozen) return;
    this.ball.x += this.ball.dx; this.ball.y += this.ball.dy;
    if (this.ball.y <= 0 || this.ball.y >= 600) this.ball.dy = -this.ball.dy;

    // Paddle collisions
    if (this.ball.x <= 60 && this.ball.x >= 50) {
      if (this.paddles.team1) {
        for (const p of this.paddles.team1) {
          if (this.ball.y >= p.y && this.ball.y <= p.y + 100) {
            const angle = (this.ball.y - p.y - 50) / 50 * Math.PI / 3;
            const speed = Math.sqrt(this.ball.dx ** 2 + this.ball.dy ** 2);
            this.ball.dx = speed * Math.cos(angle); this.ball.dy = speed * Math.sin(angle);
            if (this.gameSettings.accelerateOnHit) { this.ball.dx *= 1.15; this.ball.dy *= 1.15; }
            return;
          }
        }
      } else if (this.ball.y >= this.paddles.player1.y && this.ball.y <= this.paddles.player1.y + 100) {
        const angle = (this.ball.y - this.paddles.player1.y - 50) / 50 * Math.PI / 3;
        const speed = Math.sqrt(this.ball.dx ** 2 + this.ball.dy ** 2);
        this.ball.dx = speed * Math.cos(angle); this.ball.dy = speed * Math.sin(angle);
        if (this.gameSettings.accelerateOnHit) { this.ball.dx *= 1.15; this.ball.dy *= 1.15; }
      }
    }
    if (this.ball.x >= 740 && this.ball.x <= 750) {
      if (this.paddles.team2) {
        for (const p of this.paddles.team2) {
          if (this.ball.y >= p.y && this.ball.y <= p.y + 100) {
            const angle = Math.PI - (this.ball.y - p.y - 50) / 50 * Math.PI / 3;
            const speed = Math.sqrt(this.ball.dx ** 2 + this.ball.dy ** 2);
            this.ball.dx = speed * Math.cos(angle); this.ball.dy = speed * Math.sin(angle);
            if (this.gameSettings.accelerateOnHit) { this.ball.dx *= 1.15; this.ball.dy *= 1.15; }
            return;
          }
        }
      } else if (this.ball.y >= this.paddles.player2.y && this.ball.y <= this.paddles.player2.y + 100) {
        const angle = Math.PI - (this.ball.y - this.paddles.player2.y - 50) / 50 * Math.PI / 3;
        const speed = Math.sqrt(this.ball.dx ** 2 + this.ball.dy ** 2);
        this.ball.dx = speed * Math.cos(angle); this.ball.dy = speed * Math.sin(angle);
        if (this.gameSettings.accelerateOnHit) { this.ball.dx *= 1.15; this.ball.dy *= 1.15; }
      }
    }

    // Scoring
    if (this.ball.x < 0) { this.scores.player2++; this.resetBall('right'); }
    else if (this.ball.x > 800) { this.scores.player1++; this.resetBall('left'); }
    if (this.scores.player1 >= this.maxScore || this.scores.player2 >= this.maxScore) this.endGame();
  }

  resetBall(direction?: 'left' | 'right') {
    this.ballFrozen = true;
    const dir = direction === 'left' ? -this.ballSpeed : direction === 'right' ? this.ballSpeed : (Math.random() > 0.5 ? 1 : -1) * this.ballSpeed;
    this.ball = { x: 400, y: 300, dx: dir, dy: (Math.random() - 0.5) * this.ballSpeed };
    setTimeout(() => { this.ballFrozen = false; this.broadcastGameState(); }, 1000);
    this.broadcastGameState();
  }

  movePaddle(playerId: number, direction: 'up' | 'down', paddleIndex?: number) {
    if ((this.gameSettings.gameMode === 'arcade' || this.gameSettings.gameMode === 'tournament') && paddleIndex !== undefined) {
      const team = playerId === 1 ? 'team1' : 'team2';
      const paddles = this.paddles[team];
      if (paddles && paddles[paddleIndex]) {
        const p = paddles[paddleIndex];
        if (direction === 'up' && p.y > 0) p.y = Math.max(0, p.y - this.paddleSpeed);
        else if (direction === 'down' && p.y < 500) p.y = Math.min(500, p.y + this.paddleSpeed);
      }
    } else {
      const paddle = playerId === this.player1.userId ? 'player1' : 'player2';
      if (direction === 'up' && this.paddles[paddle].y > 0) this.paddles[paddle].y -= this.paddleSpeed;
      else if (direction === 'down' && this.paddles[paddle].y < 500) this.paddles[paddle].y += this.paddleSpeed;
    }
  }

  broadcastGameState() {
    const state: { type: string; ball: Ball; paddles: Paddles; scores: Scores; gameState: 'countdown' | 'playing' | 'finished'; countdownValue?: number; } = {
      type: 'gameState',
      ball: this.ball,
      paddles: this.paddles,
      scores: this.scores,
      gameState: this.gameState
    };
    if (this.gameState === 'countdown') state.countdownValue = this.countdownValue;
    [this.player1, this.player2].forEach(p => p.socket.readyState === WebSocket.OPEN && p.socket.send(JSON.stringify(state)));
  }

  endGame() {
    this.gameState = 'finished';
    if (this.gameInterval) clearInterval(this.gameInterval);
    activeGames.delete(this.gameId);
    const winnerId = this.scores.player1 > this.scores.player2 ? this.player1.userId : this.player2.userId;
    db.run('UPDATE games SET player1_score=?, player2_score=?, status=?, finished_at=CURRENT_TIMESTAMP, winner_id=? WHERE id=?',
           [this.scores.player1, this.scores.player2, 'finished', winnerId, this.gameId]);
    const endMsg = { type: 'gameEnd', winner: winnerId, scores: this.scores, gameId: this.gameId };
    [this.player1, this.player2].forEach(p => p.socket.readyState === WebSocket.OPEN && p.socket.send(JSON.stringify(endMsg)));
  }
}