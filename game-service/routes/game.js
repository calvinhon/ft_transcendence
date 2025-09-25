// --- Global Chat WebSocket ---
const chatClients = new Set();

// --- Online Users Tracking ---
const onlineUsers = new Map(); // userId -> {username, socket, lastSeen}

// Add user to online tracking when they connect
function addOnlineUser(userId, username, socket) {
  onlineUsers.set(userId, {
    username: username,
    socket: socket,
    lastSeen: new Date()
  });
  console.log(`User ${username} (${userId}) is now online. Total online: ${onlineUsers.size}`);
}

// Remove user from online tracking
function removeOnlineUser(socket) {
  for (const [userId, userData] of onlineUsers) {
    if (userData.socket === socket) {
      console.log(`User ${userData.username} (${userId}) went offline. Total online: ${onlineUsers.size - 1}`);
      onlineUsers.delete(userId);
      break;
    }
  }
}

async function chatRoutes(fastify, options) {
  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    chatClients.add(connection.socket);
    
    connection.socket.on('message', (message) => {
      try {
        const messageStr = message.toString();
        
        // Check if this is a JSON message with user authentication
        try {
          const data = JSON.parse(messageStr);
          if (data.type === 'userConnect') {
            // Track user as online when they connect to chat
            addOnlineUser(data.userId, data.username, connection.socket);
            connection.socket.send(JSON.stringify({
              type: 'connectionAck',
              message: 'Connected to chat and tracked as online'
            }));
            return;
          }
        } catch (e) {
          // Not JSON, treat as regular chat message
        }
        
        // Broadcast received message to all clients EXCEPT the sender
        for (const client of chatClients) {
          if (client.readyState === 1 && client !== connection.socket) {
            client.send(messageStr);
          }
        }
      } catch (error) {
        console.error('Chat WebSocket message error:', error);
      }
    });
    
    connection.socket.on('close', () => {
      chatClients.delete(connection.socket);
      removeOnlineUser(connection.socket);
    });
  });
}
// game-service/routes/game.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/games.db');

// Game state management
const activeGames = new Map();
const waitingPlayers = [];
const matchTimers = new Map(); // Track timeout timers for each socket

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
        player1_score INTEGER DEFAULT 0,
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

class PongGame {
  constructor(player1, player2, gameId) {
    this.gameId = gameId;
    this.player1 = player1;
    this.player2 = player2;
    this.ball = { x: 400, y: 300, dx: 5, dy: 3 };
    this.paddles = {
      player1: { y: 250, x: 50 },
      player2: { y: 250, x: 750 }
    };
    this.scores = { player1: 0, player2: 0 };
    this.gameState = 'playing';
    this.maxScore = 5;
    
    this.startGameLoop();
  }

  startGameLoop() {
    this.gameInterval = setInterval(() => {
      if (this.gameState === 'finished') {
        clearInterval(this.gameInterval);
        return;
      }
      // If player2 is bot, move bot paddle
      if (this.player2.userId === 0) {
        this.moveBotPaddle();
      }
      this.updateBall();
      this.broadcastGameState();
    }, 1000 / 60); // 60 FPS
  }

  moveBotPaddle() {
    // Simple AI: move bot paddle towards ball
    const botPaddle = this.paddles.player2;
    const ballY = this.ball.y;
    // Center of paddle
    const paddleCenter = botPaddle.y + 50;
    if (paddleCenter < ballY - 10 && botPaddle.y < 500) {
      botPaddle.y += 10; // Move down
    } else if (paddleCenter > ballY + 10 && botPaddle.y > 0) {
      botPaddle.y -= 10; // Move up
    }
  }

  updateBall() {
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
      this.ball.dx = -this.ball.dx;
    }

    if (this.ball.x >= 740 && this.ball.y >= this.paddles.player2.y && 
        this.ball.y <= this.paddles.player2.y + 100) {
      this.ball.dx = -this.ball.dx;
    }

    // Scoring
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

  resetBall() {
    this.ball = { x: 400, y: 300, dx: 5 * (Math.random() > 0.5 ? 1 : -1), dy: 3 * (Math.random() > 0.5 ? 1 : -1) };
  }

  movePaddle(playerId, direction) {
    const paddle = playerId === this.player1.userId ? 'player1' : 'player2';
    if (direction === 'up' && this.paddles[paddle].y > 0) {
      this.paddles[paddle].y -= 5;
    } else if (direction === 'down' && this.paddles[paddle].y < 500) {
      this.paddles[paddle].y += 5;
    }
  }

  broadcastGameState() {
    const gameState = {
      type: 'gameState',
      ball: this.ball,
      paddles: this.paddles,
      scores: this.scores,
      gameState: this.gameState
    };

    if (this.player1.socket.readyState === 1) {
      this.player1.socket.send(JSON.stringify(gameState));
    }
    if (this.player2.socket.readyState === 1) {
      this.player2.socket.send(JSON.stringify(gameState));
    }
  }

  endGame() {
    this.gameState = 'finished';
    clearInterval(this.gameInterval);
    
    const winnerId = this.scores.player1 > this.scores.player2 ? 
      this.player1.userId : this.player2.userId;

    // Update database
    db.run(
      'UPDATE games SET player1_score = ?, player2_score = ?, status = ?, finished_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?',
      [this.scores.player1, this.scores.player2, 'finished', winnerId, this.gameId]
    );

    // Notify players
    const endMessage = {
      type: 'gameEnd',
      winner: winnerId,
      scores: this.scores
    };

    if (this.player1.socket.readyState === 1) {
      this.player1.socket.send(JSON.stringify(endMessage));
    }
    if (this.player2.socket.readyState === 1) {
      this.player2.socket.send(JSON.stringify(endMessage));
    }

    // Remove from active games
    activeGames.delete(this.gameId);
  }
}

async function routes(fastify, options) {
  await chatRoutes(fastify, options);
  // WebSocket connection for real-time game
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    console.log('=== NEW WEBSOCKET CONNECTION ESTABLISHED ===');
    console.log('Connection from:', req.socket.remoteAddress);
      
      connection.socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data);
        
        switch (data.type) {
          case 'userConnect':
            // Track user as online when they connect with authentication
            addOnlineUser(data.userId, data.username, connection.socket);
            connection.socket.send(JSON.stringify({
              type: 'connectionAck',
              message: 'You are now tracked as online'
            }));
            break;
          case 'joinGame':
            handleJoinGame(connection.socket, data);
            break;
          case 'joinBotGame':
            handleJoinBotGame(connection.socket, data);
            break;
          case 'movePaddle':
            handleMovePaddle(connection.socket, data);
            break;
          case 'disconnect':
            handleDisconnect(connection.socket);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    connection.socket.on('close', () => {
      handleDisconnect(connection.socket);
    });
  });

  function handleJoinGame(socket, data) {
    console.log('handleJoinGame called with:', data);
    
    // Track this user as online
    addOnlineUser(data.userId, data.username, socket);
    
    const player = {
      userId: data.userId,
      username: data.username,
      socket: socket
    };

    waitingPlayers.push(player);
    console.log('Current waiting players:', waitingPlayers.length);

    if (waitingPlayers.length >= 2) {
      const player1 = waitingPlayers.shift();
      const player2 = waitingPlayers.shift();
      
      // Clear any existing timers for these players
      if (matchTimers.has(player1.socket)) {
        clearTimeout(matchTimers.get(player1.socket));
        matchTimers.delete(player1.socket);
      }
      if (matchTimers.has(player2.socket)) {
        clearTimeout(matchTimers.get(player2.socket));
        matchTimers.delete(player2.socket);
      }

      // Create game in database
      db.run(
        'INSERT INTO games (player1_id, player2_id) VALUES (?, ?)',
        [player1.userId, player2.userId],
        function(err) {
          if (!err) {
            const game = new PongGame(player1, player2, this.lastID);
            activeGames.set(this.lastID, game);
            
            // Notify players game started
            const startMessage = {
              type: 'gameStart',
              gameId: this.lastID,
              players: {
                player1: { userId: player1.userId, username: player1.username },
                player2: { userId: player2.userId, username: player2.username }
              }
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
          const player1 = waitingPlayers.shift();
          matchTimers.delete(socket); // Clean up timer reference
          // Create dummy opponent
          const dummySocket = {
            readyState: 1,
            send: () => {} // No-op
          };
          const player2 = {
            userId: 0,
            username: 'Bot',
            socket: dummySocket
          };
          db.run(
            'INSERT INTO games (player1_id, player2_id) VALUES (?, ?)',
            [player1.userId, player2.userId],
            function(err) {
              if (!err) {
                const game = new PongGame(player1, player2, this.lastID);
                activeGames.set(this.lastID, game);
                // Notify real player game started
                const startMessage = {
                  type: 'gameStart',
                  gameId: this.lastID,
                  players: {
                    player1: { userId: player1.userId, username: player1.username },
                    player2: { userId: player2.userId, username: player2.username }
                  }
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

  function handleJoinBotGame(socket, data) {
    console.log('handleJoinBotGame called with:', data);
    
    const player1 = {
      userId: data.userId,
      username: data.username,
      socket: socket
    };

    // Create immediate bot match without waiting
    const dummySocket = {
      readyState: 1,
      send: () => {} // No-op
    };
    
    const player2 = {
      userId: 0,
      username: 'Bot',
      socket: dummySocket
    };

    // Create game in database
    db.run(
      'INSERT INTO games (player1_id, player2_id) VALUES (?, ?)',
      [player1.userId, player2.userId],
      function(err) {
        if (!err) {
          const game = new PongGame(player1, player2, this.lastID);
          activeGames.set(this.lastID, game);
          
          // Notify player game started
          const startMessage = {
            type: 'gameStart',
            gameId: this.lastID,
            players: {
              player1: { userId: player1.userId, username: player1.username },
              player2: { userId: player2.userId, username: player2.username }
            }
          };
          player1.socket.send(JSON.stringify(startMessage));
          console.log('Bot game started immediately for:', player1.username);
        } else {
          console.error('Failed to create bot game:', err);
        }
      }
    );
  }

  function handleMovePaddle(socket, data) {
    // Find the game this player is in
    for (let [gameId, game] of activeGames) {
      if (game.player1.socket === socket || game.player2.socket === socket) {
        const playerId = game.player1.socket === socket ? 
          game.player1.userId : game.player2.userId;
        game.movePaddle(playerId, data.direction);
        break;
      }
    }
  }

  function handleDisconnect(socket) {
    // Remove from online users tracking
    removeOnlineUser(socket);
    
    // Remove from waiting players
    const waitingIndex = waitingPlayers.findIndex(p => p.socket === socket);
    if (waitingIndex > -1) {
      waitingPlayers.splice(waitingIndex, 1);
    }
    
    // Clear any pending match timer for this socket
    if (matchTimers.has(socket)) {
      clearTimeout(matchTimers.get(socket));
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
  fastify.get('/history/:userId', async (request, reply) => {
    const { userId } = request.params;

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT g.*
         FROM games g
         WHERE g.player1_id = ? OR g.player2_id = ?
         ORDER BY g.started_at DESC
         LIMIT 50`,
        [userId, userId],
        async (err, games) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            try {
              // Enrich games with player names from user service
              const enrichedGames = [];
              
              for (const game of games) {
                const enrichedGame = { ...game };
                
                // Fetch player names from user service
                try {
                  if (game.player1_id) {
                    const player1Response = await fetch(`http://user-service:3000/profile/${game.player1_id}`);
                    if (player1Response.ok) {
                      const player1Data = await player1Response.json();
                      enrichedGame.player1_name = player1Data.display_name || `User${game.player1_id}`;
                    } else {
                      enrichedGame.player1_name = `User${game.player1_id}`;
                    }
                  }
                  
                  if (game.player2_id) {
                    const player2Response = await fetch(`http://user-service:3000/profile/${game.player2_id}`);
                    if (player2Response.ok) {
                      const player2Data = await player2Response.json();
                      enrichedGame.player2_name = player2Data.display_name || `User${game.player2_id}`;
                    } else {
                      enrichedGame.player2_name = `User${game.player2_id}`;
                    }
                  }
                } catch (fetchError) {
                  console.log('Could not fetch player names:', fetchError.message);
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
  fastify.get('/stats/:userId', async (request, reply) => {
    const { userId } = request.params;

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT 
         COUNT(*) as total_games,
         SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins,
         SUM(CASE WHEN winner_id != ? AND winner_id IS NOT NULL THEN 1 ELSE 0 END) as losses
         FROM games 
         WHERE (player1_id = ? OR player2_id = ?) AND status = 'finished'`,
        [userId, userId, userId, userId],
        (err, stats) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send({
              totalGames: stats.total_games || 0,
              wins: stats.wins || 0,
              losses: stats.losses || 0,
              winRate: stats.total_games > 0 ? ((stats.wins || 0) / stats.total_games * 100).toFixed(2) : 0
            });
            resolve();
          }
        }
      );
    });
  });

  // Get currently online users
  fastify.get('/online', async (request, reply) => {
    try {
      const onlineUsersList = Array.from(onlineUsers.entries()).map(([userId, userData]) => ({
        user_id: parseInt(userId),
        username: userData.username,
        display_name: userData.username,
        status: 'online',
        last_seen: userData.lastSeen.toISOString(),
        is_bot: false
      }));

      // Always include bot players as "online"
      const botPlayers = [
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

module.exports = routes;