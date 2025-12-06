import chalk from 'chalk';
import { gameClient, GameState } from '../api/client.js';
import { displayGameBoard } from '../ui/game-display.js';

// @ts-ignore: keypress has no proper types
const keypress = require('keypress');

export async function playCommand(): Promise<void> {
  if (!gameClient.isAuthenticated()) {
    console.error(chalk.red('✗ Not logged in. Use "login" command first.'));
    process.exit(1);
  }

  try {
    console.log(chalk.blue('\n🎮 Starting game...'));

    const gameStart = await gameClient.startGame();
    const gameId = gameStart.gameId;

    console.log(chalk.green(`✓ Game started!`));
    console.log(chalk.cyan(`Opponent: ${gameStart.opponent}`));
    console.log(chalk.yellow('\nControls: ↑/↓ or W/S to move, Q to quit\n'));

    let gameState: GameState | null = null;
    let gameActive = true;
    let lastMove: 'up' | 'down' | null = null;

    // Setup keypress
    keypress(process.stdin);
    process.stdin.on('keypress', async (ch, key) => {
      if (!gameActive) return;

      if (key?.name === 'q') {
        gameActive = false;
        process.stdin.pause();
        return;
      }

      if (key?.name === 'up' || ch === 'w') {
        lastMove = 'up';
        try {
          await gameClient.movePaddle(gameId, 'up');
        } catch (error) {
          console.error(chalk.red(`Move error: ${error instanceof Error ? error.message : 'Unknown'}`));
        }
      } else if (key?.name === 'down' || ch === 's') {
        lastMove = 'down';
        try {
          await gameClient.movePaddle(gameId, 'down');
        } catch (error) {
          console.error(chalk.red(`Move error: ${error instanceof Error ? error.message : 'Unknown'}`));
        }
      }
    });

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    // Game loop
    const gameLoop = setInterval(async () => {
      try {
        gameState = await gameClient.getGameState(gameId);
        console.clear();
        displayGameBoard(gameState);

        if (gameState.isGameOver) {
          clearInterval(gameLoop);
          gameActive = false;
          process.stdin.pause();

          console.log(chalk.bold.yellow('\n=== GAME OVER ===\n'));
          console.log(chalk.cyan(`Winner: ${gameState.winner}`));
          console.log(
            chalk.green(`Final Score: ${gameState.scoreLeft} - ${gameState.scoreRight}`),
          );

          // End game
          const result = gameState.winner === 'player' ? 'win' : 'lose';
          await gameClient.endGame(gameId, result);

          console.log(chalk.blue('\nGame results saved.'));
          process.exit(0);
        }
      } catch (error) {
        clearInterval(gameLoop);
        gameActive = false;
        process.stdin.pause();
        console.error(
          chalk.red(
            `\nGame error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ),
        );
        process.exit(1);
      }
    }, 200);
  } catch (error) {
    console.error(
      chalk.red(`✗ Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`),
    );
    process.exit(1);
  }
}
