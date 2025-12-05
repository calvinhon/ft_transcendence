// frontend/src/managers/game/GameModeManager.ts
// Manages different game modes (arcade, tournament, campaign, bot)
import { logger } from '../../utils/Logger';

import { GameNetworkManager } from '../game-network-manager';
import { GameUIManager } from '../game-ui-manager';
import { CampaignManager } from '../campaign-manager';
import { TournamentGameManager } from '../tournament-game-manager';
import { settingsManager } from '../settings-manager';
import { playerManager } from '../player-manager';
import { appManager } from '../app/app-manager';
import { authManager } from '../auth';

interface GameSettings {
  gameMode: 'coop' | 'arcade' | 'tournament';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  ballSpeed: 'slow' | 'medium' | 'fast';
  paddleSpeed: 'slow' | 'medium' | 'fast';
  powerupsEnabled: boolean;
  accelerateOnHit: boolean;
  scoreToWin: number;
}

interface User {
  userId: number;
  username: string;
}

export class GameModeManager {
  private gameNetworkManager: GameNetworkManager;
  private gameUIManager: GameUIManager;
  private campaignManager: CampaignManager;
  private tournamentGameManager: TournamentGameManager;

  private gameSettings: GameSettings;
  private currentTournamentMatch: any = null;

  constructor(
    gameNetworkManager: GameNetworkManager,
    gameUIManager: GameUIManager,
    campaignManager: CampaignManager,
    tournamentGameManager: TournamentGameManager,
    gameSettings: GameSettings
  ) {
    this.gameNetworkManager = gameNetworkManager;
    this.gameUIManager = gameUIManager;
    this.campaignManager = campaignManager;
    this.tournamentGameManager = tournamentGameManager;
    this.gameSettings = gameSettings;
  }

  // Update settings reference
  public updateSettings(gameSettings: GameSettings): void {
    this.gameSettings = gameSettings;
  }

  // Update tournament match data
  public setCurrentTournamentMatch(match: any): void {
    this.currentTournamentMatch = match;
  }

  // Start game based on mode
  public async startGame(): Promise<void> {
    console.log('🎮 [MODE] Starting game with mode:', this.gameSettings.gameMode);

    switch (this.gameSettings.gameMode) {
      case 'coop':
        console.log('🎯 [MODE] CO-OP mode detected, starting campaign game');
        await this.startCampaignGame();
        break;
      case 'arcade':
        console.log('🕹️ [MODE] ARCADE mode detected, starting arcade match');
        await this.startArcadeMatch();
        break;
      case 'tournament':
        console.log('🏆 [MODE] TOURNAMENT mode detected, starting tournament match');
        await this.startTournamentMatch();
        break;
      default:
        console.log('🎮 [MODE] Starting standard bot match');
        await this.startBotMatch();
        break;
    }
  }

  // Start bot match (single player against AI)
  public async startBotMatch(): Promise<void> {
    console.log('🎮 [MODE] Starting bot match');

    const user = this.getCurrentUser();
    if (!user) {
      this.redirectToLogin();
      return;
    }

    this.showWaitingMessage();

    try {
      await this.gameNetworkManager.connectToBotGame(user);
    } catch (error) {
      logger.error('game-mode-manager', 'Failed to start bot match', error);
      this.hideWaitingMessage();
      alert('Failed to start bot match. Please try again.');
      throw error;
    }
  }

  // Start arcade mode
  public async startArcadeMatch(): Promise<void> {
    console.log('🕹️ [MODE] Starting arcade mode');
    this.campaignManager.endCampaign(); // Arcade is NOT campaign mode

    // Sync settings from SettingsManager
    this.gameSettings = { ...this.gameSettings, ...settingsManager.getSettings() };
    console.log('🕹️ [MODE] Synced game settings:', this.gameSettings);

    // Update arcade UI
    this.gameUIManager.updateArcadeUI();

    // Start the arcade match
    await this.startArcadeMatchWithSettings();
  }

  // Start tournament mode
  public async startTournamentMatch(): Promise<void> {
    console.log('🏆 [MODE] Starting tournament match');
    this.campaignManager.endCampaign(); // Tournament is NOT campaign mode

    // Sync settings from SettingsManager
    this.gameSettings = { ...this.gameSettings, ...settingsManager.getSettings() };
    console.log('🏆 [MODE] Synced game settings:', this.gameSettings);

    const app = appManager as any;
    if (!app || !app.currentTournamentMatch) {
      logger.error('game-mode-manager', 'No tournament match data found!');
      return;
    }

    // Store tournament match data
    this.currentTournamentMatch = app.currentTournamentMatch;
    const match = this.currentTournamentMatch;
    console.log('🏆 [MODE] Match:', match.player1Name, 'vs', match.player2Name);

    // Connect to game server for tournament match
    await this.gameNetworkManager.connectToArcadeGame(
      { userId: match.player1Id, username: match.player1Name },
      [{ userId: match.player1Id, username: match.player1Name }],
      [{ userId: match.player2Id, username: match.player2Name }],
      match
    );
  }

  // Start campaign mode
  public async startCampaignGame(): Promise<void> {
    console.log('🎯 [MODE] Starting campaign mode');
    this.campaignManager.startCampaign();

    // Update campaign UI
    this.gameUIManager.setCampaignLevel(this.campaignManager.getCurrentLevel());
    this.gameUIManager.setCampaignMode(true);
    this.gameUIManager.updateCampaignUI();

    await this.startCampaignMatch();
  }

  // Handle game end for different modes
  public handleGameEnd(gameData: any): void {
    if (this.campaignManager.isCampaignActive()) {
      this.handleCampaignGameEnd(gameData);
    } else if (this.gameSettings.gameMode === 'arcade') {
      this.handleArcadeGameEnd(gameData);
    } else if (this.gameSettings.gameMode === 'tournament') {
      this.handleTournamentGameEnd(gameData);
    } else {
      this.handleDefaultGameEnd(gameData);
    }
  }

  // End campaign
  public endCampaign(): void {
    this.campaignManager.endCampaign();
    this.gameUIManager.setCampaignMode(false);
    this.gameUIManager.updateCampaignUI();
    console.log('🎯 [MODE] Campaign ended');
  }

  // Restart campaign level
  public restartCampaignLevel(): void {
    console.log('🎯 [MODE] Restarting campaign level');
    // This will be handled by the lifecycle manager
  }

  // Private helper methods
  private async startArcadeMatchWithSettings(): Promise<void> {
    console.log('🕹️ [MODE] Starting arcade match with settings');

    const user = this.getCurrentUser();
    if (!user) {
      this.redirectToLogin();
      return;
    }

    this.showWaitingMessage();

    try {
      // Get selected players and their team assignments
      const app = appManager as any;
      let team1Players: any[] = [];
      let team2Players: any[] = [];

      // Check if host is selected
      const hostCard = document.getElementById('host-player-card');
      const isHostSelected = hostCard && hostCard.classList.contains('active') &&
                 playerManager.isPlayerSelected(user.userId.toString());

      if (isHostSelected) {
        team1Players.push({
          userId: user.userId,
          username: user.username,
          id: user.userId.toString(),
          team: 1,
          paddleIndex: 0
        });
        console.log('🕹️ [MODE] Host added to Team 1');
      }

      // Add local players based on team assignments
      const selectedPlayers = playerManager.getLocalPlayers().filter(player =>
        playerManager.isPlayerSelected(player.id?.toString() || '')
      );

      const localTeam1 = selectedPlayers.filter((p: any) => p.team === 1);
      const localTeam2 = selectedPlayers.filter((p: any) => p.team === 2);

      localTeam1.forEach((p: any) => {
        team1Players.push({
          userId: p.userId,
          username: p.username,
          id: p.id,
          team: 1,
          paddleIndex: team1Players.length
        });
      });

      localTeam2.forEach((p: any) => {
        team2Players.push({
          userId: p.userId,
          username: p.username,
          id: p.id,
          team: 2,
          paddleIndex: team2Players.length
        });
      });

      // Check if AI player is selected
      const aiCard = document.getElementById('ai-player-card');
      if (aiCard && aiCard.classList.contains('active') && playerManager.isPlayerSelected('ai-player')) {
        const inTeam2 = aiCard.closest('#team2-list') !== null;
        const aiPlayer = {
          userId: 0,
          username: 'Bot',
          id: 'ai-player',
          team: inTeam2 ? 2 : 1,
          paddleIndex: inTeam2 ? team2Players.length : team1Players.length
        };

        if (inTeam2) {
          team2Players.push(aiPlayer);
        } else {
          team1Players.push(aiPlayer);
        }
      }

      // Connect to arcade game server
      await this.gameNetworkManager.connectToArcadeGame(
        user,
        team1Players,
        team2Players,
        this.currentTournamentMatch
      );

      // Set arcade players for rendering
      const gameCoordinator = (window as any).gameManager;
      if (gameCoordinator && typeof gameCoordinator.setArcadePlayers === 'function') {
        gameCoordinator.setArcadePlayers(team1Players, team2Players);
      }

      // Send arcade match request
      this.gameNetworkManager.sendArcadeMatchRequest(
        user,
        team1Players,
        team2Players,
        this.currentTournamentMatch
      );

    } catch (error) {
      logger.error('game-mode-manager', 'Failed to start arcade match', error);
      this.hideWaitingMessage();
      alert('Failed to start arcade match. Please try again.');
      throw error;
    }
  }

  private async startCampaignMatch(): Promise<void> {
    console.log('🎯 [MODE] Starting campaign match');

    const user = this.getCurrentUser();
    if (!user) {
      this.redirectToLogin();
      return;
    }

    this.showWaitingMessage();

    try {
      await this.gameNetworkManager.connectToCampaignGame(user);
    } catch (error) {
      logger.error('game-mode-manager', 'Failed to start campaign match', error);
      this.hideWaitingMessage();
      alert('Failed to start campaign match. Please try again.');
      throw error;
    }
  }

  private handleCampaignGameEnd(gameData: any): void {
    const user = this.getCurrentUser();
    if (!user) return;

    const winnerId = (typeof gameData.winner === 'number') ? gameData.winner : gameData.winnerId;
    const playerWon = winnerId === user.userId;

    this.campaignManager.handleGameEnd(playerWon,
      () => this.gameUIManager.showLevelUpMessage(() => this.restartCampaignLevel()),
      () => this.gameUIManager.showRetryMessage()
    );
  }

  private handleArcadeGameEnd(gameData: any): void {
    console.log('🕹️ [MODE] Arcade game ended:', gameData);

    const user = this.getCurrentUser();
    if (!user) return;

    const winnerId = (typeof gameData.winner === 'number') ? gameData.winner : gameData.winnerId;
    const playerWon = winnerId === user.userId;

    const scores = gameData.scores || { player1: 0, player2: 0 };
    const finalScoreText = `${scores.player1} - ${scores.player2}`;

    this.gameUIManager.showArcadeResultMessage(playerWon, finalScoreText);
  }

  private handleTournamentGameEnd(gameData: any): void {
    const user = this.getCurrentUser();
    if (!user || !this.currentTournamentMatch) return;

    this.tournamentGameManager.handleTournamentGameEnd(
      gameData,
      this.currentTournamentMatch,
      (playerWon: boolean, scoreText: string) => {
        this.gameUIManager.showTournamentResultMessage(playerWon, scoreText);
      }
    );
  }

  private handleDefaultGameEnd(gameData: any): void {
    const user = this.getCurrentUser();
    let winnerMessage = 'Game Over!';

    if (gameData.winner && user) {
      winnerMessage = gameData.winner === user.userId ? '🎉 You Win!' : '😔 You Lost!';
    }

    const finalScores = gameData.scores ?
      `Final Score: ${gameData.scores.player1} - ${gameData.scores.player2}` :
      '';

    alert(`${winnerMessage}\n${finalScores}`);
  }

  private getCurrentUser(): User | null {
    return authManager?.getCurrentUser() || null;
  }

  private redirectToLogin(): void {
    alert('You must be logged in to play. Redirecting to login page.');
    const gameScreen = document.getElementById('game-screen');
    const loginScreen = document.getElementById('login-screen');
    if (gameScreen && loginScreen) {
      gameScreen.classList.remove('active');
      loginScreen.classList.add('active');
    }
  }

  private showWaitingMessage(): void {
    const waitingMsg = document.getElementById('waiting-message');
    if (waitingMsg) waitingMsg.classList.remove('hidden');
  }

  private hideWaitingMessage(): void {
    const waitingMsg = document.getElementById('waiting-message');
    if (waitingMsg) waitingMsg.classList.add('hidden');
  }
}