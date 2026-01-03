import { GamePlayer, JoinGameMessage } from './types';
import { matchmakingQueue } from './matchmaking-queue';
import { gameCreator } from './game-creator';
import { createLogger } from '@ft-transcendence/common';
import { createBotPlayer, createDummyPlayer } from './utils';
import { activeGames } from './game-logic';

const logger = createLogger('GAME-SERVICE');

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

    // Check if this is a tournament or arcade match with two real players (local)
    const isLocalMultiplayer = (data.gameSettings?.gameMode === 'tournament' || data.gameSettings?.gameMode === 'arcade');

    // Find the opponent (who is NOT the requestor)
    let opponentId: number | undefined;
    let opponentName: string | undefined;
    let opponentIsBot: boolean = false;

    // Helper to check a team for the opponent
    const findOpponentInTeam = (players: any[] | undefined) => {
      if (!players) return;
      for (const p of players) {
        const pId = typeof p === 'number' ? p : p.userId;
        if (pId !== data.userId) {
          opponentId = pId;
          opponentName = typeof p === 'number' ? undefined : p.username;
          opponentIsBot = typeof p !== 'number' && p.isBot;
          return true; // Found
        }
      }
      return false;
    };

    // Check both teams
    if (!findOpponentInTeam(data.team1Players)) {
      findOpponentInTeam(data.team2Players);
    }

    // Fallback if no opponent found (should exist for 1v1, but maybe default to Team 2 slot if empty?)
    if (!opponentId && data.player2Id) {
      opponentId = data.player2Id;
      opponentName = data.player2Name;
    }

    if (opponentIsBot) {
      opponentName = "AI";
    }

    if (isLocalMultiplayer && opponentId && opponentId !== 0 && !opponentIsBot) {
      // Local match: opponent is also a real player
      logger.info('Creating local match with opponent ID:', opponentId);
      player2 = createDummyPlayer(opponentId, opponentName || `Player ${opponentId}`);
    } else {
      // Regular bot match
      player2 = createBotPlayer();
      // If we found specific bot info (like from a save), maybe apply it? 
      // For now createBotPlayer defaults to ID < 0.
      // If the opponent ID was positive (e.g. 100000+), we might want to respect that?
      // But standard bots usually get fresh IDs or negative IDs.
    }

    // Determine Player 1 & Player 2 based on Team Assignments
    // Logic:
    // - If requestor (data.userId) is in Team 1, they are Player 1. Opponent (Player 2).
    // - If requestor (data.userId) is in Team 2, they are Player 2. Opponent (Player 1).

    let finalPlayer1 = player1;
    let finalPlayer2 = player2;

    const isRequestorInTeam2 = data.team2Players?.some(p => (typeof p === 'number' ? p : p.userId) === data.userId);

    if (isRequestorInTeam2) {
      // SWAP: Requestor becomes Player 2, Opponent becomes Player 1
      logger.info(`Requestor ${data.username} is in Team 2. Swapping slots.`);
      finalPlayer2 = player1;
      finalPlayer1 = player2;
    }

    await this.createAndStartGame(finalPlayer1, finalPlayer2, data.gameSettings, {
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