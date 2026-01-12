// game-service/src/routes/modules/websocket.ts
import { WebSocketMessage, JoinGameMessage, MovePaddleMessage, InputMessage } from './types';
import { addOnlineUser } from './online-users';
import { matchmakingService } from './matchmaking-service';
import { GameHandlers } from './game-handlers';
import { logger } from './logger';
// cleaned up

function getSessionUserId(socket: any): number | null {
  const sessionUserId = (socket as any)?.sessionUserId;
  return typeof sessionUserId === 'number' && !Number.isNaN(sessionUserId) ? sessionUserId : null;
}

function getAllowedParticipantIdsFromSocket(socket: any): Set<number> {
  const allowed = new Set<number>();
  const session = (socket as any)?.session;

  if (session && typeof session.userId === 'number') {
    allowed.add(session.userId);
  }

  const localPlayers = session?.localPlayers;
  if (Array.isArray(localPlayers)) {
    for (const p of localPlayers) {
      const userId = (p && typeof p.userId === 'number') ? p.userId : undefined;
      if (typeof userId === 'number') allowed.add(userId);
    }
  }

  return allowed;
}

function extractPlayerId(p: any): number | null {
  if (typeof p === 'number') return Number.isFinite(p) ? p : null;
  if (p && typeof p.userId === 'number' && Number.isFinite(p.userId)) return p.userId;
  return null;
}

function validateTeamPlayers(team: any[] | undefined, allowed: Set<number>): boolean {
  if (!team) return true;
  if (!Array.isArray(team)) return false;

  for (const p of team) {
    const id = extractPlayerId(p);
    if (id === null) return false;
    // Allow bots/AI by convention (0 or negative IDs)
    if (id > 0 && !allowed.has(id)) return false;
  }
  return true;
}

export function handleWebSocketMessage(socket: any, message: Buffer | string): void {
  try {
    const data = JSON.parse(message.toString()) as WebSocketMessage;
    // logger.ws('Received WebSocket message:', data.type); // Reduce noise

    const sessionUserId = getSessionUserId(socket);

    switch (data.type) {
      case 'userConnect':
        handleUserConnect(socket, data);
        break;
      case 'joinGame':
        logger.ws('Processing joinGame');
        if (sessionUserId === null) return;
        (data as any).userId = sessionUserId;
        matchmakingService.handleJoinGame(socket, data as JoinGameMessage);
        break;
      case 'joinBotGame':
        logger.ws('Processing joinBotGame');
        if (sessionUserId === null) return;
        {
          const allowed = getAllowedParticipantIdsFromSocket(socket);
          if (!validateTeamPlayers((data as any).team1Players, allowed) || !validateTeamPlayers((data as any).team2Players, allowed)) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Unauthorized players in team selection'
            }));
            return;
          }
          (data as any).userId = sessionUserId;
          matchmakingService.handleJoinBotGame(socket, data as JoinGameMessage);
        }
        break;
      case 'movePaddle':
        // logger.ws('Processing movePaddle'); // Very noisy
        GameHandlers.handleMovePaddle(socket, data as MovePaddleMessage);
        break;
      case 'input':
        // logger.ws('Processing input'); // Noisy
        GameHandlers.handleInput(socket, data as InputMessage);
        break;
      case 'pause':
        logger.ws('Processing pause');
        GameHandlers.handlePauseGame(socket, data);
        break;
      case 'disconnect':
        logger.ws('Processing disconnect');
        matchmakingService.handleDisconnect(socket);
        break;
      default:
        logger.ws('Unknown message type:', data.type);
    }
  } catch (error) {
    logger.error('WebSocket message error:', error);
  }
}

function handleUserConnect(socket: any, data: any): void {
  const sessionUserId = getSessionUserId(socket);
  if (sessionUserId === null) {
    socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
    return;
  }

  logger.ws(`Processing userConnect for ${data.username} (${sessionUserId})`);
  // Track user as online when they connect with authentication
  addOnlineUser(sessionUserId, data.username, socket);

  // Store userId on socket object for cleanup on close
  (socket as any).userId = sessionUserId;

  // Check if this is a game mode request (arcade or campaign)
  if (data.gameMode) {
    logger.info('Game mode detected:', data.gameMode);

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
      team2PlayerCount: data.team2PlayerCount || 1,
      // Tournament-specific fields for score swapping
      tournamentId: data.tournamentId,
      tournamentMatchId: data.tournamentMatchId,
      tournamentPlayer1Id: data.tournamentPlayer1Id
    };

    logger.info('Starting game with settings:', gameSettings);
    logger.info('Team 1 players:', data.team1Players);
    logger.info('Team 2 players:', data.team2Players);

    const allowed = getAllowedParticipantIdsFromSocket(socket);
    if (!validateTeamPlayers(data.team1Players, allowed) || !validateTeamPlayers(data.team2Players, allowed)) {
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Unauthorized players in team selection'
      }));
      return;
    }

    // Start the bot game directly with team player data
    matchmakingService.handleJoinBotGame(socket, {
      type: 'joinBotGame',
      userId: sessionUserId,
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
}

export function handleWebSocketClose(socket: any): void {
  matchmakingService.handleDisconnect(socket);

  // Remove from FriendService online tracking
  if ((socket as any).userId) {
    // activeConnections usage removed
    logger.ws(`User ${(socket as any).userId} disconnected (cleaned up)`);
    logger.ws(`User ${(socket as any).userId} disconnected (cleaned up)`);
  }
}