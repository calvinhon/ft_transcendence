// game-service/src/routes/modules/game-scoring.ts
import { GamePlayer, Scores } from './types';
import { db } from './database';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('GAME-SERVICE');

export class GameScoring {
  private gameId: number;
  private player1: GamePlayer;
  private player2: GamePlayer;
  private scores: Scores;
  private maxScore: number;

  constructor(gameId: number, player1: GamePlayer, player2: GamePlayer, maxScore: number) {
    this.gameId = gameId;
    this.player1 = player1;
    this.player2 = player2;
    this.maxScore = maxScore;
    this.scores = { player1: 0, player2: 0 };
  }

  scorePoint(scorer: 'player1' | 'player2'): boolean {
    if (scorer === 'player1') {
      this.scores.player1++;
    } else {
      this.scores.player2++;
    }

    logger.game(this.gameId, `Point scored! Current scores: Player1=${this.scores.player1}, Player2=${this.scores.player2}`);

    // Check if game is finished
    return this.isGameFinished();
  }

  isGameFinished(): boolean {
    return this.scores.player1 >= this.maxScore || this.scores.player2 >= this.maxScore;
  }

  getWinner(): { winnerId: number; winnerName: string } | null {
    if (!this.isGameFinished()) return null;

    const winnerId = this.scores.player1 > this.scores.player2 ? this.player1.userId : this.player2.userId;
    const winnerName = winnerId === this.player1.userId ? this.player1.username : this.player2.username;

    logger.game(this.gameId, `Winner: ${winnerName}`);

    return { winnerId, winnerName };
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

    logger.game(this.gameId, 'Sending endGame message to players');

    if (this.player1.socket.readyState === 1) { // WebSocket.OPEN
      this.player1.socket.send(JSON.stringify(endMessage));
      logger.game(this.gameId, `End message sent to ${this.player1.username}`);
    }

    if (this.player2.socket.readyState === 1) { // WebSocket.OPEN
      this.player2.socket.send(JSON.stringify(endMessage));
      logger.game(this.gameId, `End message sent to ${this.player2.username}`);
    }
  }

  getScores(): Scores {
    return { ...this.scores };
  }
}