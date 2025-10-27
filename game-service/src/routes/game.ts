// game-service/src/routes/game.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as WebSocket from 'ws';

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
  gameState: 'playing' | 'finished';
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
    // Create games table
    db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER NOT NULL,
        player1_sc
		ore INTEGER DEFAULT 0,
        player2_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        winner_id INTEGER
      )
    `);

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
  gameState: 'playing' | 'finished';
  maxScore: number;
  lastStateTime: number;
  isPaused: boolean;
  private gameInterval?: NodeJS.Timeout;
  
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
      scoreToWin: 3
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
    
    this.paddles = {
      player1: { y: 250, x: 50 },
      player2: { y: 250, x: 750 }
    };
    this.scores = { player1: 0, player2: 0 };
    this.gameState = 'playing';
    this.maxScore = this.gameSettings.scoreToWin;
    this.lastStateTime = 0;
    this.isPaused = false;
    
    console.log(`🎮 [GAME-${this.gameId}] Created with settings:`, this.gameSettings);
    
    this.startGameLoop();
  }

  private getBallSpeedValue(speed: 'slow' | 'medium' | 'fast'): number {
    switch (speed) {
      case 'slow': return 3;
      case 'medium': return 5;
      case 'fast': return 7;
      default: return 5;
    }
  }

  private getPaddleSpeedValue(speed: 'slow' | 'medium' | 'fast'): number {
    switch (speed) {
      case 'slow': return 5;
      case 'medium': return 8;
      case 'fast': return 12;
      default: return 8;
    }
  }

  private getInitialBallDirection(): number {
    return Math.random() > 0.5 ? 1 : -1;
  }

  startGameLoop(): void {
    this.gameInterval = setInterval(() => {
      if (this.gameState === 'finished') {
        if (this.gameInterval) {
          clearInterval(this.gameInterval);
        }
        return;
      }
      
      // Don't update game logic if paused, but still broadcast current state
      if (!this.isPaused) {
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
    const botPaddle = this.paddles.player2;
    const ballY = this.ball.y;
    const paddleCenter = botPaddle.y + 50;
    
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
        moveSpeed = 3;
        reactionDelay = Math.random() > 0.8; // 20% chance bot doesn't react
        errorMargin = 30; // Medium error margin
        break;
      case 'hard':
        moveSpeed = 5;
        reactionDelay = Math.random() > 0.95; // 5% chance bot doesn't react
        errorMargin = 10; // Small error margin
        break;
      default:
        moveSpeed = 3;
        reactionDelay = Math.random() > 0.8;
        errorMargin = 30;
    }
    
    if (reactionDelay) return; // Sometimes bot doesn't react
    
    if (paddleCenter < ballY - errorMargin && botPaddle.y < 500) {
      botPaddle.y = Math.min(500, botPaddle.y + moveSpeed); // Move down
    } else if (paddleCenter > ballY + errorMargin && botPaddle.y > 0) {
      botPaddle.y = Math.max(0, botPaddle.y - moveSpeed); // Move up
    }
  }

  updateBall(): void {
    if (this.gameState !== 'playing') return;

    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // Ball collision with top/bottom walls
    if (this.ball.y <= 0 || this.ball.y >= 600) {
      this.ball.dy = -this.ball.dy;
    }

    // Ball collision with paddles
    if (this.ball.x <= 60 && this.ball.y >= this.paddles.player1.y &&
        this.ball.y <= this.paddles.player1.y + 100) {
      // Calculate hit position on paddle (0 = top, 1 = bottom)
      const hitPos = (this.ball.y - this.paddles.player1.y) / 100;
      // Angle proportional to hit position: middle = 0°, edges = ±90°
      const angle = (hitPos - 0.5) * Math.PI / 2; // -90° to +90°

      const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
      this.ball.dx = Math.abs(speed) * Math.cos(angle);
      this.ball.dy = speed * Math.sin(angle);

      if (this.accelerateOnHit) {
        this.ball.dx *= 1.1; // Increase speed by 10%
        this.ball.dy *= 1.1;
      }
    }

    if (this.ball.x >= 740 && this.ball.y >= this.paddles.player2.y &&
        this.ball.y <= this.paddles.player2.y + 100) {
      // Calculate hit position on paddle (0 = top, 1 = bottom)
      const hitPos = (this.ball.y - this.paddles.player2.y) / 100;
      // Angle proportional to hit position: middle = 180°, edges = 90° to 270°
      const angle = Math.PI + (hitPos - 0.5) * Math.PI / 2; // 90° to 270°

      const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
      this.ball.dx = -Math.abs(speed) * Math.cos(angle);
      this.ball.dy = speed * Math.sin(angle);

      if (this.accelerateOnHit) {
        this.ball.dx *= 1.1; // Increase speed by 10%
        this.ball.dy *= 1.1;
      }
    }    // Scoring
    if (this.ball.x < 0) {
      this.scores.player2++;
      this.resetBall();
    } else if (this.ball.x > 800) {
      this.scores.player1++;
      this.resetBall();
    }

    // Check win condition
    if (this.scores.player1 >= this.maxScore || this.scores.player2 >= this.maxScore) {
      this.endGame();
    }
  }

  resetBall(): void {
    this.ball = { 
      x: 400, 
      y: 300, 
      dx: this.getInitialBallDirection() * this.ballSpeed, 
      dy: (Math.random() - 0.5) * this.ballSpeed 
    };
    
    // Add a short pause when ball resets to make game feel more natural
    setTimeout(() => {
      console.log(`🏓 [GAME-${this.gameId}] Ball reset. Current scores: Player1=${this.scores.player1}, Player2=${this.scores.player2}`);
    }, 100);
  }

  movePaddle(playerId: number, direction: 'up' | 'down'): void {
    console.log('🏓 [MOVEPLADDLE] Called with playerId:', playerId, 'direction:', direction);
    console.log('🏓 [MOVEPLADDLE] player1.userId:', this.player1.userId, 'player2.userId:', this.player2.userId);
    
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
    console.log(`🏁 [GAME-${this.gameId}] Game ending. Final scores: Player1=${this.scores.player1}, Player2=${this.scores.player2}`);
    this.gameState = 'finished';
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    
    const winnerId = this.scores.player1 > this.scores.player2 ? 
      this.player1.userId : this.player2.userId;

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

    // Remove from active games
    activeGames.delete(this.gameId);
    console.log(`🗑️ [GAME-${this.gameId}] Game removed from active games. Active games count: ${activeGames.size}`);
  }
}

async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/ws/chat', { websocket: true }, (connection: SocketStream, req: FastifyRequest) => {
    const timestamp = new Date().toISOString();
    console.log(`🔵 [GAME-SERVICE] [${timestamp}] 🔌 Chat WebSocket connection opened`);
    
    chatClients.add(connection.socket);
    
    connection.socket.on('message', (message: Buffer | string) => {
      try {
        const messageStr = message.toString();
        const timestamp = new Date().toISOString();
        
        console.log(`🔵 [GAME-SERVICE] [${timestamp}] 📨 Chat WS message received:`, messageStr.substring(0, 100));
        
        // Check if this is a JSON message with user authentication
        try {
          const data = JSON.parse(messageStr) as WebSocketMessage;
          if (data.type === 'userConnect') {
            console.log(`🔵 [GAME-SERVICE] 👤 User connecting to chat: ${data.username} (${data.userId})`);
            // Track user as online when they connect to chat
            addOnlineUser(data.userId, data.username, connection.socket);
            const ackMessage = JSON.stringify({
              type: 'connectionAck',
              message: 'Connected to chat and tracked as online'
            });
            connection.socket.send(ackMessage);
            console.log(`🔵 [GAME-SERVICE] 📤 Sent connection ack to ${data.username}`);
            return;
          }
        } catch (e) {
          // Not JSON, treat as regular chat message
          console.log(`🔵 [GAME-SERVICE] 💬 Broadcasting chat message to ${chatClients.size - 1} clients`);
        }
        
        // Broadcast received message to all clients EXCEPT the sender
        let broadcastCount = 0;
        for (const client of chatClients) {
          if (client.readyState === WebSocket.OPEN && client !== connection.socket) {
            client.send(messageStr);
            broadcastCount++;
          }
        }
        console.log(`🔵 [GAME-SERVICE] 📡 Message broadcasted to ${broadcastCount} clients`);
      } catch (error) {
        console.error(`🔴 [GAME-SERVICE] Chat WebSocket message error:`, error);
      }
    });
    
    connection.socket.on('close', () => {
      const timestamp = new Date().toISOString();
      console.log(`🔵 [GAME-SERVICE] [${timestamp}] 🔌 Chat WebSocket connection closed`);
      chatClients.delete(connection.socket);
      removeOnlineUser(connection.socket);
    });
    
    connection.socket.on('error', (error: Error) => {
      const timestamp = new Date().toISOString();
      console.error(`🔴 [GAME-SERVICE] [${timestamp}] Chat WebSocket error:`, error);
    });
  });
}

async function gameRoutes(fastify: FastifyInstance): Promise<void> {
  await chatRoutes(fastify);
  
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
            connection.socket.send(JSON.stringify({
              type: 'connectionAck',
              message: 'You are now tracked as online'
            }));
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

      // Create game in database
      db.run(
        'INSERT INTO games (player1_id, player2_id) VALUES (?, ?)',
        [player1.userId, player2.userId],
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
          db.run(
            'INSERT INTO games (player1_id, player2_id) VALUES (?, ?)',
            [player1.userId, player2.userId],
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
    
    const player1: GamePlayer = {
      userId: data.userId,
      username: data.username,
      socket: socket
    };

    // Create immediate bot match without waiting
    const dummySocket = {
      readyState: WebSocket.OPEN,
      send: () => {} // No-op
    } as unknown as WebSocket;
    
    const player2: GamePlayer = {
      userId: 0,
      username: 'Bot',
      socket: dummySocket
    };

    // Create game in database
    db.run(
      'INSERT INTO games (player1_id, player2_id) VALUES (?, ?)',
      [player1.userId, player2.userId],
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
          console.log('🎮 [BOT-GAME] Bot game started immediately for:', player1.username);
          
          // Give a small delay to ensure gameStart message is processed before gameState messages
          setTimeout(() => {
            console.log('🎮 [BOT-GAME] Game should be fully initialized now');
          }, 100);
        } else {
          console.error('Failed to create bot game:', err);
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
        const playerId = game.player1.socket === socket ? 
          game.player1.userId : game.player2.userId;
        console.log('🎮 [HANDLE-MOVE] Found game', gameId, 'for player', playerId, 'direction:', data.direction);
        game.movePaddle(playerId, data.direction);
        console.log('🎮 [HANDLE-MOVE] Paddle movement executed for player', playerId);
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
              
              for (const game of games) {
                const enrichedGame = { ...game };
                
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