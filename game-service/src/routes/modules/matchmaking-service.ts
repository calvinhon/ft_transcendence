// game-service/src/routes/modules/matchmaking-service.ts
import { GamePlayer, JoinGameMessage } from './types';
import { matchmakingQueue } from './matchmaking-queue';
import { gameCreator } from './game-creator';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('GAME-SERVICE');
import { createBotPlayer, createDummyPlayer } from './utils';

// Main matchmaking service that orchestrates the matchmaking process
export class MatchmakingService {
  // Handle regular matchmaking (waiting queue)
  async handleJoinGame(socket: any, data: JoinGameMessage): Promise<void> {
    logger.info('handleJoinGame called with:', data);

    const player: GamePlayer = {
      userId: data.userId,
      username: data.username,
      socket: socket
    };

    matchmakingQueue.addPlayer(player);

    if (matchmakingQueue.hasEnoughPlayers()) {
      const match = matchmakingQueue.getNextMatch();
      if (match) {
        await this.createAndStartGame(match.player1, match.player2, data.gameSettings);
      }
    } else {
      // Start timer for bot match if only one player
      matchmakingQueue.startBotMatchTimer(socket, async () => {
        await this.createBotGame(player, data);
      });
    }
  }

  // Handle direct bot game creation
  async handleJoinBotGame(socket: any, data: JoinGameMessage): Promise<void> {
    logger.info('handleJoinBotGame called with:', data);

    const player1: GamePlayer = {
      userId: data.userId,
      username: data.username,
      socket: socket
    };

    let player2: GamePlayer;

    // Check if this is a tournament match with two real players
    if (data.gameSettings?.gameMode === 'tournament' && data.player2Id && data.player2Id !== 0) {
      // Tournament match: player2 is also a real player (local)
      logger.info('Creating tournament match with player2 ID:', data.player2Id);
      player2 = createDummyPlayer(data.player2Id, data.player2Name || `Player ${data.player2Id}`);
    } else {
      // Regular bot match
      player2 = createBotPlayer();
    }

    await this.createAndStartGame(player1, player2, data.gameSettings, {
      team1Players: data.team1Players,
      team2Players: data.team2Players,
      tournamentId: data.tournamentId,
      tournamentMatchId: data.tournamentMatchId
    });
  }

  // Handle player disconnection
  handleDisconnect(socket: any): void {
    matchmakingQueue.removePlayer(socket);
  }

  // Helper method to create and start a game
  private async createAndStartGame(
    player1: GamePlayer,
    player2: GamePlayer,
    gameSettings?: any,
    options: {
      team1Players?: any[];
      team2Players?: any[];
      tournamentId?: number;
      tournamentMatchId?: number;
    } = {}
  ): Promise<void> {
    try {
      const { gameId, game } = await gameCreator.createGame(player1, player2, gameSettings, options);
      gameCreator.notifyGameStart(gameId, player1, player2, gameSettings);
    } catch (error) {
      logger.error('Failed to create game:', error);
      // Send error message to the real player
      const realPlayer = player1.userId !== 0 ? player1 : player2;
      if (realPlayer.socket.readyState === 1) {
        realPlayer.socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to start match. Please try again.'
        }));
      }
    }
  }

  // Helper method to create a bot game for timeout scenarios
  private async createBotGame(player: GamePlayer, data: JoinGameMessage): Promise<void> {
    const player2 = createBotPlayer();

    await this.createAndStartGame(player, player2, data.gameSettings, {
      team1Players: data.team1Players,
      team2Players: data.team2Players,
      tournamentId: data.tournamentId,
      tournamentMatchId: data.tournamentMatchId
    });
  }
}

// Global instance
export const matchmakingService = new MatchmakingService();