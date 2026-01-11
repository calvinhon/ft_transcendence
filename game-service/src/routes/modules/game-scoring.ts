// game-service/src/routes/modules/game-scoring.ts
import { GamePlayer, Scores } from './types';
import { db } from './database';
import { createLogger } from '@ft-transcendence/common';
import { notifyTournamentService } from './tournament-notifier';

const logger = createLogger('GAME-SERVICE');

interface TeamPlayer {
  userId: number;
  username?: string;
  isBot?: boolean;
}

export class GameScoring {
  private gameId: number;
  private player1: GamePlayer;
  private player2: GamePlayer;
  private scores: Scores;
  private maxScore: number;
  private tournamentPlayer1Id?: number;
  // Store team player IDs for correct winner determination
  private team1Players?: TeamPlayer[];
  private team2Players?: TeamPlayer[];

  constructor(
    gameId: number,
    player1: GamePlayer,
    player2: GamePlayer,
    maxScore: number,
    team1Players?: TeamPlayer[],
    team2Players?: TeamPlayer[],
    tournamentPlayer1Id?: number
  ) {
    this.gameId = gameId;
    this.player1 = player1;
    this.player2 = player2;
    this.maxScore = maxScore;
    this.scores = { player1: 0, player2: 0 };
    this.team1Players = team1Players;
    this.team2Players = team2Players;
    this.tournamentPlayer1Id = tournamentPlayer1Id;
    logger.info(`[${gameId}] GameScoring initialized with maxScore: ${this.maxScore}`);
  }

  scorePoint(scorer: 'player1' | 'player2'): boolean {
    if (scorer === 'player1') {
      this.scores.player1++;
    } else {
      this.scores.player2++;
    }

    logger.info(`[${this.gameId}] Point scored! Current scores: Player1=${this.scores.player1}, Player2=${this.scores.player2}`);

    // Log detailed event for Dashboard
    this.logEvent('goal', {
      scorer: scorer,
      newScore: { ...this.scores },
      timestamp: Date.now()
    });

    // Check if game is finished
    return this.isGameFinished();
  }

  isGameFinished(): boolean {
    return this.scores.player1 >= this.maxScore || this.scores.player2 >= this.maxScore;
  }

  /**
   * Get the winner's ID and name.
   * Uses team player IDs when available (for tournament/arcade modes)
   * to ensure correct winner regardless of player1/player2 swap.
   */
  getWinner(): { winnerId: number; winnerName: string } | null {
    if (!this.isGameFinished()) return null;

    // Determine winner based on scores
    // player1 score corresponds to team1 (left side)
    // player2 score corresponds to team2 (right side)
    const team1Won = this.scores.player1 > this.scores.player2;

    // Use team player IDs if available, otherwise fall back to player objects
    let winnerId: number;
    let winnerName: string;

    if (team1Won) {
      winnerId = this.team1Players?.[0]?.userId ?? this.player1.userId;
      winnerName = this.team1Players?.[0]?.username ?? this.player1.username;
    } else {
      winnerId = this.team2Players?.[0]?.userId ?? this.player2.userId;
      winnerName = this.team2Players?.[0]?.username ?? this.player2.username;
    }

    logger.info(`[${this.gameId}] Winner: ${winnerName} (ID: ${winnerId})`);

    return { winnerId, winnerName };
  }

  /**
   * Save game result to database and notify tournament service if applicable.
   * Returns a Promise for proper async handling.
   */
  async saveGameResult(aborted: boolean = false): Promise<void> {
    const winner = this.getWinner();
    let winnerId: number | null = winner ? winner.winnerId : null;

    // Handle aborted games - if aborted and no winner, it remains no winner (Loss for all)
    // User request: "display a loss for all the parties involved if the match didn't make it to the score"
    if (aborted && !winnerId) {
      // Do nothing, leave winnerId as null
    }

    const finalWinnerId = winnerId;
    const finalScores = { ...this.scores };
    const gameId = this.gameId;

    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE games SET player1_score = ?, player2_score = ?, status = ?, finished_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?',
        [this.scores.player1, this.scores.player2, 'finished', winnerId, this.gameId],
        async (err: Error | null) => {
          if (err) {
            logger.error(`Database update error:`, err);
            reject(err);
            return;
          }

          logger.info(`[${gameId}] Game recorded in database (Aborted: ${aborted}, WinnerID: ${finalWinnerId}, Scores: ${finalScores.player1}-${finalScores.player2})`);

          // Notify tournament service if this was a tournament game
          await this.checkAndNotifyTournament(gameId, finalWinnerId, finalScores.player1, finalScores.player2);
          resolve();
        }
      );
    });
  }

  private async checkAndNotifyTournament(
    gameId: number,
    winnerId: number | null,
    player1Score: number,
    player2Score: number
  ): Promise<void> {
    return new Promise((resolve) => {
      db.get(
        'SELECT tournament_id, tournament_match_id FROM games WHERE id = ?',
        [gameId],
        async (err: Error | null, row: any) => {
          if (err || !row) {
            resolve();
            return;
          }

          const tournamentId = row.tournament_id;
          const tournamentMatchId = row.tournament_match_id;

          if (!tournamentId || !tournamentMatchId) {
            resolve();
            return;
          }

          let submitP1Score = player1Score;
          let submitP2Score = player2Score;

          // In tournament mode, tournament-service expects scores in ORIGINAL match player1/player2 order.
          // Our scoring uses player1=left paddle, player2=right paddle.
          const shouldSwapScores =
            typeof this.tournamentPlayer1Id === 'number' &&
            this.tournamentPlayer1Id > 0 &&
            this.tournamentPlayer1Id !== this.player1.userId;

          if (shouldSwapScores) {
            submitP1Score = player2Score;
            submitP2Score = player1Score;
          }

          await notifyTournamentService(gameId, tournamentId, {
            matchId: tournamentMatchId,
            winnerId: winnerId,
            player1Score: submitP1Score,
            player2Score: submitP2Score
          });

          resolve();
        }
      );
    });
  }


  broadcastGameEnd(): void {
    const winner = this.getWinner();
    if (!winner) return;

    const endMessage = {
      type: 'gameEnd',
      winner: winner.winnerId,
      scores: this.scores,
      gameId: this.gameId
    };

    logger.info(`[${this.gameId}] Sending endGame message to players`);

    if (this.player1.socket.readyState === 1) { // WebSocket.OPEN
      this.player1.socket.send(JSON.stringify(endMessage));
    }

    if (this.player2.socket.readyState === 1) { // WebSocket.OPEN
      this.player2.socket.send(JSON.stringify(endMessage));
    }
  }

  getScores(): Scores {
    return { ...this.scores };
  }

  resetScores(): void {
    this.scores = { player1: 0, player2: 0 };
  }

  private logEvent(type: string, data: any): void {
    db.run(
      'INSERT INTO game_events (game_id, event_type, event_data) VALUES (?, ?, ?)',
      [this.gameId, type, JSON.stringify(data)],
      (err: Error | null) => {
        if (err) {
          logger.error(`Failed to log event ${type}:`, err);
        }
      }
    );
  }
}