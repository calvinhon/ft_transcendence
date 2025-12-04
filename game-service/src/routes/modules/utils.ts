// game-service/src/routes/modules/utils.ts
import { GamePlayer } from './types';

// Create a dummy socket for bot players or local multiplayer
export function createDummySocket(): any {
  return {
    readyState: 1, // WebSocket.OPEN
    send: () => {} // No-op
  };
}

// Create a dummy bot player
export function createBotPlayer(): GamePlayer {
  return {
    userId: 0,
    username: 'Bot',
    socket: createDummySocket()
  };
}

// Create a dummy player for tournament local multiplayer
export function createDummyPlayer(userId: number, username: string): GamePlayer {
  return {
    userId: userId,
    username: username,
    socket: createDummySocket()
  };
}

// Check if a socket is open
export function isSocketOpen(socket: any): boolean {
  return socket && socket.readyState === 1; // WebSocket.OPEN
}