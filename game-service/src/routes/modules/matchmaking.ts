// game-service/src/routes/modules/matchmaking.ts
import { GamePlayer, JoinGameMessage } from './types';
import { db } from './database';
import { PongGame, activeGames } from './game-logic';

// Global state for matchmaking
export const waitingPlayers: GamePlayer[] = [];
export const matchTimers = new Map<any, NodeJS.Timeout>();

export function handleJoinGame(socket: any, data: JoinGameMessage): void {
  console.log('handleJoinGame called with:', data);

  // Prevent duplicate joins
  if (waitingPlayers.some(p => p.userId === data.userId)) {
    socket.send(JSON.stringify({ type: 'error', message: 'Already waiting for a match.' }));
    return;
  }

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
      function(this: any, err: Error | null) {
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
        } as unknown as any;
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
          function(this: any, err: Error | null) {
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

export function handleJoinBotGame(socket: any, data: JoinGameMessage): void {
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
    } as unknown as any;

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
    } as unknown as any;

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
    function(this: any, err: Error | null) {
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

export function handleDisconnect(socket: any): void {
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