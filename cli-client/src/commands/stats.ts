// cli-client/src/commands/stats.ts
import chalk from 'chalk';
import { table as createTable } from 'table';
import { gameClient } from '../api/client.js';
import { authStorage } from '../utils/storage.js';

export async function statsCommand(): Promise<void> {
  const auth = authStorage.getAuth();
  
  if (!gameClient.isAuthenticated() || !auth.userId) {
    console.error(chalk.red('✗ Not logged in. Use "login" command first.'));
    process.exit(1);
  }

  try {
    const userId = auth.userId;

    console.log(chalk.blue('\n📊 Loading statistics...\n'));

    const response = await gameClient.getStats(userId);
    // Extract from API response wrapper
    const stats = (response as any).data || response;

    const tableData = [
      [chalk.bold.cyan('Metric'), chalk.bold.cyan('Value')],
      [chalk.yellow('Total Games'), chalk.blue((stats.totalGames || 0).toString())],
      [chalk.yellow('Total Wins'), chalk.green((stats.wins || 0).toString())],
      [chalk.yellow('Total Losses'), chalk.red((stats.losses || 0).toString())],
      [chalk.yellow('Win Rate'), chalk.cyan(`${(stats.winRate || 0).toFixed(1)}%`)],
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
