// cli-client/src/ui/game-display.ts
import chalk from 'chalk';
import { GameState } from '../api/client.js';

export const BOARD_WIDTH = 60;
export const BOARD_HEIGHT = 20;

export function displayGameBoard(gameState: GameState): void {
  const board: string[][] = Array(BOARD_HEIGHT)
    .fill(null)
    .map(() => Array(BOARD_WIDTH).fill(' '));

  // Draw borders
  for (let x = 0; x < BOARD_WIDTH; x++) {
    board[0][x] = '═';
    board[BOARD_HEIGHT - 1][x] = '═';
  }

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    board[y][0] = '║';
    board[y][BOARD_WIDTH - 1] = '║';
  }

  // Corners
  board[0][0] = '╔';
  board[0][BOARD_WIDTH - 1] = '╗';
  board[BOARD_HEIGHT - 1][0] = '╚';
  board[BOARD_HEIGHT - 1][BOARD_WIDTH - 1] = '╝';

  // Center line
  for (let y = 2; y < BOARD_HEIGHT - 2; y += 2) {
    board[y][Math.floor(BOARD_WIDTH / 2)] = chalk.gray('·');
  }

  // Draw paddles
  const paddleLeftY = Math.max(1, Math.min(BOARD_HEIGHT - 4, Math.floor(gameState.paddleLeftY)));
  const paddleRightY = Math.max(1, Math.min(BOARD_HEIGHT - 4, Math.floor(gameState.paddleRightY)));

  for (let i = 0; i < 3; i++) {
    const y = paddleLeftY + i;
    if (y > 0 && y < BOARD_HEIGHT - 1) {
      board[y][2] = chalk.blue('█');
    }
  }

  for (let i = 0; i < 3; i++) {
    const y = paddleRightY + i;
    if (y > 0 && y < BOARD_HEIGHT - 1) {
      board[y][BOARD_WIDTH - 3] = chalk.red('█');
    }
  }

  // Draw ball
  const ballX = Math.max(1, Math.min(BOARD_WIDTH - 2, Math.floor(gameState.ballX)));
  const ballY = Math.max(1, Math.min(BOARD_HEIGHT - 2, Math.floor(gameState.ballY)));
  if (ballY > 0 && ballY < BOARD_HEIGHT - 1 && ballX > 0 && ballX < BOARD_WIDTH - 1) {
    board[ballY][ballX] = chalk.yellow('●');
  }

  // Clear screen and render board
  console.clear();

  // Render board
  for (const row of board) {
    console.log(row.join(''));
  }

  // Display score
  const scoreDisplay = `${chalk.bold.blue(gameState.scoreLeft.toString())}  ${chalk.bold.red(gameState.scoreRight.toString())}`;
  console.log(chalk.bold.cyan('\n' + scoreDisplay.padStart(20)));

  // Display controls
  console.log(chalk.gray('\nControls: ↑/↓ or W/S to move | Q to quit'));
}

export function displayGameStats(
  winner: string,
  scoreLeft: number,
  scoreRight: number,
): void {
  console.log(chalk.bold.yellow('\n═══════════════════'));
  console.log(chalk.bold.yellow('      GAME OVER'));
  console.log(chalk.bold.yellow('═══════════════════\n'));

  if (winner === 'player') {
    console.log(chalk.bold.green('🎉 YOU WON! 🎉'));
  } else {
    console.log(chalk.bold.red('Game Over - Opponent Won'));
  }

  console.log(chalk.cyan(`\nFinal Score: ${scoreLeft} - ${scoreRight}`));
  console.log(chalk.gray('\nReturning to menu...\n'));
}
