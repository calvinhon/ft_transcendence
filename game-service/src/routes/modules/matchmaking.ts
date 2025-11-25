// game-service/src/routes/modules/matchmaking.ts
import { JoinGameMessage } from './types';
import { matchmakingService } from './matchmaking-service';

// Legacy exports for backward compatibility
export function handleJoinGame(socket: any, data: JoinGameMessage): void {
  matchmakingService.handleJoinGame(socket, data);
}

export function handleJoinBotGame(socket: any, data: JoinGameMessage): void {
  matchmakingService.handleJoinBotGame(socket, data);
}

export function handleDisconnect(socket: any): void {
  matchmakingService.handleDisconnect(socket);
}

// Re-export for backward compatibility
export { matchmakingQueue } from './matchmaking-queue';