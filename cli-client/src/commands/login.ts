import inquirer from 'inquirer';
import chalk from 'chalk';
import { gameClient } from '../api/client.js';

export async function loginCommand(): Promise<void> {
  try {
    if (gameClient.isAuthenticated()) {
      console.log(chalk.yellow('⚠ Already logged in. Use stats or play commands.'));
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Username:',
        validate: (input) => input.trim().length > 0 || 'Username cannot be empty',
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        mask: '*',
        validate: (input) => input.length > 0 || 'Password cannot be empty',
      },
    ]);

    console.log(chalk.blue('\n🔐 Logging in...'));

    const result = await gameClient.login(answers.username, answers.password);

    console.log(chalk.green('\n✓ Login successful!'));
    console.log(chalk.cyan(`User ID: ${result.userId}`));
    console.log(chalk.cyan(`Token: ${result.token.substring(0, 20)}...`));
  } catch (error) {
    console.error(chalk.red(`✗ Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    process.exit(1);
  }
}
