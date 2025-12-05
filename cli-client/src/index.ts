#!/usr/bin/env node

import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { playCommand } from './commands/play.js';
import { statsCommand } from './commands/stats.js';

const program = new Command();

program
  .name('pong')
  .description('Terminal-based Pong Game Client')
  .version('1.0.0');

program
  .command('login')
  .description('Login to the Pong game server')
  .action(loginCommand);

program
  .command('play')
  .description('Play a Pong game')
  .action(playCommand);

program
  .command('stats')
  .description('View your game statistics')
  .action(statsCommand);

program
  .command('help')
  .description('Show help information')
  .action(() => {
    program.outputHelp();
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
