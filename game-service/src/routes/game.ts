// game-service/src/routes/game.ts
// This file has been refactored into modular components.
// All functionality is now handled by the index.ts file and its modules.

import gameRoutes from './index';

export default gameRoutes;

// Type definitions
interface OnlineUserData {
  username: string;
  sockets: Set<WebSocket>;
  lastSeen: Date;
}

interface GamePlayer {
  userId: number;
  username: string;
  socket: WebSocket;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

interface Paddle {
  x: number;
  y: number;
}

interface Paddles {
  player1: Paddle;
  player2: Paddle;
  team1?: Paddle[]; // Multiple paddles for arcade mode
  team2?: Paddle[]; // Multiple paddles for arcade mode
}

interface Scores {
  player1: number;
  player2: number;
}

interface GameState {
  type: 'gameState';
  ball: Ball;
  paddles: Paddles;
  scores: Scores;
  gameState: 'countdown' | 'playing' | 'finished';
  countdownValue?: number; // Only present when gameState is 'countdown'
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface GameSettings {
  gameMode: 'coop' | 'arcade' | 'tournament';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  ballSpeed: 'slow' | 'medium' | 'fast';
  paddleSpeed: 'slow' | 'medium' | 'fast';
  powerupsEnabled: boolean;
  accelerateOnHit: boolean;
  scoreToWin: number;
  team1PlayerCount?: number; // Number of players on team 1
  team2PlayerCount?: number; // Number of players on team 2
}

interface JoinGameMessage extends WebSocketMessage {
  type: 'joinGame' | 'joinBotGame';
  userId: number;
  username: string;
  gameSettings?: GameSettings;
}

interface MovePaddleMessage extends WebSocketMessage {
  type: 'movePaddle';
  direction: 'up' | 'down';
  playerId?: number; // 1 for team1/left, 2 for team2/right
  paddleIndex?: number; // Index of paddle in team (0, 1, 2)
}

interface GameRecord {
  id: number;
  player1_id: number;
  player2_id: number;
  player1_score: number;
  player2_score: number;
  status: 'active' | 'finished';
  started_at: string;
  finished_at?: string;
  winner_id?: number;
  player1_name?: string;
  player2_name?: string;
  game_mode?: string;
  team1_players?: string;
  team2_players?: string;
}

interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface OnlineUser {
  user_id: number | string;
  username: string;
  display_name: string;
  status: 'online';
  last_seen: string;
  is_bot: boolean;
}

// Global state
const chatClients = new Set<WebSocket>();
const onlineUsers = new Map<number, OnlineUserData>();
const activeGames = new Map<number, PongGame>();
const waitingPlayers: GamePlayer[] = [];
const matchTimers = new Map<WebSocket, NodeJS.Timeout>();

const dbPath = path.join(__dirname, '../../database/games.db');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to Games SQLite database');
    // Create games table with support for arcade mode and tournament tracking
    db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER NOT NULL,
        player1_score INTEGER DEFAULT 0,
        player2_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        winner_id INTEGER,
        game_mode TEXT DEFAULT 'coop',
        team1_players TEXT,
        team2_players TEXT,
        tournament_id INTEGER,
        tournament_match_id INTEGER
      )
    `);
    
    // Migrate existing database: Add new columns if they don't exist
    db.all("PRAGMA table_info(games)", (err, columns: any[]) => {
      if (!err && columns) {
        const columnNames = columns.map(col => col.name);
        
        // Add game_mode column if it doesn't exist
        if (!columnNames.includes('game_mode')) {
          console.log('📦 [DB-MIGRATION] Adding game_mode column...');
          db.run("ALTER TABLE games ADD COLUMN game_mode TEXT DEFAULT 'coop'", (err) => {
            if (err) console.error('Failed to add game_mode column:', err);
            else console.log('✅ [DB-MIGRATION] game_mode column added');
          });
        }
        
        // Add team1_players column if it doesn't exist
        if (!columnNames.includes('team1_players')) {
          console.log('📦 [DB-MIGRATION] Adding team1_players column...');
          db.run("ALTER TABLE games ADD COLUMN team1_players TEXT", (err) => {
            if (err) console.error('Failed to add team1_players column:', err);
            else console.log('✅ [DB-MIGRATION] team1_players column added');
          });
        }
        
        // Add team2_players column if it doesn't exist
        if (!columnNames.includes('team2_players')) {
          console.log('📦 [DB-MIGRATION] Adding team2_players column...');
          db.run("ALTER TABLE games ADD COLUMN team2_players TEXT", (err) => {
            if (err) console.error('Failed to add team2_players column:', err);
            else console.log('✅ [DB-MIGRATION] team2_players column added');
          });
        }
        
        // Add tournament_id column if it doesn't exist
        if (!columnNames.includes('tournament_id')) {
          console.log('📦 [DB-MIGRATION] Adding tournament_id column...');
          db.run("ALTER TABLE games ADD COLUMN tournament_id INTEGER", (err) => {
            if (err) console.error('Failed to add tournament_id column:', err);
            else console.log('✅ [DB-MIGRATION] tournament_id column added');
          });
        }
        
        // Add tournament_match_id column if it doesn't exist
        if (!columnNames.includes('tournament_match_id')) {
          console.log('📦 [DB-MIGRATION] Adding tournament_match_id column...');
          db.run("ALTER TABLE games ADD COLUMN tournament_match_id INTEGER", (err) => {
            if (err) console.error('Failed to add tournament_match_id column:', err);
            else console.log('✅ [DB-MIGRATION] tournament_match_id column added');
          });
        }
      }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS game_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games (id)
      )
    `);
  }
});

// Add user to online tracking when they connect
function addOnlineUser(userId: number, username: string, socket: WebSocket): void {
  if (onlineUsers.has(userId)) {
    // User already tracked, just add this socket
    const userData = onlineUsers.get(userId)!;
    userData.sockets.add(socket);
    userData.lastSeen = new Date();
    console.log(`User ${username} (${userId}) added socket. Total sockets: ${userData.sockets.size}`);
  } else {
    // New user
    onlineUsers.set(userId, {
      username: username,
      sockets: new Set([socket]),
      lastSeen: new Date()
    });
    console.log(`User ${username} (${userId}) is now online. Total online: ${onlineUsers.size}`);
  }
}

// Remove user from online tracking
function removeOnlineUser(socket: WebSocket): void {
  for (const [userId, userData] of onlineUsers) {
    if (userData.sockets.has(socket)) {
      userData.sockets.delete(socket);
      console.log(`User ${userData.username} (${userId}) removed socket. Remaining sockets: ${userData.sockets.size}`);
      
      // Only remove user if they have no more sockets
      if (userData.sockets.size === 0) {
        console.log(`User ${userData.username} (${userId}) went offline. Total online: ${onlineUsers.size - 1}`);
        onlineUsers.delete(userId);
      }
      break;
    }
  }
}

class PongGame {
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

    if (this.player1.socket.readyState === WebSocket.OPEN) {
      this.player1.socket.send(JSON.stringify(gameState));
    }
    if (this.player2.socket.readyState === WebSocket.OPEN) {
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

    if (this.player1.socket.readyState === WebSocket.OPEN) {
      this.player1.socket.send(JSON.stringify(pauseMessage));
    }
    if (this.player2.socket.readyState === WebSocket.OPEN) {
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

    if (this.player1.socket.readyState === WebSocket.OPEN) {
      this.player1.socket.send(JSON.stringify(resumeMessage));
    }
    if (this.player2.socket.readyState === WebSocket.OPEN) {
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
      globalThis.clearInterval(this.gameInterval);
    }
    // Remove from active games (only once)
    activeGames.delete(this.gameId);

    // Remove players from waitingPlayers if present (in-place removal)
    for (let i = waitingPlayers.length - 1; i >= 0; i--) {
      if (
        waitingPlayers[i].userId === this.player1.userId ||
        waitingPlayers[i].userId === this.player2.userId
      ) {
        waitingPlayers.splice(i, 1);
      }
    }

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
    if (this.player1.socket.readyState === WebSocket.OPEN) {
      this.player1.socket.send(JSON.stringify(endMessage));
      console.log(`📤 [GAME-${this.gameId}] End message sent to ${this.player1.username}`);
    }
    if (this.player2.socket.readyState === WebSocket.OPEN) {
      this.player2.socket.send(JSON.stringify(endMessage));
      console.log(`📤 [GAME-${this.gameId}] End message sent to ${this.player2.username}`);
    }

    console.log(`🗑️ [GAME-${this.gameId}] Game removed from active games. Active games count: ${activeGames.size}`);
  }
}

async function gameRoutes(fastify: FastifyInstance): Promise<void> {
  // Chat routes were removed/disabled from this service. If chat is
  // reintroduced later, add the appropriate import and uncomment the
  // initialization call here.
  
  // WebSocket connection for real-time game
  fastify.get('/ws', { websocket: true }, (connection: SocketStream, req: FastifyRequest) => {
    console.log('=== NEW WEBSOCKET CONNECTION ESTABLISHED ===');
    console.log('Connection from:', req.socket.remoteAddress);
      
    connection.socket.on('message', async (message: Buffer | string) => {
      try {
        const data = JSON.parse(message.toString()) as WebSocketMessage;
        console.log('🔵 [WS-MESSAGE] Received WebSocket message:', data);
        console.log('🔵 [WS-MESSAGE] Message type:', data.type);
        
        switch (data.type) {
          case 'userConnect':
            console.log('🔵 [WS-MESSAGE] Processing userConnect');
            // Track user as online when they connect with authentication
            addOnlineUser(data.userId, data.username, connection.socket);
            
            // Check if this is a game mode request (arcade or coop)
            if (data.gameMode) {
              console.log('🎮 [USER-CONNECT] Game mode detected:', data.gameMode);
              
              // Prepare game settings
              const gameSettings: GameSettings = {
                gameMode: data.gameMode || 'arcade',
                aiDifficulty: data.aiDifficulty || 'medium',
                ballSpeed: data.ballSpeed || 'medium',
                paddleSpeed: data.paddleSpeed || 'medium',
                powerupsEnabled: data.powerupsEnabled || false,
                accelerateOnHit: data.accelerateOnHit || false,
                scoreToWin: data.scoreToWin || 5,
                team1PlayerCount: data.team1PlayerCount || 1,
                team2PlayerCount: data.team2PlayerCount || 1
              };
              
              console.log('🎮 [USER-CONNECT] Starting game with settings:', gameSettings);
              console.log('🎮 [USER-CONNECT] Team 1 players:', data.team1Players);
              console.log('🎮 [USER-CONNECT] Team 2 players:', data.team2Players);
              
              // Start the bot game directly with team player data
              handleJoinBotGame(connection.socket, {
                type: 'joinBotGame',
                userId: data.userId,
                username: data.username,
                gameSettings: gameSettings,
                team1Players: data.team1Players,
                team2Players: data.team2Players
              });
            } else {
              // Just acknowledge connection
              connection.socket.send(JSON.stringify({
                type: 'connectionAck',
                message: 'You are now tracked as online'
              }));
            }
            break;
          case 'joinGame':
            console.log('🔵 [WS-MESSAGE] Processing joinGame');
            handleJoinGame(connection.socket, data as JoinGameMessage);
            break;
          case 'joinBotGame':
            console.log('🔵 [WS-MESSAGE] Processing joinBotGame');
            handleJoinBotGame(connection.socket, data as JoinGameMessage);
            break;
          case 'movePaddle':
            console.log('🔵 [WS-MESSAGE] Processing movePaddle - calling handleMovePaddle');
            handleMovePaddle(connection.socket, data as MovePaddleMessage);
            break;
          case 'pause':
            console.log('🔵 [WS-MESSAGE] Processing pause');
            handlePauseGame(connection.socket, data);
            break;
          case 'disconnect':
            console.log('🔵 [WS-MESSAGE] Processing disconnect');
            handleDisconnect(connection.socket);
            break;
          default:
            console.log('🔵 [WS-MESSAGE] Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    connection.socket.on('close', () => {
      handleDisconnect(connection.socket);
    });
  });

  function handleJoinGame(socket: WebSocket, data: JoinGameMessage): void {
    console.log('handleJoinGame called with:', data);
    
    // Prevent duplicate joins
    if (waitingPlayers.some(p => p.userId === data.userId)) {
      socket.send(JSON.stringify({ type: 'error', message: 'Already waiting for a match.' }));
      return;
    }

    // Track this user as online
    addOnlineUser(data.userId, data.username, socket);
    
    const player: GamePlayer = {
      userId: data.userId,
      username: data.username,
      socket: socket
    };

    waitingPlayers.push(player);
    console.log('Current waiting players:', waitingPlayers.length);

    if (waitingPlayers.length >= 2) {
      const player1 = waitingPlayers.shift()!;
      const player2 = waitingPlayers.shift()!;
      
      // Clear any existing timers for these players
      if (matchTimers.has(player1.socket)) {
        clearTimeout(matchTimers.get(player1.socket)!);
        matchTimers.delete(player1.socket);
      }
      if (matchTimers.has(player2.socket)) {
        clearTimeout(matchTimers.get(player2.socket)!);
        matchTimers.delete(player2.socket);
      }

      // Create game in database with game mode and team info
      const gameMode = data.gameSettings?.gameMode || 'coop';
      const team1Players = data.team1Players ? JSON.stringify(data.team1Players) : null;
      const team2Players = data.team2Players ? JSON.stringify(data.team2Players) : null;
      const tournamentId = data.tournamentId || null;
      const tournamentMatchId = data.tournamentMatchId || null;
      
      db.run(
        'INSERT INTO games (player1_id, player2_id, game_mode, team1_players, team2_players, tournament_id, tournament_match_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [player1.userId, player2.userId, gameMode, team1Players, team2Players, tournamentId, tournamentMatchId],
        function(this: sqlite3.RunResult, err: Error | null) {
          if (!err) {
            const game = new PongGame(player1, player2, this.lastID!, data.gameSettings);
            activeGames.set(this.lastID!, game);
            
            // Notify players game started
            const startMessage = {
              type: 'gameStart',
              gameId: this.lastID,
              players: {
                player1: { userId: player1.userId, username: player1.username },
                player2: { userId: player2.userId, username: player2.username }
              },
              gameSettings: data.gameSettings
            };
            
            player1.socket.send(JSON.stringify(startMessage));
            player2.socket.send(JSON.stringify(startMessage));
          }
        }
      );
    } else {
      socket.send(JSON.stringify({
        type: 'waiting',
        message: 'Waiting for opponent...'
      }));

      // If no opponent joins after 5 seconds, start with dummy opponent
      const timer = setTimeout(() => {
        console.log('Timer triggered after 5 seconds. Current waiting players:', waitingPlayers.length);
        // If still waiting and only one player
        if (waitingPlayers.length === 1 && waitingPlayers[0].socket === socket) {
          console.log('Starting bot match for player:', waitingPlayers[0].username);
          const player1 = waitingPlayers.shift()!;
          matchTimers.delete(socket); // Clean up timer reference
          // Create dummy opponent
          const dummySocket = {
            readyState: WebSocket.OPEN,
            send: () => {} // No-op
          } as unknown as WebSocket;
          const player2: GamePlayer = {
            userId: 0,
            username: 'Bot',
            socket: dummySocket
          };
          
          const gameMode = data.gameSettings?.gameMode || 'coop';
          const team1Players = data.team1Players ? JSON.stringify(data.team1Players) : null;
          const team2Players = data.team2Players ? JSON.stringify(data.team2Players) : null;
          const tournamentId = data.tournamentId || null;
          const tournamentMatchId = data.tournamentMatchId || null;
          
          db.run(
            'INSERT INTO games (player1_id, player2_id, game_mode, team1_players, team2_players, tournament_id, tournament_match_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [player1.userId, player2.userId, gameMode, team1Players, team2Players, tournamentId, tournamentMatchId],
            function(this: sqlite3.RunResult, err: Error | null) {
              if (!err) {
                const game = new PongGame(player1, player2, this.lastID!, data.gameSettings);
                activeGames.set(this.lastID!, game);
                // Notify real player game started
                const startMessage = {
                  type: 'gameStart',
                  gameId: this.lastID,
                  players: {
                    player1: { userId: player1.userId, username: player1.username },
                    player2: { userId: player2.userId, username: player2.username }
                  },
                  gameSettings: data.gameSettings
                };
                console.log('About to send gameStart to:', player1.username, player1.socket.readyState);
                player1.socket.send(JSON.stringify(startMessage));
                console.log('Sent gameStart to:', player1.username);
                player1.socket.send(JSON.stringify(startMessage));
              }
            }
          );
        }
      }, 5000);
      
      // Store the timer reference
      matchTimers.set(socket, timer);
    }
  }

  function handleJoinBotGame(socket: WebSocket, data: JoinGameMessage): void {
    console.log('handleJoinBotGame called with:', data);
    console.log('Game settings received:', data.gameSettings);
    console.log('🏆 [TOURNAMENT-CHECK] player2Id:', data.player2Id, 'player2Name:', data.player2Name, 'gameMode:', data.gameSettings?.gameMode);
    
    const player1: GamePlayer = {
      userId: data.userId,
      username: data.username,
      socket: socket
    };

    // Check if this is a tournament match with two real players
    let player2: GamePlayer;
    
    if (data.gameSettings?.gameMode === 'tournament' && data.player2Id && data.player2Id !== 0) {
      // Tournament match: player2 is also a real player (local)
      // In tournament mode, both players control their paddles locally on the same machine
      console.log('🏆 [TOURNAMENT] Creating tournament match with player2 ID:', data.player2Id);
      console.log('🏆 [TOURNAMENT] Player 2 name:', data.player2Name);
      
      // Create a dummy socket for player2 since they're on the same machine
      const dummySocket = {
        readyState: WebSocket.OPEN,
        send: () => {} // No-op since both players share the same connection
      } as unknown as WebSocket;
      
      player2 = {
        userId: data.player2Id,
        username: data.player2Name || `Player ${data.player2Id}`,
        socket: dummySocket
      };
    } else {
      // Regular bot match
      const dummySocket = {
        readyState: WebSocket.OPEN,
        send: () => {} // No-op
      } as unknown as WebSocket;
      
      player2 = {
        userId: 0,
        username: 'Bot',
        socket: dummySocket
      };
    }

    // Create game in database with game mode and team info
    const gameMode = data.gameSettings?.gameMode || 'coop';
    const team1Players = data.team1Players ? JSON.stringify(data.team1Players) : null;
    const team2Players = data.team2Players ? JSON.stringify(data.team2Players) : null;
    const tournamentId = data.tournamentId || null;
    const tournamentMatchId = data.tournamentMatchId || null;
    
    console.log('🎮 [GAME-CREATE] Creating game:', {
      player1Id: player1.userId,
      player2Id: player2.userId,
      gameMode,
      tournamentId,
      tournamentMatchId
    });
    
    db.run(
      'INSERT INTO games (player1_id, player2_id, game_mode, team1_players, team2_players, tournament_id, tournament_match_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [player1.userId, player2.userId, gameMode, team1Players, team2Players, tournamentId, tournamentMatchId],
      function(this: sqlite3.RunResult, err: Error | null) {
        if (!err) {
          const game = new PongGame(player1, player2, this.lastID!, data.gameSettings);
          activeGames.set(this.lastID!, game);
          
          // Notify player game started
          const startMessage = {
            type: 'gameStart',
            gameId: this.lastID,
            players: {
              player1: { userId: player1.userId, username: player1.username },
              player2: { userId: player2.userId, username: player2.username }
            },
            gameSettings: data.gameSettings
          };
          console.log('🎮 [BOT-GAME] Sending gameStart message:', startMessage);
          player1.socket.send(JSON.stringify(startMessage));
          console.log('🎮 [BOT-GAME] Game started for:', player1.username, 'vs', player2.username);
          
        // --- Fix: Also send initial gameState after gameStart ---
          setTimeout(() => {
            game.broadcastGameState();
        }, 100);
      } else {
        console.error('Failed to create game:', err);
        // --- Fix: Send error message to frontend if match creation fails ---
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to start match. Please try again.<Backend>'
        }));
      }
    }
  );
}

  function handleMovePaddle(socket: WebSocket, data: MovePaddleMessage): void {
    console.log('🎮 [HANDLE-MOVE] handleMovePaddle called with:', data);
    console.log('🎮 [HANDLE-MOVE] Active games count:', activeGames.size);
    
    // Find the game this player is in
    for (let [gameId, game] of activeGames) {
      console.log('🎮 [HANDLE-MOVE] Checking game:', gameId);
      console.log('🎮 [HANDLE-MOVE] Player1 socket === current socket:', game.player1.socket === socket);
      console.log('🎮 [HANDLE-MOVE] Player2 socket === current socket:', game.player2.socket === socket);
      
      if (game.player1.socket === socket || game.player2.socket === socket) {
        // Determine which player this socket belongs to
        const socketPlayerId = game.player1.socket === socket ? 
          game.player1.userId : game.player2.userId;
        console.log('🎮 [HANDLE-MOVE] Found game', gameId, 'for socket player', socketPlayerId, 'direction:', data.direction);
        
        // For tournament local multiplayer, use data.playerId to distinguish which paddle
        // For other modes, use the socket-determined playerId
        const targetPlayerId = data.playerId || socketPlayerId;
        console.log('🎮 [HANDLE-MOVE] Target paddle playerId:', targetPlayerId, '(from data.playerId:', data.playerId, ')');
        
        // Pass paddleIndex for arcade mode
        if (data.paddleIndex !== undefined) {
          console.log('🎮 [HANDLE-MOVE] Arcade mode - paddleIndex:', data.paddleIndex);
          game.movePaddle(targetPlayerId, data.direction, data.paddleIndex);
        } else {
          game.movePaddle(targetPlayerId, data.direction);
        }
        
        console.log('🎮 [HANDLE-MOVE] Paddle movement executed for playerId', targetPlayerId);
        return; // Found the game, no need to continue
      }
    }
    
    console.log('🎮 [HANDLE-MOVE] No game found for this socket');
  }

  function handlePauseGame(socket: WebSocket, data: any): void {
    console.log('⏸️ [HANDLE-PAUSE] handlePauseGame called with:', data);
    console.log('⏸️ [HANDLE-PAUSE] Active games count:', activeGames.size);
    
    // Find the game this player is in
    for (let [gameId, game] of activeGames) {
      console.log('⏸️ [HANDLE-PAUSE] Checking game:', gameId);
      
      if (game.player1.socket === socket || game.player2.socket === socket) {
        const playerId = game.player1.socket === socket ? 
          game.player1.userId : game.player2.userId;
        console.log(`⏸️ [HANDLE-PAUSE] Found game ${gameId} for player ${playerId}, current paused state: ${game.isPaused}`);
        
        // Toggle pause state based on the message
        if (data.paused !== undefined) {
          if (data.paused && !game.isPaused) {
            game.pauseGame();
            console.log(`⏸️ [HANDLE-PAUSE] Game ${gameId} paused by player ${playerId}`);
          } else if (!data.paused && game.isPaused) {
            game.resumeGame();
            console.log(`▶️ [HANDLE-PAUSE] Game ${gameId} resumed by player ${playerId}`);
          }
        } else {
          // If no paused state specified, toggle current state
          game.togglePause();
          console.log(`🔄 [HANDLE-PAUSE] Game ${gameId} pause toggled by player ${playerId}, new state: ${game.isPaused ? 'paused' : 'resumed'}`);
        }
        return; // Found the game, no need to continue
      }
    }
    
    console.log('⏸️ [HANDLE-PAUSE] No game found for this socket');
  }

  function handleDisconnect(socket: WebSocket): void {
    // Remove from online users tracking
    removeOnlineUser(socket);
    
    // Remove from waiting players
    const waitingIndex = waitingPlayers.findIndex(p => p.socket === socket);
    if (waitingIndex > -1) {
      waitingPlayers.splice(waitingIndex, 1);
    }
    
    // Clear any pending match timer for this socket
    if (matchTimers.has(socket)) {
      clearTimeout(matchTimers.get(socket)!);
      matchTimers.delete(socket);
    }

    // Handle active games
    for (let [gameId, game] of activeGames) {
      if (game.player1.socket === socket || game.player2.socket === socket) {
        game.endGame();
        break;
      }
    }
  }

  // Get game history
  fastify.get<{
    Params: { userId: string };
  }>('/history/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    return new Promise<void>((resolve, reject) => {
      db.all(
        `SELECT g.*
         FROM games g
         WHERE g.player1_id = ? OR g.player2_id = ?
         ORDER BY g.started_at DESC
         LIMIT 50`,
        [userId, userId],
        async (err: Error | null, games: GameRecord[]) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            try {
              // Enrich games with player names from user service
              const enrichedGames: GameRecord[] = [];
              
              console.log(`[GAME-SERVICE] Enriching ${games.length} games for user ${userId}`);
              
              for (const game of games) {
                const enrichedGame = { ...game };
                
                console.log(`[GAME-SERVICE] Game ${game.id}:`, {
                  player1_id: game.player1_id,
                  player2_id: game.player2_id,
                  game_mode: game.game_mode,
                  tournament_match_id: (game as any).tournament_match_id
                });
                
                // Fetch player names from user service
                try {
                  if (game.player1_id) {
                    const player1Response = await fetch(`http://user-service:3000/profile/${game.player1_id}`);
                    if (player1Response.ok) {
                      const player1Data = await player1Response.json() as any;
                      enrichedGame.player1_name = player1Data.display_name || `User${game.player1_id}`;
                    } else {
                      enrichedGame.player1_name = `User${game.player1_id}`;
                    }
                  }
                  
                  if (game.player2_id) {
                    const player2Response = await fetch(`http://user-service:3000/profile/${game.player2_id}`);
                    if (player2Response.ok) {
                      const player2Data = await player2Response.json() as any;
                      enrichedGame.player2_name = player2Data.display_name || `User${game.player2_id}`;
                    } else {
                      enrichedGame.player2_name = `User${game.player2_id}`;
                    }
                  }
                } catch (fetchError) {
                  console.log('Could not fetch player names:', fetchError);
                  enrichedGame.player1_name = `User${game.player1_id}`;
                  enrichedGame.player2_name = `User${game.player2_id}`;
                }
                
                enrichedGames.push(enrichedGame);
              }
              
              reply.send(enrichedGames);
              resolve();
            } catch (error) {
              console.error('Error enriching games:', error);
              reply.status(500).send({ error: 'Error fetching game history' });
              reject(error);
            }
          }
        }
      );
    });
  });

  // Get game statistics
  fastify.get<{
    Params: { userId: string };
  }>('/stats/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    return new Promise<void>((resolve, reject) => {
      db.get(
        `SELECT 
         COUNT(*) as total_games,
         SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins,
         SUM(CASE WHEN winner_id != ? AND winner_id IS NOT NULL THEN 1 ELSE 0 END) as losses
         FROM games 
         WHERE (player1_id = ? OR player2_id = ?) AND status = 'finished'`,
        [userId, userId, userId, userId],
        (err: Error | null, stats: any) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            const gameStats: GameStats = {
              totalGames: stats.total_games || 0,
              wins: stats.wins || 0,
              losses: stats.losses || 0,
              winRate: stats.total_games > 0 ? parseFloat(((stats.wins || 0) / stats.total_games * 100).toFixed(2)) : 0
            };
            reply.send(gameStats);
            resolve();
          }
        }
      );
    });
  });

  // Get currently online users
  fastify.get('/online', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const onlineUsersList: OnlineUser[] = Array.from(onlineUsers.entries()).map(([userId, userData]) => ({
        user_id: userId,
        username: userData.username,
        display_name: userData.username,
        status: 'online',
        last_seen: userData.lastSeen.toISOString(),
        is_bot: false
      }));

      // Always include bot players as "online"
      const botPlayers: OnlineUser[] = [
        {
          user_id: 'bot_easy',
          username: 'EasyBot',
          display_name: 'Easy Bot ⚡',
          status: 'online',
          last_seen: new Date().toISOString(),
          is_bot: true
        },
        {
          user_id: 'bot_medium',
          username: 'MediumBot', 
          display_name: 'Medium Bot ⚔️',
          status: 'online',
          last_seen: new Date().toISOString(),
          is_bot: true
        },
        {
          user_id: 'bot_hard',
          username: 'HardBot',
          display_name: 'Hard Bot 🔥',
          status: 'online', 
          last_seen: new Date().toISOString(),
          is_bot: true
        }
      ];

      const allOnlineUsers = [...onlineUsersList, ...botPlayers];
      console.log(`Returning ${allOnlineUsers.length} online users (${onlineUsersList.length} real, ${botPlayers.length} bots)`);
      reply.send(allOnlineUsers);
    } catch (error) {
      console.error('Error getting online users:', error);
      reply.status(500).send({ error: 'Error fetching online users' });
    }
  });
}

export default gameRoutes;
