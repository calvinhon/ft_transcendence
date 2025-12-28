// game-service/src/routes/modules/game-creator.ts
import { GamePlayer, GameSettings } from './types';
import { db } from './database';
import { PongGame, activeGames } from './game-logic';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('GAME-SERVICE');
import { isSocketOpen } from './utils';

// Handles game creation in database and active games management
export class GameCreator {
  // Create a game in database and active games
  async createGame(
    player1: GamePlayer,
    player2: GamePlayer,
    gameSettings: GameSettings | undefined,
    options: {
      team1Players?: any[];
      team2Players?: any[];
      tournamentId?: number;
      tournamentMatchId?: number;
    } = {}
  ): Promise<{ gameId: number; game: PongGame }> {
    const gameMode = gameSettings?.gameMode || 'campaign';
    const team1Players = options.team1Players ? JSON.stringify(options.team1Players) : null;
    const team2Players = options.team2Players ? JSON.stringify(options.team2Players) : null;
    const tournamentId = options.tournamentId || null;
    const tournamentMatchId = options.tournamentMatchId || null;

    // Include team player data in game settings
    const fullGameSettings: GameSettings = {
      gameMode: gameSettings?.gameMode || 'campaign',
      aiDifficulty: gameSettings?.aiDifficulty || 'medium',
      ballSpeed: gameSettings?.ballSpeed || 'medium',
      paddleSpeed: gameSettings?.paddleSpeed || 'medium',
      powerupsEnabled: gameSettings?.powerupsEnabled || false,
      accelerateOnHit: gameSettings?.accelerateOnHit || false,
      scoreToWin: gameSettings?.scoreToWin || 5,
      team1PlayerCount: gameSettings?.team1PlayerCount,
      team2PlayerCount: gameSettings?.team2PlayerCount,
      team1Players: options.team1Players,
      team2Players: options.team2Players,
      campaignLevel: gameSettings?.campaignLevel
    };

    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO games (player1_id, player2_id, game_mode, team1_players, team2_players, tournament_id, tournament_match_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [player1.userId, player2.userId, gameMode, team1Players, team2Players, tournamentId, tournamentMatchId],
        function(this: any, err: Error | null) {
          if (err) {
            logger.error('Failed to create game in database:', err);
            reject(err);
            return;
          }

          const gameId = this.lastID!;
          const game = new PongGame(player1, player2, gameId, fullGameSettings);
          activeGames.set(gameId, game);

          logger.game('Created game:', gameId, 'for players:', player1.username, 'vs', player2.username);
          resolve({ gameId, game });
        }
      );
    });
  }

  // Send game start notifications to players
  notifyGameStart(gameId: number, player1: GamePlayer, player2: GamePlayer, gameSettings?: GameSettings): void {
    const startMessage = {
      type: 'gameStart',
      gameId: gameId,
      players: {
        player1: { userId: player1.userId, username: player1.username },
        player2: { userId: player2.userId, username: player2.username }
      },
      gameSettings: gameSettings
    };

    // Send to player1
    if (isSocketOpen(player1.socket)) {
      player1.socket.send(JSON.stringify(startMessage));
      logger.game('Sent gameStart to:', player1.username);
    }

    // Send to player2 (only if not a bot)
    if (player2.userId !== 0 && isSocketOpen(player2.socket)) {
      player2.socket.send(JSON.stringify(startMessage));
      logger.game('Sent gameStart to:', player2.username);
    }

    // Send initial game state after a short delay
    setTimeout(() => {
      const game = activeGames.get(gameId);
      if (game) {
        game.broadcastGameState();
      }
    }, 100);
  }

  /*
  // Create a dummy bot player
  createBotPlayer(): GamePlayer {
    return createBotPlayer();
  }

  // Create a dummy player for tournament local multiplayer
  createDummyPlayer(userId: number, username: string): GamePlayer {
    return createDummyPlayer(userId, username);
  }
  */
}

// Global instance
export const gameCreator = new GameCreator();