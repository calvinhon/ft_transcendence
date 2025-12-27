import { GamePlayer, JoinGameMessage } from './types';
import { matchmakingQueue } from './matchmaking-queue';
import { gameCreator } from './game-creator';
import { logger } from './logger';
import { activeGames } from './game-logic';

// Main matchmaking service that orchestrates the matchmaking process
export class MatchmakingService {
  // Handle regular matchmaking (waiting queue)
  async handleJoinGame(socket: any, data: JoinGameMessage): Promise<void> {
    logger.matchmaking('handleJoinGame called with:', data);

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
    logger.matchmaking('handleJoinBotGame called with:', data);

    const player1: GamePlayer = {
      userId: data.userId,
      username: data.username,
      socket: socket
    };

    let player2: GamePlayer;

    // Check if this is a tournament or arcade match with two real players (local)
    const isLocalMultiplayer = (data.gameSettings?.gameMode === 'tournament' || data.gameSettings?.gameMode === 'arcade');
    let secondPlayerId = data.player2Id;

    let secondPlayerName = data.player2Name;

    // Check team players for details
    if (data.team2Players && data.team2Players.length > 0) {
      const teamPlayer = data.team2Players[0];

      // Use team player ID if main ID is missing
      if (!secondPlayerId) {
        secondPlayerId = teamPlayer.userId;
      }

      // Use team player name if main name is missing
      if (!secondPlayerName) {
        secondPlayerName = teamPlayer.username;
      }

      // override name if it is a bot
      if (teamPlayer.isBot) {
        secondPlayerName = "AI";
      }
    }

    if (isLocalMultiplayer && secondPlayerId && secondPlayerId !== 0) {
      // Local match: player2 is also a real player
      logger.matchmaking('Creating local match with player2 ID:', secondPlayerId);
      player2 = gameCreator.createDummyPlayer(secondPlayerId, secondPlayerName || `Player ${secondPlayerId}`);
    } else {
      // Regular bot match
      player2 = gameCreator.createBotPlayer();
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

    // Check if player was in an active game
    for (const [gameId, game] of activeGames) {
      // Check if socket belongs to player 1 or 2
      // Note: For now we check direct socket identity or basic user ID matching if available on socket
      // But here we only have the socket object. 
      // We need to check if game.player1.socket === socket

      if (game.player1.socket === socket || game.player2.socket === socket) {
        game.forceEndGame('Player disconnected');
        break; // Assuming one game per socket
      }
    }
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
    const player2 = gameCreator.createBotPlayer();

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