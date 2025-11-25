// game-service/src/routes/modules/matchmaking-queue.ts
import { GamePlayer } from './types';
import { logger } from './logger';

// Manages the queue of waiting players and match timers
export class MatchmakingQueue {
  private waitingPlayers: GamePlayer[] = [];
  private matchTimers = new Map<any, NodeJS.Timeout>();

  // Add a player to the waiting queue
  addPlayer(player: GamePlayer): void {
    // Prevent duplicate joins
    if (this.waitingPlayers.some(p => p.userId === player.userId)) {
      player.socket.send(JSON.stringify({
        type: 'error',
        message: 'Already waiting for a match.'
      }));
      return;
    }

    this.waitingPlayers.push(player);
    logger.matchmaking('Player added to queue:', player.username, 'Queue size:', this.waitingPlayers.length);
  }

  // Get the current queue size
  getQueueSize(): number {
    return this.waitingPlayers.length;
  }

  // Check if we have enough players for a match
  hasEnoughPlayers(): boolean {
    return this.waitingPlayers.length >= 2;
  }

  // Get and remove the next two players from the queue
  getNextMatch(): { player1: GamePlayer; player2: GamePlayer } | null {
    if (!this.hasEnoughPlayers()) {
      return null;
    }

    const player1 = this.waitingPlayers.shift()!;
    const player2 = this.waitingPlayers.shift()!;

    // Clear any existing timers for these players
    this.clearTimer(player1.socket);
    this.clearTimer(player2.socket);

    logger.matchmaking('Matched players:', player1.username, 'vs', player2.username);
    return { player1, player2 };
  }

  // Start a timeout for a single waiting player to get a bot match
  startBotMatchTimer(socket: any, onTimeout: () => void): void {
    // Send waiting message
    socket.send(JSON.stringify({
      type: 'waiting',
      message: 'Waiting for opponent...'
    }));

    const timer = setTimeout(() => {
      logger.matchmaking('Bot match timer triggered. Queue size:', this.waitingPlayers.length);

      // Check if player is still waiting
      const playerIndex = this.waitingPlayers.findIndex(p => p.socket === socket);
      if (playerIndex >= 0 && this.waitingPlayers.length === 1) {
        const player = this.waitingPlayers[playerIndex];
        logger.matchmaking('Starting bot match for player:', player.username);
        this.waitingPlayers.splice(playerIndex, 1);
        this.clearTimer(socket);
        onTimeout();
      }
    }, 5000);

    this.matchTimers.set(socket, timer);
  }

  // Remove a player from the queue (on disconnect)
  removePlayer(socket: any): void {
    const index = this.waitingPlayers.findIndex(p => p.socket === socket);
    if (index > -1) {
      const removedPlayer = this.waitingPlayers.splice(index, 1)[0];
      logger.matchmaking('Removed player from queue:', removedPlayer.username);
    }
    this.clearTimer(socket);
  }

  // Clear a timer for a specific socket
  private clearTimer(socket: any): void {
    if (this.matchTimers.has(socket)) {
      clearTimeout(this.matchTimers.get(socket)!);
      this.matchTimers.delete(socket);
    }
  }

  // Get all waiting players (for debugging)
  getWaitingPlayers(): GamePlayer[] {
    return [...this.waitingPlayers];
  }
}

// Global instance
export const matchmakingQueue = new MatchmakingQueue();