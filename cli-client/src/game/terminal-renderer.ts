// cli-client/src/game/terminal-renderer.ts
import chalk from 'chalk';

interface GameState {
  ball: { x: number; y: number; dx: number; dy: number };
  paddles: {
    player1: { x: number; y: number };
    player2: { x: number; y: number };
  };
  scores: {
    player1: number;
    player2: number;
  };
  gameState: 'countdown' | 'playing' | 'finished';
  countdownValue?: number;
}

export class TerminalRenderer {
  private readonly GAME_WIDTH = 800;
  private readonly GAME_HEIGHT = 400;
  private readonly TERMINAL_WIDTH = 80;
  private readonly TERMINAL_HEIGHT = 24;
  private readonly PADDLE_HEIGHT = 80;
  private readonly PADDLE_WIDTH = 10;
  private readonly BALL_SIZE = 10;

  private player1Name: string;
  private player2Name: string;

  constructor(player1Name: string, player2Name: string) {
    this.player1Name = player1Name;
    this.player2Name = player2Name;
  }

  render(state: GameState): void {
    // Clear screen and move cursor to top
    console.clear();
    
    // Convert game coordinates to terminal coordinates
    const ballX = Math.floor((state.ball.x / this.GAME_WIDTH) * this.TERMINAL_WIDTH);
    const ballY = Math.floor((state.ball.y / this.GAME_HEIGHT) * this.TERMINAL_HEIGHT);
    
    const paddle1Y = Math.floor((state.paddles.player1.y / this.GAME_HEIGHT) * this.TERMINAL_HEIGHT);
    const paddle2Y = Math.floor((state.paddles.player2.y / this.GAME_HEIGHT) * this.TERMINAL_HEIGHT);
    
    const paddleHeight = Math.max(2, Math.floor((this.PADDLE_HEIGHT / this.GAME_HEIGHT) * this.TERMINAL_HEIGHT));

    // Draw header with scores
    console.log(chalk.cyan('═'.repeat(this.TERMINAL_WIDTH)));
    const scoreText = `${this.player1Name}: ${state.scores.player1}  vs  ${this.player2Name}: ${state.scores.player2}`;
    const padding = Math.floor((this.TERMINAL_WIDTH - scoreText.length) / 2);
    console.log(' '.repeat(padding) + chalk.bold.yellow(scoreText));
    console.log(chalk.cyan('═'.repeat(this.TERMINAL_WIDTH)));

    // Draw game state
    if (state.gameState === 'countdown' && state.countdownValue) {
      const countdownText = `Starting in ${state.countdownValue}...`;
      const countdownPadding = Math.floor((this.TERMINAL_WIDTH - countdownText.length) / 2);
      console.log(' '.repeat(countdownPadding) + chalk.bold.red(countdownText));
    } else if (state.gameState === 'finished') {
      const winner = state.scores.player1 > state.scores.player2 ? this.player1Name : this.player2Name;
      const finishedText = `GAME OVER - ${winner} WINS!`;
      const finishedPadding = Math.floor((this.TERMINAL_WIDTH - finishedText.length) / 2);
      console.log(' '.repeat(finishedPadding) + chalk.bold.green(finishedText));
    }

    // Draw the game board
    for (let y = 0; y < this.TERMINAL_HEIGHT; y++) {
      let line = '';
      
      for (let x = 0; x < this.TERMINAL_WIDTH; x++) {
        // Draw top/bottom borders
        if (y === 0 || y === this.TERMINAL_HEIGHT - 1) {
          line += chalk.gray('─');
        }
        // Draw left paddle
        else if (x === 1 && y >= paddle1Y && y < paddle1Y + paddleHeight) {
          line += chalk.blue('█');
        }
        // Draw right paddle
        else if (x === this.TERMINAL_WIDTH - 2 && y >= paddle2Y && y < paddle2Y + paddleHeight) {
          line += chalk.red('█');
        }
        // Draw ball
        else if (Math.abs(x - ballX) <= 0 && Math.abs(y - ballY) <= 0) {
          line += chalk.white('●');
        }
        // Draw center line
        else if (x === Math.floor(this.TERMINAL_WIDTH / 2) && y % 2 === 0) {
          line += chalk.gray('│');
        }
        // Empty space
        else {
          line += ' ';
        }
      }
      
      console.log(line);
    }

    // Draw footer with controls
    console.log(chalk.cyan('═'.repeat(this.TERMINAL_WIDTH)));
    console.log(chalk.gray('Controls: W/S or ↑/↓ to move paddle | P to pause | Q to quit'));
  }

  renderWaiting(message: string): void {
    console.clear();
    console.log(chalk.cyan('═'.repeat(this.TERMINAL_WIDTH)));
    console.log();
    const padding = Math.floor((this.TERMINAL_WIDTH - message.length) / 2);
    console.log(' '.repeat(padding) + chalk.yellow(message));
    console.log();
    console.log(chalk.cyan('═'.repeat(this.TERMINAL_WIDTH)));
  }

  renderError(error: string): void {
    console.log();
    console.log(chalk.red('Error: ' + error));
    console.log();
  }

  renderGameStart(player1: string, player2: string, isBot: boolean): void {
    console.clear();
    console.log(chalk.cyan('═'.repeat(this.TERMINAL_WIDTH)));
    console.log();
    const matchText = isBot ? 
      `${player1} vs ${player2} (Bot)` : 
      `${player1} vs ${player2}`;
    const padding = Math.floor((this.TERMINAL_WIDTH - matchText.length) / 2);
    console.log(' '.repeat(padding) + chalk.bold.green(matchText));
    console.log();
    console.log(chalk.cyan('═'.repeat(this.TERMINAL_WIDTH)));
  }
}
