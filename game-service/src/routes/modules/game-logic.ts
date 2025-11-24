// game-service/src/routes/modules/game-logic.ts
import { GamePlayer, Ball, Paddle, Paddles, Scores, GameState, GameSettings, GameRecord } from './types';
import { db } from './database';

// Global state for active games
export const activeGames = new Map<number, PongGame>();

export class PongGame {
  gameId: number;
  player1: GamePlayer;
  player2: GamePlayer;
  ball: Ball;
  paddles: Paddles;
  scores: Scores;
  gameState: 'countdown' | 'playing' | 'finished';
  maxScore: number;
  lastStateTime: number;
  isPaused: boolean;
  private gameInterval?: NodeJS.Timeout;
  countdownValue: number;
  private countdownInterval?: NodeJS.Timeout;
  ballFrozen: boolean; // Flag to freeze ball movement during countdown

  // Game settings
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

    // Set default game settings if not provided
    this.gameSettings = gameSettings || {
      gameMode: 'arcade',
      aiDifficulty: 'medium',
      ballSpeed: 'medium',
      paddleSpeed: 'medium',
      powerupsEnabled: false,
      accelerateOnHit: false,
      scoreToWin: 5
    };

    // Convert string settings to numeric values
    this.ballSpeed = this.getBallSpeedValue(this.gameSettings.ballSpeed);
    this.paddleSpeed = this.getPaddleSpeedValue(this.gameSettings.paddleSpeed);
    this.aiDifficulty = this.gameSettings.aiDifficulty;
    this.powerupsEnabled = this.gameSettings.powerupsEnabled;
    this.accelerateOnHit = this.gameSettings.accelerateOnHit;

    // Initialize ball with appropriate speed
    this.ball = {
      x: 400,
      y: 300,
      dx: this.getInitialBallDirection() * this.ballSpeed,
      dy: (Math.random() - 0.5) * this.ballSpeed
    };

    // Initialize paddles (single paddle for co-op, multiple for arcade/tournament)
    this.paddles = {
      player1: { y: 250, x: 50 },
      player2: { y: 250, x: 750 }
    };

    // Initialize multiple paddles for arcade mode and tournament mode
    if (this.gameSettings.gameMode === 'arcade' || this.gameSettings.gameMode === 'tournament') {
      const team1Count = this.gameSettings.team1PlayerCount || 1;
      const team2Count = this.gameSettings.team2PlayerCount || 1;

      // Create evenly spaced paddles for team 1 (left side)
      this.paddles.team1 = [];
      const team1Spacing = 600 / (team1Count + 1); // Distribute paddles across height
      for (let i = 0; i < team1Count; i++) {
        this.paddles.team1.push({
          x: 50,
          y: team1Spacing * (i + 1) - 50 // Center each paddle in its section
        });
      }

      // Create evenly spaced paddles for team 2 (right side)
      this.paddles.team2 = [];
      const team2Spacing = 600 / (team2Count + 1);
      for (let i = 0; i < team2Count; i++) {
        this.paddles.team2.push({
          x: 750,
          y: team2Spacing * (i + 1) - 50
        });
      }

      console.log(`🕹️ [GAME-${this.gameId}] Initialized ${this.gameSettings.gameMode} mode with ${team1Count} vs ${team2Count} paddles`);
    }

    this.scores = { player1: 0, player2: 0 };
    this.gameState = 'countdown';
    this.countdownValue = 3;
    this.ballFrozen = true; // Freeze ball during initial countdown
    this.maxScore = this.gameSettings.scoreToWin;
    this.lastStateTime = 0;
    this.isPaused = false;

    console.log(`🎮 [GAME-${this.gameId}] Created with settings:`, this.gameSettings);

    this.startCountdown();
  }

  private getBallSpeedValue(speed: 'slow' | 'medium' | 'fast'): number {
    switch (speed) {
      case 'slow': return 4;     // Slow and easy to track
      case 'medium': return 8;   // Standard speed
      case 'fast': return 15;    // Very fast and intense!
      default: return 8;
    }
  }

  private getPaddleSpeedValue(speed: 'slow' | 'medium' | 'fast'): number {
    switch (speed) {
      case 'slow': return 8;      // Slower response
      case 'medium': return 14;   // Standard response
      case 'fast': return 25;     // Super responsive and intense!
      default: return 14;
    }
  }

  private getInitialBallDirection(): number {
    return Math.random() > 0.5 ? 1 : -1;
  }

  startCountdown(): void {
    console.log(`⏱️ [GAME-${this.gameId}] Starting countdown from 3...`);

    // Broadcast initial countdown state
    this.broadcastGameState();

    this.countdownInterval = setInterval(() => {
      this.countdownValue--;
      console.log(`⏱️ [GAME-${this.gameId}] Countdown: ${this.countdownValue}`);

      if (this.countdownValue <= 0) {
        // Countdown finished, start the game
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
        }
        this.gameState = 'playing';
        this.ballFrozen = false; // Unfreeze ball movement
        console.log(`🎮 [GAME-${this.gameId}] GO! Game started!`);
        this.broadcastGameState(); // Send "GO!" state
        this.startGameLoop();
      } else {
        // Broadcast countdown update
        this.broadcastGameState();
      }
    }, 1000); // Update every second
  }

  startGameLoop(): void {
    this.gameInterval = setInterval(() => {
      if (this.gameState === 'finished') {
        if (this.gameInterval) {
          clearInterval(this.gameInterval);
        }
        return;
      }

      // Don't update game logic if paused or in countdown, but still broadcast current state
      if (!this.isPaused && this.gameState === 'playing') {
        // If player2 is bot, move bot paddle
        if (this.player2.userId === 0) {
          this.moveBotPaddle();
        }
        this.updateBall();
      }

      // Always broadcast state (even when paused) so clients stay synchronized
      // Throttle state broadcasts - only send every 33ms (30 FPS) instead of 60 FPS
      const now = Date.now();
      if (now - this.lastStateTime >= 33) {
        this.broadcastGameState();
        this.lastStateTime = now;
      }
    }, 1000 / 60); // Still update game logic at 60 FPS, but broadcast at 30 FPS
  }

  moveBotPaddle(): void {
    // AI behavior based on difficulty setting
    const ballY = this.ball.y;

    // Adjust AI parameters based on difficulty
    let moveSpeed: number;
    let reactionDelay: boolean;
    let errorMargin: number;

    switch (this.aiDifficulty) {
      case 'easy':
        moveSpeed = 2;
        reactionDelay = Math.random() > 0.6; // 40% chance bot doesn't react
        errorMargin = 50; // Large error margin
        break;
      case 'medium':
        moveSpeed = 4;
        reactionDelay = Math.random() > 0.8; // 20% chance bot doesn't react
        errorMargin = 25; // Medium error margin
        break;
      case 'hard':
        moveSpeed = 8; // Much faster movement!
        reactionDelay = Math.random() > 0.98; // Only 2% chance bot doesn't react (nearly perfect)
        errorMargin = 5; // Very small error margin (nearly perfect aim)
        break;
      default:
        moveSpeed = 4;
        reactionDelay = Math.random() > 0.8;
        errorMargin = 25;
    }

    if (reactionDelay) return; // Sometimes bot doesn't react

    // Handle arcade mode OR tournament mode with multiple paddles
    if ((this.gameSettings.gameMode === 'arcade' || this.gameSettings.gameMode === 'tournament') &&
        this.paddles.team2 && this.paddles.team2.length > 0) {
      // Move all bot paddles in arcade/tournament mode
      this.paddles.team2.forEach((botPaddle) => {
        const paddleCenter = botPaddle.y + 50;

        if (paddleCenter < ballY - errorMargin && botPaddle.y < 500) {
          botPaddle.y = Math.min(500, botPaddle.y + moveSpeed); // Move down
        } else if (paddleCenter > ballY + errorMargin && botPaddle.y > 0) {
          botPaddle.y = Math.max(0, botPaddle.y - moveSpeed); // Move up
        }
      });

      // For tournament mode, also sync the player2 paddle
      if (this.gameSettings.gameMode === 'tournament' && this.paddles.team2[0]) {
        this.paddles.player2.y = this.paddles.team2[0].y;
      }
    } else {
      // Co-op mode: single bot paddle
      const botPaddle = this.paddles.player2;
      const paddleCenter = botPaddle.y + 50;

      if (paddleCenter < ballY - errorMargin && botPaddle.y < 500) {
        botPaddle.y = Math.min(500, botPaddle.y + moveSpeed); // Move down
      } else if (paddleCenter > ballY + errorMargin && botPaddle.y > 0) {
        botPaddle.y = Math.max(0, botPaddle.y - moveSpeed); // Move up
      }
    }
  }

  updateBall(): void {
    if (this.gameState !== 'playing') return;

    // Don't move ball if frozen (during countdown after score)
    if (this.ballFrozen) return;

    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // Ball collision with top/bottom walls
    if (this.ball.y <= 0 || this.ball.y >= 600) {
      this.ball.dy = -this.ball.dy;
    }

    // Ball collision with left side paddles (team1 or player1)
    let leftHit = false;
    if (this.ball.x <= 60 && this.ball.x >=50) {
      // Check arcade mode paddles
      if (this.paddles.team1 && this.paddles.team1.length > 0) {
        for (const paddle of this.paddles.team1) {
          if (this.ball.y >= paddle.y && this.ball.y <= paddle.y + 100) {
            const hitPos = (this.ball.y - paddle.y) / 100;
            const angle = (hitPos - 0.5) * Math.PI / 2;
            const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
            this.ball.dx = Math.abs(speed) * Math.cos(angle);
            this.ball.dy = speed * Math.sin(angle);
            if (this.accelerateOnHit) {
              // Increase speed by 15% on each hit (more noticeable)
              const oldSpeed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
              this.ball.dx *= 1.15;
              this.ball.dy *= 1.15;
              const newSpeed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
              console.log(`⚡ [GAME-${this.gameId}] Ball accelerated! ${oldSpeed.toFixed(1)} → ${newSpeed.toFixed(1)}`);
            }
            leftHit = true;
            break;
          }
        }
      } else {
        // Co-op mode: single paddle
        if (this.ball.y >= this.paddles.player1.y && this.ball.y <= this.paddles.player1.y + 100) {
          const hitPos = (this.ball.y - this.paddles.player1.y) / 100;
          const angle = (hitPos - 0.5) * Math.PI / 2;
          const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
          this.ball.dx = Math.abs(speed) * Math.cos(angle);
          this.ball.dy = speed * Math.sin(angle);
          if (this.accelerateOnHit) {
            // Increase speed by 15% on each hit (more noticeable)
            this.ball.dx *= 1.15;
            this.ball.dy *= 1.15;
          }
          leftHit = true;
        }
      }
    }

    // Ball collision with right side paddles (team2 or player2)
    let rightHit = false;
    if (this.ball.x >= 740 && this.ball.x <= 750) {
      // Check arcade mode paddles
      if (this.paddles.team2 && this.paddles.team2.length > 0) {
        for (const paddle of this.paddles.team2) {
          if (this.ball.y >= paddle.y && this.ball.y <= paddle.y + 100) {
            const hitPos = (this.ball.y - paddle.y) / 100;
            const angle = Math.PI + (hitPos - 0.5) * Math.PI / 2;
            const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
            this.ball.dx = Math.abs(speed) * Math.cos(angle);
            this.ball.dy = speed * Math.sin(angle);
            if (this.accelerateOnHit) {
              // Increase speed by 15% on each hit (more noticeable)
              this.ball.dx *= 1.15;
              this.ball.dy *= 1.15;
            }
            rightHit = true;
            break;
          }
        }
      } else {
        // Co-op mode: single paddle
        if (this.ball.y >= this.paddles.player2.y && this.ball.y <= this.paddles.player2.y + 100) {
          const hitPos = (this.ball.y - this.paddles.player2.y) / 100;
          const angle = Math.PI + (hitPos - 0.5) * Math.PI / 2;
          const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
          this.ball.dx = Math.abs(speed) * Math.cos(angle);
          this.ball.dy = speed * Math.sin(angle);
          if (this.accelerateOnHit) {
            // Increase speed by 15% on each hit (more noticeable)
            this.ball.dx *= 1.15;
            this.ball.dy *= 1.15;
          }
          rightHit = true;
        }
      }
    }

    // Scoring
    if (this.ball.x < 0) {
      this.scores.player2++;
      this.resetBall('right'); // Ball goes to player on right (player2 scored)
    } else if (this.ball.x > 800) {
      this.scores.player1++;
      this.resetBall('left'); // Ball goes to player on left (player1 scored)
    }

    // Check win condition
    if (this.scores.player1 >= this.maxScore || this.scores.player2 >= this.maxScore) {
      this.endGame();
    }
  }

  resetBall(direction?: 'left' | 'right'): void {
    // Freeze ball briefly and reset to center
    this.ballFrozen = true;

    // Determine ball direction based on who was scored against
    let ballDirectionX: number;
    if (direction === 'left') {
      // Ball goes left (toward player1 who was scored against)
      ballDirectionX = -this.ballSpeed;
    } else if (direction === 'right') {
      // Ball goes right (toward player2 who was scored against)
      ballDirectionX = this.ballSpeed;
    } else {
      // Random direction for game start
      ballDirectionX = this.getInitialBallDirection() * this.ballSpeed;
    }

    this.ball = {
      x: 400,
      y: 300,
      dx: ballDirectionX,
      dy: (Math.random() - 0.5) * this.ballSpeed
    };

    console.log(`🏓 [GAME-${this.gameId}] Ball reset${direction ? ' toward ' + direction : ''}. Current scores: Player1=${this.scores.player1}, Player2=${this.scores.player2}`);

    // Brief delay without countdown overlay - just freeze ball for 1 second
    setTimeout(() => {
      this.ballFrozen = false;
      console.log(`🎮 [GAME-${this.gameId}] Ball unfrozen!`);
      this.broadcastGameState();
    }, 1000); // 1 second delay

    // Broadcast current state immediately (ball at center, frozen)
    this.broadcastGameState();
  }

  movePaddle(playerId: number, direction: 'up' | 'down', paddleIndex?: number): void {
    console.log('🏓 [MOVEPLADDLE] Called with playerId:', playerId, 'direction:', direction, 'paddleIndex:', paddleIndex);
    console.log('🏓 [MOVEPLADDLE] player1.userId:', this.player1.userId, 'player2.userId:', this.player2.userId);
    console.log('🏓 [MOVEPLADDLE] gameMode:', this.gameSettings.gameMode);

    // Handle arcade mode and tournament mode with multiple paddles
    if ((this.gameSettings.gameMode === 'arcade' || this.gameSettings.gameMode === 'tournament') && paddleIndex !== undefined) {
      const team = playerId === 1 ? 'team1' : 'team2';
      const paddles = this.paddles[team];

      if (!paddles || !paddles[paddleIndex]) {
        console.log('🏓 [MOVEPLADDLE] Invalid paddle index:', paddleIndex, 'for team:', team);
        return;
      }

      const paddle = paddles[paddleIndex];
      const oldY = paddle.y;
      const moveSpeed = this.paddleSpeed;

      if (direction === 'up' && paddle.y > 0) {
        paddle.y = Math.max(0, paddle.y - moveSpeed);
        console.log(`🏓 [MOVEPLADDLE] ⬆️ Team ${team} paddle ${paddleIndex} moved UP from ${oldY} to ${paddle.y}`);
      } else if (direction === 'down' && paddle.y < 500) {
        paddle.y = Math.min(500, paddle.y + moveSpeed);
        console.log(`🏓 [MOVEPLADDLE] ⬇️ Team ${team} paddle ${paddleIndex} moved DOWN from ${oldY} to ${paddle.y}`);
      } else {
        console.log(`🏓 [MOVEPLADDLE] ❌ Movement blocked for team ${team} paddle ${paddleIndex}`);
      }
      return;
    }

    // Handle co-op mode with single paddle
    const paddle = playerId === this.player1.userId ? 'player1' : 'player2';
    console.log('🏓 [MOVEPLADDLE] Determined paddle:', paddle);

    if (!this.paddles[paddle]) {
      console.log('🏓 [MOVEPLADDLE] Invalid player for paddle movement:', playerId);
      return;
    }

    const oldY = this.paddles[paddle].y;
    console.log('🏓 [MOVEPLADDLE] Current paddle Y:', oldY, 'Max Y (500):', 500);

    // Use paddle speed from game settings
    const moveSpeed = this.paddleSpeed;

    if (direction === 'up' && this.paddles[paddle].y > 0) {
      this.paddles[paddle].y = Math.max(0, this.paddles[paddle].y - moveSpeed);
      console.log('🏓 [MOVEPLADDLE] ⬆️ Moved UP from', oldY, 'to', this.paddles[paddle].y);
    } else if (direction === 'down' && this.paddles[paddle].y < 500) {
      this.paddles[paddle].y = Math.min(500, this.paddles[paddle].y + moveSpeed);
      console.log('🏓 [MOVEPLADDLE] ⬇️ Moved DOWN from', oldY, 'to', this.paddles[paddle].y);
    } else {
      console.log('🏓 [MOVEPLADDLE] ❌ Movement blocked - direction:', direction, 'currentY:', this.paddles[paddle].y, 'bounds: [0, 500]');
      if (direction === 'up' && this.paddles[paddle].y <= 0) {
        console.log('🏓 [MOVEPLADDLE] ❌ Cannot move up - already at top boundary');
      } else if (direction === 'down' && this.paddles[paddle].y >= 500) {
        console.log('🏓 [MOVEPLADDLE] ❌ Cannot move down - already at bottom boundary');
      }
    }

    // Only broadcast if paddle actually moved
    if (oldY !== this.paddles[paddle].y) {
      // For tournament mode, sync the team array paddles with player paddles
      if (this.gameSettings.gameMode === 'tournament') {
        if (paddle === 'player1' && this.paddles.team1 && this.paddles.team1[0]) {
          this.paddles.team1[0].y = this.paddles.player1.y;
        } else if (paddle === 'player2' && this.paddles.team2 && this.paddles.team2[0]) {
          this.paddles.team2[0].y = this.paddles.player2.y;
        }
      }

      console.log('🏓 [MOVEPLADDLE] ✅ Broadcasting game state update - paddle moved', (this.paddles[paddle].y - oldY), 'pixels');
      this.broadcastGameState();
    } else {
      console.log('🏓 [MOVEPLADDLE] ⚠️ No movement occurred, not broadcasting');
    }
  }

  broadcastGameState(): void {
    const gameState: GameState = {
      type: 'gameState',
      ball: this.ball,
      paddles: this.paddles,
      scores: this.scores,
      gameState: this.gameState
    };

    // Add countdown value if in countdown state
    if (this.gameState === 'countdown') {
      gameState.countdownValue = this.countdownValue;
    }

    // DEBUG LOG: Print game state every time it's broadcast
    console.log('🔴 [GAME-STATE] Broadcasting game state:', JSON.stringify(gameState));

    if (this.player1.socket.readyState === 1) { // WebSocket.OPEN
      this.player1.socket.send(JSON.stringify(gameState));
    }
    if (this.player2.socket.readyState === 1) { // WebSocket.OPEN
      this.player2.socket.send(JSON.stringify(gameState));
    }
  }

  // Pause/Resume functionality
  pauseGame(): void {
    this.isPaused = true;
    console.log(`⏸️ [GAME-${this.gameId}] Game paused`);

    // Broadcast pause state to both players
    const pauseMessage = {
      type: 'gamePaused',
      isPaused: true,
      gameId: this.gameId
    };

    if (this.player1.socket.readyState === 1) { // WebSocket.OPEN
      this.player1.socket.send(JSON.stringify(pauseMessage));
    }
    if (this.player2.socket.readyState === 1) { // WebSocket.OPEN
      this.player2.socket.send(JSON.stringify(pauseMessage));
    }
  }

  resumeGame(): void {
    this.isPaused = false;
    console.log(`▶️ [GAME-${this.gameId}] Game resumed`);

    // Broadcast resume state to both players
    const resumeMessage = {
      type: 'gameResumed',
      isPaused: false,
      gameId: this.gameId
    };

    if (this.player1.socket.readyState === 1) { // WebSocket.OPEN
      this.player1.socket.send(JSON.stringify(resumeMessage));
    }
    if (this.player2.socket.readyState === 1) { // WebSocket.OPEN
      this.player2.socket.send(JSON.stringify(resumeMessage));
    }
  }

  togglePause(): void {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  endGame(): void {
    this.gameState = 'finished';
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    // Remove from active games (only once)
    activeGames.delete(this.gameId);

    const winnerId = this.scores.player1 > this.scores.player2 ? this.player1.userId : this.player2.userId;
    console.log(`🏁 [GAME-${this.gameId}] Winner: ${winnerId === this.player1.userId ? this.player1.username : this.player2.username}`);

    // Update database
    db.run(
      'UPDATE games SET player1_score = ?, player2_score = ?, status = ?, finished_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?',
      [this.scores.player1, this.scores.player2, 'finished', winnerId, this.gameId],
      (err) => {
        if (err) {
          console.error(`🚨 [GAME-${this.gameId}] Database update error:`, err);
        } else {
          console.log(`✅ [GAME-${this.gameId}] Game recorded in database`);
        }
      }
    );

    // Notify players
    const endMessage = {
      type: 'gameEnd',
      winner: winnerId,
      scores: this.scores,
      gameId: this.gameId
    };

    console.log(`📤 [GAME-${this.gameId}] Sending endGame message to players`);
    if (this.player1.socket.readyState === 1) { // WebSocket.OPEN
      this.player1.socket.send(JSON.stringify(endMessage));
      console.log(`📤 [GAME-${this.gameId}] End message sent to ${this.player1.username}`);
    }
    if (this.player2.socket.readyState === 1) { // WebSocket.OPEN
      this.player2.socket.send(JSON.stringify(endMessage));
      console.log(`📤 [GAME-${this.gameId}] End message sent to ${this.player2.username}`);
    }

    console.log(`🗑️ [GAME-${this.gameId}] Game removed from active games. Active games count: ${activeGames.size}`);
  }
}