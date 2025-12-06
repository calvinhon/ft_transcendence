import chalk from 'chalk';
import { table as createTable } from 'table';
import { gameClient } from '../api/client.js';

export async function statsCommand(): Promise<void> {
  if (!gameClient.isAuthenticated()) {
    console.error(chalk.red('✗ Not logged in. Use "login" command first.'));
    process.exit(1);
  }

  try {
    // For demo purposes, we'll use a hardcoded userId
    // In production, this would be stored after login
    const userId = 'current_user';

    console.log(chalk.blue('\n📊 Loading statistics...\n'));

    const stats = await gameClient.getStats(userId);

    const tableData = [
      [chalk.bold.cyan('Metric'), chalk.bold.cyan('Value')],
      [chalk.yellow('Total Wins'), chalk.green(stats.wins.toString())],
      [chalk.yellow('Total Losses'), chalk.red(stats.losses.toString())],
      [chalk.yellow('Win Rate'), chalk.cyan(`${(stats.winRate * 100).toFixed(1)}%`)],
      [chalk.yellow('Rank'), chalk.magenta(`#${stats.rank}`)],
      [chalk.yellow('Current Streak'), chalk.cyan(stats.streak.toString())],
      [chalk.yellow('Average Score'), chalk.blue(stats.averageScore.toFixed(2))],
    ];

    const output = createTable(tableData);
    console.log(output);

    console.log(chalk.green('\n✓ Statistics loaded successfully.\n'));
  } catch (error) {
    console.error(
      chalk.red(`✗ Failed to load stats: ${error instanceof Error ? error.message : 'Unknown error'}`),
    );
    process.exit(1);
  }
}
