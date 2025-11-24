// ws-handlers.ts
// Contains WebSocket handler functions for game routes

import { PongGame } from './game-engine';
import { waitingPlayers, activeGames, matchTimers, addOnlineUser, removeOnlineUser, db } from './game-utils';
import type { GamePlayer, GameSettings, JoinGameMessage, MovePaddleMessage } from './modules/types';


// --- Extracted from matchmaking.ts ---
export function handleJoinGame(socket: any, data: JoinGameMessage): void {
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

  if (waitingPlayers.length >= 2) {
    const player1 = waitingPlayers.shift()!;
    const player2 = waitingPlayers.shift()!;

    if (matchTimers.has(player1.socket)) {
      clearTimeout(matchTimers.get(player1.socket)!);
      matchTimers.delete(player1.socket);
    }
    if (matchTimers.has(player2.socket)) {
      clearTimeout(matchTimers.get(player2.socket)!);
      matchTimers.delete(player2.socket);
    }

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
          const game = new PongGame(player1, player2, this.lastID, data.gameSettings);
          activeGames.set(this.lastID!, game);

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

    const timer = setTimeout(() => {
      if (waitingPlayers.length === 1 && waitingPlayers[0].socket === socket) {
        const player1 = waitingPlayers.shift()!;
        matchTimers.delete(socket);
        const dummySocket = {
          readyState: 1,
          send: () => {}
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
              const game = new PongGame(player1, player2, this.lastID, data.gameSettings);
              activeGames.set(this.lastID!, game);
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
              player1.socket.send(JSON.stringify(startMessage));
            }
          }
        );
      }
    }, 5000);
    matchTimers.set(socket, timer);
  }
}

export function handleJoinBotGame(socket: any, data: JoinGameMessage): void {
    console.log('[GAME-SERVICE] handleJoinBotGame called:', { userId: data.userId, username: data.username, gameSettings: data.gameSettings });
  const player1: GamePlayer = {
    userId: data.userId,
    username: data.username,
    socket: socket
  };

  let player2: GamePlayer;

  if (data.gameSettings?.gameMode === 'tournament' && data.player2Id && data.player2Id !== 0) {
    const dummySocket = {
      readyState: 1,
      send: () => {}
    } as unknown as any;

    player2 = {
      userId: data.player2Id,
      username: data.player2Name || `Player ${data.player2Id}`,
      socket: dummySocket
    };
  } else {
    const dummySocket = {
      readyState: 1,
      send: () => {}
    } as unknown as any;

    player2 = {
      userId: 0,
      username: 'Bot',
      socket: dummySocket
    };
  }

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
        console.log('[GAME-SERVICE] Creating PongGame for gameId:', this.lastID);
        const game = new PongGame(player1, player2, this.lastID, data.gameSettings);
        activeGames.set(this.lastID!, game);

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
        // If broadcastGameState does not exist, skip or replace with appropriate logic
        if (typeof (game as any).broadcastGameState === 'function') {
          setTimeout(() => {
            (game as any).broadcastGameState();
          }, 100);
        }
      } else {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to start match. Please try again.<Backend>'
        }));
      }
    }
  );
}

// --- Extracted from websocket.ts ---
export function handleMovePaddle(socket: any, data: MovePaddleMessage): void {
  for (let [gameId, game] of activeGames) {
    if (game.player1.socket === socket || game.player2.socket === socket) {
      const socketPlayerId = game.player1.socket === socket ?
        game.player1.userId : game.player2.userId;
      const targetPlayerId = data.playerId || socketPlayerId;
      if (data.paddleIndex !== undefined) {
        game.movePaddle(targetPlayerId, data.direction, data.paddleIndex);
      } else {
        game.movePaddle(targetPlayerId, data.direction);
      }
      return;
    }
  }
}

export function handlePauseGame(socket: any, data: any): void {
  for (let [gameId, game] of activeGames) {
    if (game.player1.socket === socket || game.player2.socket === socket) {
      const playerId = game.player1.socket === socket ?
        game.player1.userId : game.player2.userId;
      if (data.paused !== undefined) {
        if (data.paused && !game.isPaused) {
          game.pauseGame();
        } else if (!data.paused && game.isPaused) {
          game.resumeGame();
        }
      } else {
        game.togglePause();
      }
      return;
    }
  }
}

export function handleDisconnect(socket: any): void {
  const waitingIndex = waitingPlayers.findIndex(p => p.socket === socket);
  if (waitingIndex > -1) {
    waitingPlayers.splice(waitingIndex, 1);
  }
  if (matchTimers.has(socket)) {
    clearTimeout(matchTimers.get(socket)!);
    matchTimers.delete(socket);
  }
  removeOnlineUser(socket);
}
