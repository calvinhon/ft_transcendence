// game-service/src/routes/modules/websocket.ts
import { WebSocketMessage, JoinGameMessage, MovePaddleMessage } from './types';
import { addOnlineUser, removeOnlineUser } from './online-users';
import { handleJoinGame, handleJoinBotGame, handleDisconnect } from './matchmaking';
import { activeGames } from './game-logic';

export function handleWebSocketMessage(socket: any, message: Buffer | string): void {
  try {
    const data = JSON.parse(message.toString()) as WebSocketMessage;
    console.log('🔵 [WS-MESSAGE] Received WebSocket message:', data);
    console.log('🔵 [WS-MESSAGE] Message type:', data.type);

    switch (data.type) {
      case 'userConnect':
        console.log('🔵 [WS-MESSAGE] Processing userConnect');
        // Track user as online when they connect with authentication
        addOnlineUser(data.userId, data.username, socket);

        // Check if this is a game mode request (arcade or coop)
        if (data.gameMode) {
          console.log('🎮 [USER-CONNECT] Game mode detected:', data.gameMode);

          // Prepare game settings
          const gameSettings = {
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
          handleJoinBotGame(socket, {
            type: 'joinBotGame',
            userId: data.userId,
            username: data.username,
            gameSettings: gameSettings,
            team1Players: data.team1Players,
            team2Players: data.team2Players
          });
        } else {
          // Just acknowledge connection
          socket.send(JSON.stringify({
            type: 'connectionAck',
            message: 'You are now tracked as online'
          }));
        }
        break;
      case 'joinGame':
        console.log('🔵 [WS-MESSAGE] Processing joinGame');
        handleJoinGame(socket, data as JoinGameMessage);
        break;
      case 'joinBotGame':
        console.log('🔵 [WS-MESSAGE] Processing joinBotGame');
        handleJoinBotGame(socket, data as JoinGameMessage);
        break;
      case 'movePaddle':
        console.log('🔵 [WS-MESSAGE] Processing movePaddle - calling handleMovePaddle');
        handleMovePaddle(socket, data as MovePaddleMessage);
        break;
      case 'pause':
        console.log('🔵 [WS-MESSAGE] Processing pause');
        handlePauseGame(socket, data);
        break;
      case 'disconnect':
        console.log('🔵 [WS-MESSAGE] Processing disconnect');
        handleDisconnect(socket);
        break;
      default:
        console.log('🔵 [WS-MESSAGE] Unknown message type:', data.type);
    }
  } catch (error) {
    console.error('WebSocket message error:', error);
  }
}

export function handleWebSocketClose(socket: any): void {
  handleDisconnect(socket);
}

function handleMovePaddle(socket: any, data: MovePaddleMessage): void {
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

function handlePauseGame(socket: any, data: any): void {
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