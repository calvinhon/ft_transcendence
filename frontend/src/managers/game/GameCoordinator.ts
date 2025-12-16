// frontend/src/managers/game/GameCoordinator.ts
// Coordinates between all game managers
import { logger } from '../../utils/Logger';

import { GameRenderer } from '../GameRenderer';
import { GameInputHandler } from '../GameInputHandler';
import { GameNetworkManager } from '../GameNetworkManager';
import { GameUIManager } from '../GameUIManager';
import { CampaignManager } from '../CampaignManager';
import { TournamentGameManager } from '../TournamentGameManager';
import { GameLifecycleManager } from './GameLifecycleManager';
import { GameModeManager } from './GameModeManager';
import { authService } from '../../core/authService';
import { getTournamentManager } from '../tournament';

interface GameSettings {
  gameMode: 'coop' | 'arcade' | 'tournament';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  ballSpeed: 'slow' | 'medium' | 'fast';
  paddleSpeed: 'slow' | 'medium' | 'fast';
  powerupsEnabled: boolean;
  accelerateOnHit: boolean;
  scoreToWin: number;
}

interface GameState {
  leftPaddle: { y: number; speed: number };
  rightPaddle: { y: number; speed: number };
  ball: { x: number; y: number; vx: number; vy: number; radius?: number };
  leftScore: number;
  rightScore: number;
  status: string;
  gameWidth: number;
  gameHeight: number;
  paddleHeight: number;
  paddleWidth: number;
  ballRadius: number;
}

export class GameCoordinator {
  // Core managers
  private gameRenderer!: GameRenderer;
  private gameInputHandler!: GameInputHandler;
  private gameNetworkManager!: GameNetworkManager;
  private gameUIManager!: GameUIManager;
  private campaignManager!: CampaignManager;
  private tournamentGameManager!: TournamentGameManager;

  // Specialized managers
  private lifecycleManager!: GameLifecycleManager;
  private modeManager!: GameModeManager;

  // Core state
  private gameSettings: GameSettings;
  private instanceId: number;

  // Singleton pattern
  private static instance: GameCoordinator | null = null;
  private static instanceCounter: number = 0;

  constructor(gameSettings: GameSettings) {
    // ENFORCE SINGLETON
    GameCoordinator.instanceCounter++;
    this.instanceId = GameCoordinator.instanceCounter;

    if (GameCoordinator.instanceCounter > 1) {
      logger.error('GameCoordinator', `MULTIPLE GameCoordinator instances detected! This is instance #${this.instanceId}`);
      logger.error('GameCoordinator', 'BLOCKING DUPLICATE INSTANCE CREATION');
      throw new Error(`GameCoordinator instance #${this.instanceId} rejected - only one instance allowed!`);
    }

    console.log(`🎮 [COORDINATOR] Constructor called - creating instance #${this.instanceId}`);
    this.gameSettings = gameSettings;

    this.initializeManagers();
    this.setupEventHandlers();

    GameCoordinator.instance = this;
  }

  // Get singleton instance
  public static getInstance(): GameCoordinator | null {
    return GameCoordinator.instance;
  }

  // Create singleton instance
  public static createInstance(gameSettings: GameSettings): GameCoordinator {
    if (GameCoordinator.instance) {
      throw new Error('GameCoordinator instance already exists');
    }
    return new GameCoordinator(gameSettings);
  }

  // Initialize all managers
  private initializeManagers(): void {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Game canvas not found');
    }

    // Initialize core managers
    this.gameRenderer = new GameRenderer(canvas, this.gameSettings);
    this.gameInputHandler = new GameInputHandler(this.gameSettings);
    this.gameNetworkManager = new GameNetworkManager(this.gameSettings);
    this.gameUIManager = new GameUIManager();
    this.campaignManager = new CampaignManager();
    this.tournamentGameManager = new TournamentGameManager();

    // Initialize specialized managers
    this.lifecycleManager = new GameLifecycleManager(
      this.gameNetworkManager,
      this.gameInputHandler,
      this.gameRenderer,
      this.gameUIManager,
      this.campaignManager,
      this.gameSettings
    );

    this.modeManager = new GameModeManager(
      this.gameNetworkManager,
      this.gameUIManager,
      this.campaignManager,
      this.tournamentGameManager,
      this.gameSettings
    );
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    // Network manager event handlers
    this.gameNetworkManager.setEventHandlers({
      onGameStateUpdate: (gameState) => this.handleGameStateUpdate(gameState),
      onGameEnd: (gameData) => this.handleGameEnd(gameData),
      onConnectionAck: () => this.handleConnectionAck()
    });

    // Setup input handlers
    this.setupInputHandlers();

    // Setup UI event listeners
    this.setupUIEventListeners();
  }

  // Setup input event handlers
  private setupInputHandlers(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

      if (!isInputFocused && this.lifecycleManager.getIsPlaying()) {
        this.gameInputHandler.handleKeyboardEvent(e, true);
      }
    }, true);

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

      if (!isInputFocused && this.lifecycleManager.getIsPlaying()) {
        this.gameInputHandler.handleKeyboardEvent(e, false);
      }
    }, true);

    // Canvas click handler
    const setupCanvasHandlers = () => {
      const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      if (gameCanvas) {
        gameCanvas.addEventListener('click', () => {
          if (this.lifecycleManager.getIsPlaying()) {
            gameCanvas.focus();
          }
        });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupCanvasHandlers);
    } else {
      setupCanvasHandlers();
    }
  }

  // Setup UI event listeners
  private setupUIEventListeners(): void {
    // Find match button
    const findMatchBtn = document.getElementById('find-match-btn') as HTMLButtonElement;
    if (findMatchBtn) {
      findMatchBtn.addEventListener('click', () => {
        this.findMatch();
      });
    }
  }

  // Public API methods - delegate to appropriate managers

  // Game lifecycle
  public async startGame(): Promise<void> {
    console.log('🎮 [COORDINATOR] Starting game');
    this.lifecycleManager.startGame();
    await this.modeManager.startGame();
  }

  public pauseGame(): void {
    this.lifecycleManager.pauseGame();
  }

  public stopGame(): void {
    this.lifecycleManager.stopGame();
  }

  // Game modes
  public async startBotMatch(): Promise<void> {
    console.log('🎮 [COORDINATOR] Starting bot match');
    this.lifecycleManager.startGame();
    await this.modeManager.startBotMatch();
  }

  public async startArcadeMatch(): Promise<void> {
    console.log('🕹️ [COORDINATOR] Starting arcade match');
    this.lifecycleManager.startGame();
    await this.modeManager.startArcadeMatch();
  }

  public async startTournamentMatch(): Promise<void> {
    console.log('🏆 [COORDINATOR] Starting tournament match');
    this.lifecycleManager.startGame();
    await this.modeManager.startTournamentMatch();
  }

  public async startCampaignGame(): Promise<void> {
    console.log('🎯 [COORDINATOR] Starting campaign game');
    this.lifecycleManager.startGame();
    await this.modeManager.startCampaignGame();
  }

  // Settings
  public setGameSettings(settings: Partial<GameSettings>): void {
    this.gameSettings = { ...this.gameSettings, ...settings };
    this.lifecycleManager.updateSettings(this.gameSettings);
    this.modeManager.updateSettings(this.gameSettings);
    console.log('🎮 [COORDINATOR] Updated game settings:', this.gameSettings);
  }

  public getGameSettings(): GameSettings {
    return { ...this.gameSettings };
  }

  // Tournament match data
  public setCurrentTournamentMatch(match: any): void {
    this.lifecycleManager.setCurrentTournamentMatch(match);
    this.modeManager.setCurrentTournamentMatch(match);
  }

  // Arcade players data
  public setArcadePlayers(team1: any[], team2: any[]): void {
    this.lifecycleManager.setArcadePlayers(team1, team2);
  }

  // Getters for external access
  public getIsPlaying(): boolean {
    return this.lifecycleManager.getIsPlaying();
  }

  public getIsPaused(): boolean {
    return this.lifecycleManager.getIsPaused();
  }

  public getGameState(): GameState | null {
    return this.lifecycleManager.getGameState();
  }

  // Settings getters
  public getBallSpeedValue(): number {
    switch (this.gameSettings.ballSpeed) {
      case 'slow': return 3;
      case 'medium': return 4;
      case 'fast': return 7;
      default: return 4;
    }
  }

  public getPaddleSpeedValue(): number {
    switch (this.gameSettings.paddleSpeed) {
      case 'slow': return 5;
      case 'medium': return 8;
      case 'fast': return 12;
      default: return 8;
    }
  }

  public getAIDifficulty(): 'easy' | 'medium' | 'hard' {
    return this.gameSettings.aiDifficulty;
  }

  public isAccelerateOnHitEnabled(): boolean {
    return this.gameSettings.accelerateOnHit;
  }

  public getScoreToWin(): number {
    return this.gameSettings.scoreToWin;
  }

  public getCurrentCampaignLevel(): number {
    return this.campaignManager.getCurrentLevel();
  }

  public isInCampaignMode(): boolean {
    return this.campaignManager.isCampaignActive();
  }

  // Campaign methods
  public endCampaign(): void {
    this.modeManager.endCampaign();
  }

  public cleanupCampaignModals(): void {
    this.gameUIManager.cleanupCampaignModals();
  }

  // User authentication
  public onUserAuthenticated(user: any): void {
    console.log('🎮 [COORDINATOR] User authenticated:', user);

    if (this.gameNetworkManager.isConnected()) {
      this.gameNetworkManager.closeConnection();
    }
  }

  // Find match
  public async findMatch(): Promise<void> {
    console.log('🎮 [COORDINATOR] Finding match...');

    const user = authService?.getCurrentUser?.();
    if (!user || !(user.userId || user.id)) {
      alert('You must be logged in to play. Redirecting to login page.');
      const gameScreen = document.getElementById('game-screen');
      const loginScreen = document.getElementById('login-screen');
      if (gameScreen && loginScreen) {
        gameScreen.classList.remove('active');
        loginScreen.classList.add('active');
      }
      return;
    }

    const findBtn = document.getElementById('find-match-btn') as HTMLButtonElement;
    const waitingMsg = document.getElementById('waiting-message');

    if (findBtn) {
      findBtn.disabled = true;
      findBtn.textContent = 'Finding...';
    }
    if (waitingMsg) {
      waitingMsg.classList.remove('hidden');
    }

    try {
      await this.connectToGameServer();
    } catch (error) {
      logger.error('GameCoordinator', 'Failed to connect to game server', error);
      this.lifecycleManager.resetFindMatchUI();
    }
  }

  // Event handlers
  private handleGameStateUpdate(gameState: GameState): void {
    this.lifecycleManager.handleGameStateUpdate(gameState);
  }

  private handleGameEnd(gameData: any): void {
    this.lifecycleManager.endGame(gameData);
    this.modeManager.handleGameEnd(gameData);

    // Handle navigation based on game mode
    this.handleGameEndNavigation(gameData);
  }

  private handleConnectionAck(): void {
    this.lifecycleManager.handleConnectionAck();
    // Send joinBotGame for bot matches
    this.sendJoinBotGameMessage();
  }

  // Private helper methods
  private async connectToGameServer(): Promise<void> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;

    this.gameNetworkManager.closeConnection();

    // Connect to bot game server
    await new Promise((resolve, reject) => {
      // This is a simplified version - the actual implementation would be more complex
      setTimeout(() => resolve(void 0), 1000); // Simulate connection
    });
  }

  private sendJoinBotGameMessage(): void {
    const user = authService?.getCurrentUser?.();

    if (!user || !(user.userId || user.id) || !this.gameNetworkManager.isConnected()) {
      return;
    }

    let gameSettings: any;
    if (this.campaignManager.isCampaignActive()) {
      gameSettings = this.campaignManager.getLevelSettings();
    } else {
      gameSettings = this.gameSettings;
    }

    console.log('🎮 [COORDINATOR] Sending joinBotGame after connectionAck:', gameSettings);

    const message: any = {
      type: 'joinBotGame',
      userId: (user.userId || user.id),
      username: user.username,
      gameSettings: gameSettings
    };

    // Add tournament player info if available
    if (this.modeManager) {
      // This would be set by the tournament match data
    }

    this.gameNetworkManager.getWebSocket()?.send(JSON.stringify(message));
  }

  private handleGameEndNavigation(gameData: any): void {
    // Reset UI
    this.lifecycleManager.resetFindMatchUI();

    // Close websocket
    this.gameNetworkManager.closeConnection();

    // Handle navigation based on game mode
    if (this.campaignManager.isCampaignActive()) {
      // Campaign mode handles its own navigation
      return;
    }

    if (this.gameSettings.gameMode === 'arcade') {
      // Arcade mode navigation handled by mode manager
      setTimeout(() => {
        const app = (window as any).app;
        if (app && app.router) {
          app.router.navigateToScreen('play-config');
        }
      }, 3000);
      return;
    }

    if (this.gameSettings.gameMode === 'tournament') {
      // Tournament mode navigation
      setTimeout(() => {
        const app = (window as any).app;
        if (app && app.router) {
          app.router.navigateToScreen('play-config');
        }

        // Show tournament bracket again
        // Use accessor to obtain tournament manager safely
        try {
          const tournamentManager = getTournamentManager();
          if (tournamentManager && tournamentManager.viewTournament) {
            // This would need the tournament ID from the match data
          }
        } catch (err) {
          // ignore if tournament module not available in this context
        }
      }, 3000);
      return;
    }

    // Default navigation
    const app = (window as any).app;
    if (app && app.router) {
      app.router.navigateToScreen('play-config');
    }
  }
}

// Export singleton instance
export const gameCoordinator = GameCoordinator.getInstance();