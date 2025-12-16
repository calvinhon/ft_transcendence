// frontend/src/managers/app/AppGameManager.ts
// Handles game control and state management UI logic for the App

import { logger } from '../../utils/Logger';
import { showToast } from '../../toast';
import { GameCoordinator } from '../game/game-coordinator';
import { settingsManager } from '../settings-manager';
import { playerManager } from '../player-manager';

export class AppGameManager {
  private app: any;

  constructor(app: any) {
    this.app = app;
    logger.info('app-game-manager', '🏗️ AppGameManager initialized');
  }

  /**
   * Start a game with current configuration
   */
  async startGame(): Promise<void> {
    logger.info('app-game-manager', '🎮 Starting game...');

    try {
      // Validate game setup
      const selectedCount = playerManager.getSelectedCount();
      if (selectedCount === 0) {
        showToast('Please select at least one player', 'error');
        return;
      }

      // Sync game settings to GameCoordinator
      const gameSettings = settingsManager.getSettings();
      let gameCoordinator = (window as any).gameManager;
      if (!gameCoordinator) {
        logger.info('app-game-manager', 'Creating GameCoordinator instance');
        gameCoordinator = GameCoordinator.createInstance(gameSettings);
        (window as any).gameManager = gameCoordinator;
      }

      gameCoordinator.setGameSettings(gameSettings);

      // Start the game based on mode
      const currentMode = gameSettings.gameMode;
      switch (currentMode) {
        case 'coop':
          await gameCoordinator.startBotMatch();
          break;
        case 'arcade':
          await gameCoordinator.startArcadeMatch();
          break;
        case 'tournament':
          await gameCoordinator.startTournamentMatch();
          break;
        default:
          await gameCoordinator.startBotMatch();
      }

      logger.info('app-game-manager', '✅ Game started successfully');
      showToast('Game started!', 'success');
      await this.app.router.navigateToScreen('game');
    } catch (error) {
      logger.error('app-game-manager', '💥 Error starting game:', error);
      showToast('Failed to start game', 'error');
    }
  }

  /**
   * Stop the current game
   */
  async stopGame(): Promise<void> {
    logger.info('app-game-manager', '⏹️ Stopping game...');

    try {
      if (!gameCoordinator) {
        logger.warn('app-game-manager', 'GameCoordinator not available for stop');
        showToast('Game system not initialized', 'error');
        return;
      }

      gameCoordinator.stopGame();

      logger.info('app-game-manager', '✅ Game stopped successfully');
      showToast('Game stopped', 'info');
      await this.app.router.navigateToScreen('main-menu');
    } catch (error) {
      logger.error('app-game-manager', '💥 Error stopping game:', error);
      showToast('Failed to stop game', 'error');
    }
  }

  /**
   * Pause/unpause the current game
   */
  pauseGame(): void {
    logger.info('app-game-manager', '⏸️ Toggling game pause...');

    try {
      if (!gameCoordinator) {
        logger.warn('app-game-manager', 'GameCoordinator not available for pause');
        showToast('Game system not initialized', 'error');
        return;
      }

      const isPaused = gameCoordinator.getIsPaused();

      if (isPaused) {
        gameCoordinator.pauseGame(); // This actually toggles pause/resume
        logger.info('app-game-manager', '▶️ Game resumed');
        showToast('Game resumed', 'info');
      } else {
        gameCoordinator.pauseGame(); // This actually toggles pause/resume
        logger.info('app-game-manager', '⏸️ Game paused');
        showToast('Game paused', 'info');
      }
    } catch (error) {
      logger.error('app-game-manager', '💥 Error toggling game pause:', error);
      showToast('Failed to toggle game pause', 'error');
    }
  }

  /**
   * Get current game status
   */
  getGameStatus(): { isRunning: boolean; isPaused: boolean; players: any[] } {
    return {
      isRunning: gameCoordinator ? gameCoordinator.getIsPlaying() : false,
      isPaused: gameCoordinator ? gameCoordinator.getIsPaused() : false,
      players: playerManager.getLocalPlayers()
    };
  }

  /**
   * Check if a game can be started
   */
  canStartGame(): boolean {
    return playerManager.getSelectedCount() > 0;
  }
}