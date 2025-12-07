import chalk from 'chalk';
import inquirer from 'inquirer';
import { WebSocketGameClient } from '../game/websocket-client.js';
import { TerminalRenderer } from '../game/terminal-renderer.js';
import { authStorage } from '../utils/storage.js';
import { createRequire } from 'module';

// @ts-ignore: keypress has no proper types
const require = createRequire(import.meta.url);
const keypress = require('keypress');

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

export async function playCommand(): Promise<void> {
  // Check authentication
  const auth = authStorage.getAuth();
  if (!auth.token || !auth.userId || !auth.username) {
    console.error(chalk.red('✗ Not logged in. Use "login" command first.'));
    process.exit(1);
  }

  try {
    // Ask game mode
    const { gameMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'gameMode',
        message: 'Select game mode:',
        choices: [
          { name: 'Play vs Bot (Quick Game)', value: 'bot' },
          { name: 'Join Matchmaking (vs Human)', value: 'matchmaking' }
        ]
      }
    ]);

    let difficulty = 'medium';
    if (gameMode === 'bot') {
      const difficultyAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'difficulty',
          message: 'Select bot difficulty:',
          choices: ['easy', 'medium', 'hard']
        }
      ]);
      difficulty = difficultyAnswer.difficulty;
    }

    console.log(chalk.blue('\n🎮 Connecting to game server...'));

    // Create WebSocket client
    const client = new WebSocketGameClient(
      parseInt(auth.userId),
      auth.username,
      auth.token
    );

    // Setup renderer
    let renderer: TerminalRenderer | null = null;
    let gameActive = false;
    let playerSide: 'player1' | 'player2' = 'player1';
    let player1Name = '';
    let player2Name = '';
    let lastRenderTime = 0;
    const RENDER_THROTTLE_MS = 50; // Limit to ~20 FPS for smoother display

    // Connect to WebSocket
    await client.connect();
    console.log(chalk.green('✓ Connected!'));

    // Setup event handlers
    client.on('connected', (message) => {
      console.log(chalk.cyan(message));
    });

    client.on('waiting', (message) => {
      if (renderer) {
        renderer.renderWaiting(message);
      } else {
        console.log(chalk.yellow(message));
      }
    });

    client.on('gameStarted', (data) => {
      console.log(chalk.green('\n✓ Game started!'));
      
      // Store player names
      player1Name = data.player1.username;
      player2Name = data.player2.username;
      
      // Determine which side we're on
      playerSide = data.player1.userId === parseInt(auth.userId || '0') ? 'player1' : 'player2';
      
      // Create renderer with player names
      renderer = new TerminalRenderer(
        data.player1.username,
        data.player2.username
      );
      
      renderer.renderGameStart(
        data.player1.username,
        data.player2.username,
        data.isBot || false
      );
      
      gameActive = true;
      
      // Setup keyboard controls
      setupKeyboardControls(client);
      
      console.log(chalk.yellow('\nControls: W/S or ↑/↓ to move | P to pause | Q to quit'));
      console.log(chalk.gray('Game starting in a moment...\n'));
    });

    client.on('gameState', (state: GameState) => {
      if (renderer && gameActive) {
        // Throttle rendering to prevent flickering
        const now = Date.now();
        if (now - lastRenderTime >= RENDER_THROTTLE_MS) {
          renderer.render(state);
          lastRenderTime = now;
        }
      }
    });

    client.on('gameFinished', (data) => {
      gameActive = false;
      
      if (renderer) {
        // Determine winner name based on userId
        const winnerUserId = data.winner?.toString();
        let winnerName = 'Unknown';
        
        if (winnerUserId === auth.userId) {
          winnerName = player1Name;
        } else if (player2Name) {
          winnerName = player2Name;
        }
        
        console.log('\n');
        console.log(chalk.bold.yellow('═'.repeat(80)));
        console.log(chalk.bold.green('GAME OVER!'));
        console.log(chalk.yellow(`Winner: ${winnerName}`));
        console.log(chalk.cyan(`Final Score: ${player1Name}: ${data.player1Score} - ${player2Name}: ${data.player2Score}`));
        console.log(chalk.bold.yellow('═'.repeat(80)));
      }
      
      cleanup(client);
    });

    client.on('error', (error) => {
      console.error(chalk.red(`\nGame error: ${error.message}`));
      cleanup(client);
    });

    client.on('close', () => {
      if (gameActive) {
        console.log(chalk.yellow('\nConnection closed.'));
      }
      cleanup(client);
    });

    // Join game based on mode
    if (gameMode === 'bot') {
      console.log(chalk.blue(`\nStarting bot game (${difficulty} difficulty)...`));
      client.joinBotGame(difficulty);
    } else {
      console.log(chalk.blue('\nJoining matchmaking queue...'));
      console.log(chalk.gray('Waiting for opponent...\n'));
      client.joinMatchmaking();
    }

    // Keep process alive
    await new Promise(() => {});

  } catch (error) {
    console.error(
      chalk.red(`✗ Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`)
    );
    process.exit(1);
  }
}

function setupKeyboardControls(client: WebSocketGameClient): void {
  keypress(process.stdin);
  
  process.stdin.on('keypress', (ch, key) => {
    if (!client.isConnected()) return;

    if (key?.name === 'q') {
      console.log(chalk.yellow('\n\nQuitting game...'));
      client.disconnect();
      cleanup(client);
      return;
    }

    if (key?.name === 'p') {
      client.pauseGame();
      return;
    }

    if (key?.name === 'up' || ch === 'w' || ch === 'W') {
      client.movePaddle('up');
    } else if (key?.name === 'down' || ch === 's' || ch === 'S') {
      client.movePaddle('down');
    }
  });

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
}

function cleanup(client: WebSocketGameClient): void {
  try {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    client.disconnect();
  } catch (error) {
    // Ignore cleanup errors
  }
  
  // Give a moment for cleanup, then exit
  setTimeout(() => {
    process.exit(0);
  }, 500);
}
