// frontend/src/game-manager.ts
// Main game manager - orchestrates all game components

import { GameRenderer } from './game/GameRenderer.js';
import { CampaignMode } from './game/CampaignMode.js';
import { GameStateManager } from './game-state.js';
import { GameInputHandler } from './game-input.js';
import { GameNetworkHandler } from './game-network.js';
import { GameSettingsManager } from './game-settings.js';
import { User, GameState, GameConfig, GameSettings, TournamentMatch } from './game-interfaces.js';

export class GameManager {
  private static instanceCounter = 0;
  private instanceId: number;

  // Core components
  private renderer: GameRenderer;
  private campaignMode: CampaignMode;
  private stateManager: GameStateManager;
  private inputHandler: GameInputHandler;
  private networkHandler: GameNetworkHandler;
  private settingsManager: GameSettingsManager;

  // Canvas and rendering
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Input handling
  private inputInterval: number | null = null;

  // Last mode logging
  private lastModeLogTime = 0;

  constructor() {
    // Assign unique instance ID
    GameManager.instanceCounter++;
    this.instanceId = GameManager.instanceCounter;

    // ENFORCE SINGLETON: Only allow ONE instance
    if (GameManager.instanceCounter > 1) {
      console.error(`⚠️⚠️⚠️ MULTIPLE GameManager instances detected! This is instance #${this.instanceId}`);
      console.error('⚠️⚠️⚠️ BLOCKING DUPLICATE INSTANCE CREATION');
      throw new Error(`GameManager instance #${this.instanceId} rejected - only one instance allowed!`);
    }

    // Initialize components
    this.renderer = new GameRenderer('game-canvas');
    this.campaignMode = new CampaignMode();
    this.stateManager = new GameStateManager({
      gameMode: 'coop',
      aiDifficulty: 'medium',
      ballSpeed: 'medium',
      paddleSpeed: 'medium',
      powerupsEnabled: false,
      accelerateOnHit: false,
      scoreToWin: 3
    });
    this.inputHandler = new GameInputHandler();
    this.networkHandler = new GameNetworkHandler((data) => this.handleGameMessageData(data));
    this.settingsManager = new GameSettingsManager();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Setup canvas click handler - check if DOM is already loaded
    const setupCanvasHandlers = () => {
      const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      if (gameCanvas) {
        gameCanvas.addEventListener('click', () => {
          if (this.stateManager.getIsPlaying()) {
            gameCanvas.focus();
          }
        });
      }
    };

    // Run immediately if DOM is already loaded, otherwise wait for DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupCanvasHandlers);
    } else {
      setupCanvasHandlers();
    }

    // Find match button (legacy support)
    const findMatchBtn = document.getElementById('find-match-btn') as HTMLButtonElement;
    if (findMatchBtn) {
      findMatchBtn.addEventListener('click', () => {
        this.findMatch();
      });
    }
  }

  // Public API methods
  public async findMatch(): Promise<void> {
    // Check if user is logged in before attempting to find match
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    if (!user || !user.userId) {
      alert('You must be logged in to play. Redirecting to login page.');
      // Redirect to login page
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
      await this.networkHandler.connectToGameServer();
    } catch (error) {
      console.error('Failed to connect to game server:', error);
      this.resetFindMatch();
    }
  }

  private resetFindMatch(): void {
    const findBtn = document.getElementById('find-match-btn') as HTMLButtonElement;
    const waitingMsg = document.getElementById('waiting-message');
    const gameArea = document.getElementById('game-area');

    if (findBtn) {
      findBtn.disabled = false;
      findBtn.textContent = 'Find Match';
      findBtn.style.display = 'block';
    }
    if (waitingMsg) waitingMsg.classList.add('hidden');
    if (gameArea) gameArea.classList.add('hidden');
  }

  private handleGameMessageData(message: any): void {
    switch (message.type) {
      case 'connectionAck': {
        this.sendJoinBotGameMessage();
        break;
      }
      case 'waiting':
        // console.log('Waiting for opponent:', message.message);
        break;
      case 'gameStart':
        this.startGame(message);
        break;
      case 'gameState':
        // console.log('🎮 [GAME-MSG] Game state update:', message);
        this.updateGameFromBackend(message);
        break;
      case 'gameEnd':
        this.endGame(message);
        break;
      default:
        // console.log('🎮 [GAME-MSG] Unknown message type:', message.type);
    }
  }

  private sendJoinBotGameMessage(): void {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    if (!user || !user.userId) {
      console.error('No valid user logged in!');
      return;
    }

    let gameSettings: GameSettings;
    if (this.stateManager.getIsCampaignMode()) {
      gameSettings = this.campaignMode.getLevelSettings();
    } else {
      gameSettings = this.settingsManager.getSettings();
    }

    // Prepare message with tournament player data if available
    const tournamentMatch = this.stateManager.getCurrentTournamentMatch();
    this.networkHandler.joinBotGame(user.userId, user.username, gameSettings, tournamentMatch);
  }

  private startGame(message: any): void {
    if (this.stateManager.getIsPlaying()) {
      return;
    }

    if (message.gameSettings) {
      this.settingsManager.setSettings(message.gameSettings);
    }

    this.ensureCanvasInitialized();
    this.startInputHandler();
    this.stateManager.setIsPlaying(true);
  }

  private ensureCanvasInitialized(): void {
    if (this.canvas) return; // already initialized
    this.initCanvas({
      canvasWidth: 800,
      canvasHeight: 600,
      paddleWidth: 10,
      paddleHeight: 100,
      ballRadius: 5,
      paddleSpeed: this.settingsManager.getPaddleSpeedValue()
    });
  }

  private initCanvas(config: GameConfig): void {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      console.error('Could not get canvas context');
      return;
    }

    this.canvas.width = config.canvasWidth;
    this.canvas.height = config.canvasHeight;
    this.canvas.tabIndex = 1; // Make canvas focusable
    this.canvas.focus();

    // Initialize GameRenderer canvas with same dimensions
    this.renderer.initCanvas(config.canvasWidth, config.canvasHeight);
  }

  private startInputHandler(): void {
    if (this.inputInterval) {
      clearInterval(this.inputInterval);
      this.inputInterval = null;
    }
    this.inputInterval = setInterval(() => {
      if (this.networkHandler.isConnected() && !this.stateManager.getIsPaused()) {

        // Route to mode-specific input handler
        switch (this.settingsManager.getGameMode()) {
          case 'tournament':
            this.handleTournamentInputs();
            break;
          case 'arcade':
            this.handleArcadeInputs();
            break;
          case 'coop':
          default:
            this.handleCoopInputs();
            break;
        }
      }
    }, 16); // ~60fps
  }

  private handleCoopInputs(): void {
    const direction = this.inputHandler.getCoopInput();
    if (direction) {
      this.networkHandler.movePaddle(direction);
    }
  }

  private handleTournamentInputs(): void {
    const inputs = this.inputHandler.getTournamentInput();

    if (inputs.player1) {
      this.networkHandler.movePaddle(inputs.player1);
    }

    if (inputs.player2) {
      this.networkHandler.movePaddle(inputs.player2, 2); // Player 2 uses playerId: 2
    }
  }

  private handleArcadeInputs(): void {
    // TODO: Implement arcade input handling
    // This would be complex with multiple paddles per team
    console.log('Arcade input handling not yet implemented');
  }

  private updateGameFromBackend(backendState: any): void {
    // Don't update game state if paused
    if (this.stateManager.getIsPaused()) {
      return;
    }

    // Allow updates during countdown
    if (!this.stateManager.getIsPlaying() && backendState.gameState !== 'countdown') {
      console.log(`⚠️ [GM#${this.instanceId}] Ignoring game state - game is not playing`);
      return;
    }

    // Convert backend game state format to frontend format
    if (backendState.ball && backendState.paddles && backendState.scores) {
      const frontendState: GameState = {
        leftPaddle: { y: backendState.paddles.player1?.y ?? 250, speed: 0 },
        rightPaddle: { y: backendState.paddles.player2?.y ?? 250, speed: 0 },
        ball: {
          x: backendState.ball.x,
          y: backendState.ball.y,
          vx: backendState.ball.dx,
          vy: backendState.ball.dy
        },
        leftScore: backendState.scores.player1,
        rightScore: backendState.scores.player2,
        status: backendState.gameState || 'playing',
        gameWidth: 800,
        gameHeight: 600,
        paddleHeight: 100,
        paddleWidth: 10,
        ballRadius: 5
      };

      // Handle multiple paddles for arcade mode OR tournament mode with team arrays
      const useTeamArrays = (this.settingsManager.getGameMode() === 'arcade' || this.settingsManager.getGameMode() === 'tournament') &&
                            backendState.paddles.team1 && Array.isArray(backendState.paddles.team1);

      if (useTeamArrays && backendState.paddles.team1 && Array.isArray(backendState.paddles.team1)) {
        frontendState.leftPaddles = backendState.paddles.team1.map((p: any, index: number) => {
          const playerInfo = this.stateManager.getTeam1Players()[index];
          return {
            y: p.y,
            speed: 0,
            username: playerInfo?.username,
            userId: playerInfo?.userId,
            color: playerInfo?.color
          };
        });
      }
      if (useTeamArrays && backendState.paddles.team2 && Array.isArray(backendState.paddles.team2)) {
        frontendState.rightPaddles = backendState.paddles.team2.map((p: any, index: number) => {
          const playerInfo = this.stateManager.getTeam2Players()[index];
          return {
            y: p.y,
            speed: 0,
            username: playerInfo?.username,
            userId: playerInfo?.userId,
            color: playerInfo?.color
          };
        });
      }

      this.stateManager.setGameState(frontendState);

      // Store countdown value if in countdown state
      if (backendState.gameState === 'countdown' && backendState.countdownValue !== undefined) {
        this.stateManager.setCountdownValue(backendState.countdownValue);
      } else if (backendState.gameState === 'playing') {
        this.stateManager.setCountdownValue(null);
        if (!this.stateManager.getIsPlaying()) {
          this.stateManager.setIsPlaying(true);
        }
      }

      // Use GameRenderer to render the game
      if (this.stateManager.getGameState()) {
        this.renderer.render(
          this.stateManager.getGameState()!,
          this.stateManager.getIsPaused(),
          this.stateManager.getCountdownValue(),
          this.settingsManager.getSettings(),
          this.stateManager.getIsCampaignMode(),
          this.stateManager.getCurrentCampaignLevel(),
          this.stateManager.getCurrentTournamentMatch()
        );
      }
    }
  }

  private endGame(result: any): void {
    // GUARD: Prevent handling endGame multiple times
    if (!this.stateManager.getIsPlaying()) {
      return;
    }

    this.stateManager.setIsPlaying(false);

    if (this.inputInterval) {
      clearInterval(this.inputInterval);
      this.inputInterval = null;
    }

    // Handle campaign mode progression
    if (this.stateManager.getIsCampaignMode()) {
      this.handleCampaignGameEnd(result);
      return;
    }

    // Handle arcade mode completion
    if (this.settingsManager.getGameMode() === 'arcade') {
      this.handleArcadeGameEnd(result);
      return;
    }

    // Handle tournament mode completion
    if (this.settingsManager.getGameMode() === 'tournament') {
      this.handleTournamentGameEnd(result);
      return;
    }

    // Regular game end handling
    this.showGameResult(result);
    this.resetFindMatch();
    this.networkHandler.disconnect();
    this.notifyMatchManager();
    this.navigateToPlayConfig();
  }

  private handleCampaignGameEnd(result: any): void {
    // TODO: Implement campaign game end handling
    console.log('Campaign game end not yet implemented');
  }

  private handleArcadeGameEnd(result: any): void {
    // TODO: Implement arcade game end handling
    console.log('Arcade game end not yet implemented');
  }

  private handleTournamentGameEnd(result: any): void {
    // TODO: Implement tournament game end handling
    console.log('Tournament game end not yet implemented');
  }

  private showGameResult(result: any): void {
    // Determine winner message
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    let winnerMessage = 'Game Over!';

    if (result.winner && user) {
      if (result.winner === user.userId) {
        winnerMessage = '🎉 You Win!';
      } else {
        winnerMessage = '😔 You Lost!';
      }
    }

    // Show result with scores
    const finalScores = result.scores ?
      `Final Score: ${result.scores.player1} - ${result.scores.player2}` :
      '';

    alert(`${winnerMessage}\n${finalScores}`);
  }

  private notifyMatchManager(): void {
    try {
      const mm = (window as any).matchManager;
      if (mm && typeof mm.onGameEnd === 'function') mm.onGameEnd();
    } catch (e) {
      console.warn('Failed to notify matchManager of game end', e);
    }
  }

  private navigateToPlayConfig(): void {
    const app = (window as any).app;
    if (app && typeof app.showScreen === 'function') {
      app.showScreen('play-config');
    }
  }

  // Public API methods
  public onUserAuthenticated(user: User): void {
    console.log('GameManager: User authenticated:', user);

    // If game websocket is connected, authenticate it too
    if (this.networkHandler.isConnected()) {
      this.networkHandler.authenticate(user.userId, user.username);
    }
  }

  public pauseGame(): void {
    if (!this.stateManager.getIsPlaying()) return;

    const newPausedState = !this.stateManager.getIsPaused();
    this.stateManager.setIsPaused(newPausedState);
    console.log(this.stateManager.getIsPaused() ? 'Game paused' : 'Game resumed');

    // Send pause message to server if connected
    this.networkHandler.pauseGame(this.stateManager.getIsPaused());

    // Update pause button text
    const pauseBtn = document.getElementById('pause-game-btn');
    if (pauseBtn) {
      const span = pauseBtn.querySelector('span');
      const icon = pauseBtn.querySelector('i');
      if (span && icon) {
        if (this.stateManager.getIsPaused()) {
          span.textContent = 'Resume';
          icon.className = 'fas fa-play';
        } else {
          span.textContent = 'Pause';
          icon.className = 'fas fa-pause';
        }
      }
    }
  }

  public stopGame(): void {
    // Set flags first to prevent any new operations
    this.stateManager.setIsPlaying(false);
    this.stateManager.setIsPaused(false);

    // Clean up any campaign modals
    this.cleanupCampaignModals();

    // Close websocket connection
    this.networkHandler.disconnect();

    // Clear input interval
    if (this.inputInterval) {
      clearInterval(this.inputInterval);
      this.inputInterval = null;
    }

    // Reset game state
    this.stateManager.resetGameState();

    // Reset game mode to default
    this.settingsManager.setGameMode('coop');

    // If in campaign mode, exit campaign
    if (this.stateManager.getIsCampaignMode()) {
      this.stateManager.setIsCampaignMode(false);
      this.stateManager.setCurrentCampaignLevel(1);
    }

    // Navigate back to play config
    this.navigateToPlayConfig();
  }

  private cleanupCampaignModals(): void {
    // TODO: Implement campaign modal cleanup
  }

  // Game mode starters
  public async startBotMatch(): Promise<void> {
    console.log('🎮 [GameManager.startBotMatch] === CALLED ===');

    // GUARD: Prevent double starts
    if (this.stateManager.getIsPlaying()) {
      console.warn('⚠️ GameManager: Game already in progress, ignoring duplicate startBotMatch call');
      return;
    }

    console.log('✅ [GameManager.startBotMatch] Guard passed - proceeding with bot match');

    // Clear any leftover paddle data from previous games
    if (this.settingsManager.getGameMode() !== 'tournament') {
      this.stateManager.clearTeamPlayers();
      if (this.stateManager.getGameState()) {
        const gameState = this.stateManager.getGameState()!;
        gameState.leftPaddles = undefined;
        gameState.rightPaddles = undefined;
        console.log('🧹 Cleared leftover paddle arrays from previous game');
      }
    } else {
      console.log('🏆 [TOURNAMENT] Skipping team array clear - tournament mode needs them for input');
    }

    // Check game mode and start appropriate match type
    if (this.settingsManager.getGameMode() === 'coop') {
      console.log('🎯 [CAMPAIGN] CO-OP mode detected, starting campaign game');
      await this.startCampaignGame();
    } else if (this.settingsManager.getGameMode() === 'arcade') {
      console.log('🕹️ [ARCADE] ARCADE mode detected, starting arcade match');
      await this.startArcadeMatch();
    } else if (this.settingsManager.getGameMode() === 'tournament') {
      console.log('🏆 [TOURNAMENT] TOURNAMENT mode detected, starting tournament match');
      await this.startTournamentMatch();
    } else {
      console.log('🎮 [GAME] Starting standard bot match');
      this.startBotMatchWithSettings(false);
    }

    console.log('🏁 [GameManager.startBotMatch] === COMPLETED ===');
  }

  private async startCampaignGame(): Promise<void> {
    console.log('🎯 [CAMPAIGN] Starting campaign mode');
    this.stateManager.setIsCampaignMode(true);

    // Load player's current campaign level
    this.stateManager.setCurrentCampaignLevel(this.campaignMode.getCurrentLevel());

    console.log(`🎯 [CAMPAIGN] Starting campaign at player's current level ${this.stateManager.getCurrentCampaignLevel()}`);
    this.ensureCanvasInitialized();
    this.settingsManager.updateCampaignLevelSettings(this.stateManager.getCurrentCampaignLevel());
    this.campaignMode.updateUI();
    this.startCampaignMatch();
  }

  private async startArcadeMatch(): Promise<void> {
    console.log('🕹️ [ARCADE] Starting arcade mode');
    this.stateManager.setIsCampaignMode(false);

    // Sync settings from app
    const app = (window as any).app;
    if (app && app.gameSettings) {
      this.settingsManager.setSettings({ ...this.settingsManager.getSettings(), ...app.gameSettings });
    }

    console.log(`🕹️ [ARCADE] Score to win: ${this.settingsManager.getScoreToWin()}`);
    this.ensureCanvasInitialized();
    this.updateArcadeUI();
    await this.startArcadeMatchWithSettings();
  }

  private async startTournamentMatch(): Promise<void> {
    console.log('🏆 [TOURNAMENT] Starting tournament match');
    this.stateManager.setIsCampaignMode(false);

    // Sync settings from app
    const app = (window as any).app;
    if (app && app.gameSettings) {
      this.settingsManager.setSettings({ ...this.settingsManager.getSettings(), ...app.gameSettings });
    }

    if (!app || !app.currentTournamentMatch) {
      console.error('🏆 [TOURNAMENT] No tournament match data found!');
      return;
    }

    // Store tournament match data
    this.stateManager.setCurrentTournamentMatch(app.currentTournamentMatch);
    const match = this.stateManager.getCurrentTournamentMatch()!;
    console.log('🏆 [TOURNAMENT] Match:', match.player1Name, 'vs', match.player2Name);

    this.settingsManager.setGameMode('tournament');

    // Force team player counts to 1 for tournament mode
    const settings = this.settingsManager.getSettings();
    settings.team1PlayerCount = 1;
    settings.team2PlayerCount = 1;
    this.settingsManager.setSettings(settings);

    // Set up team player arrays
    this.stateManager.setTeam1Players([{
      userId: match.player1Id,
      username: match.player1Name,
      team: 1,
      paddleIndex: 0,
      color: '#77e6ff'
    }]);

    this.stateManager.setTeam2Players([{
      userId: match.player2Id,
      username: match.player2Name,
      team: 2,
      paddleIndex: 0,
      color: '#e94560'
    }]);

    this.ensureCanvasInitialized();
    await this.connectToBotGameServer();
  }

  private async startArcadeMatchWithSettings(): Promise<void> {
    // TODO: Implement arcade match setup
    console.log('Arcade match setup not yet implemented');
  }

  private startCampaignMatch(): void {
    // TODO: Implement campaign match start
    console.log('Campaign match start not yet implemented');
  }

  private async connectToBotGameServer(): Promise<void> {
    // TODO: Implement bot game server connection
    console.log('Bot game server connection not yet implemented');
  }

  private startBotMatchWithSettings(isCampaign: boolean): void {
    // TODO: Implement bot match with settings
    console.log('Bot match with settings not yet implemented');
  }

  private updateArcadeUI(): void {
    // TODO: Implement arcade UI update
    console.log('Arcade UI update not yet implemented');
  }

  // Settings API
  public setGameSettings(settings: Partial<GameSettings>): void {
    this.settingsManager.setSettings(settings);
  }

  public getGameSettings(): GameSettings {
    return this.settingsManager.getSettings();
  }

  public getBallSpeedValue(): number {
    return this.settingsManager.getBallSpeedValue();
  }

  public getPaddleSpeedValue(): number {
    return this.settingsManager.getPaddleSpeedValue();
  }

  public getAIDifficulty(): 'easy' | 'medium' | 'hard' {
    return this.settingsManager.getAIDifficulty();
  }

  public isAccelerateOnHitEnabled(): boolean {
    return this.settingsManager.isAccelerateOnHitEnabled();
  }

  public getScoreToWin(): number {
    return this.settingsManager.getScoreToWin();
  }

  public getCurrentCampaignLevel(): number {
    return this.stateManager.getCurrentCampaignLevel();
  }

  public isInCampaignMode(): boolean {
    return this.stateManager.getIsCampaignMode();
  }

  // Debug methods
  public testKeyboard(): void {
    console.log('🧪 [TEST] Testing keyboard input...');
    console.log('🧪 [TEST] isPlaying:', this.stateManager.getIsPlaying());
    console.log('🧪 [TEST] keys object:', this.inputHandler.getKeys());
    console.log('🧪 [TEST] activeElement:', document.activeElement?.tagName, (document.activeElement as HTMLElement)?.id);

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas) {
      console.log('🧪 [TEST] Canvas tabindex:', canvas.getAttribute('tabindex'));
      console.log('🧪 [TEST] Focusing canvas...');
      canvas.focus();
      console.log('🧪 [TEST] Active element after focus:', (document.activeElement as HTMLElement)?.id);
    }

    // Set up temporary key listener for testing
    const testListener = (e: KeyboardEvent) => {
      console.log('🧪 [TEST] Test key detected:', e.key);
      document.removeEventListener('keydown', testListener);
    };
    document.addEventListener('keydown', testListener);
    console.log('🧪 [TEST] Press any key to test...');
  }
}