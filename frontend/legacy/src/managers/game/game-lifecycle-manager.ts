// frontend/src/managers/game/GameLifecycleManager.ts
// Manages game lifecycle operations (start, stop, pause, resume)

import { GameNetworkManager } from '../game-network-manager';
import { GameInputHandler } from '../game-input-handler';
import { GameRenderer } from '../game-renderer';
import { GameUIManager } from '../game-ui-manager';
import { CampaignManager } from '../campaign-manager';

interface GameState {
  type: 'gameState';
  ball: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    frozen?: boolean;
  };
  paddles: {
    player1: { x: number; y: number };
    player2: { x: number; y: number };
    team1?: Array<{ x: number; y: number }>;
    team2?: Array<{ x: number; y: number }>;
  };
  scores: {
    player1: number;
    player2: number;
  };
  gameState: 'countdown' | 'playing' | 'finished';
  countdownValue?: number;
}

interface GameSettings {
  gameMode: 'coop' | 'arcade' | 'tournament';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  ballSpeed: 'slow' | 'medium' | 'fast';
  paddleSpeed: 'slow' | 'medium' | 'fast';
  powerupsEnabled: boolean;
  accelerateOnHit: boolean;
  scoreToWin: number;
}

export class GameLifecycleManager {
  private gameNetworkManager: GameNetworkManager;
  private gameInputHandler: GameInputHandler;
  private gameRenderer: GameRenderer;
  private gameUIManager: GameUIManager;
  private campaignManager: CampaignManager;

  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private gameState: GameState | null = null;
  private gameSettings: GameSettings;
  private currentTournamentMatch: any = null;
  private arcadePlayers: { team1: any[]; team2: any[] } = { team1: [], team2: [] };

  constructor(
    gameNetworkManager: GameNetworkManager,
    gameInputHandler: GameInputHandler,
    gameRenderer: GameRenderer | null,
    gameUIManager: GameUIManager,
    campaignManager: CampaignManager,
    gameSettings: GameSettings
  ) {
    this.gameNetworkManager = gameNetworkManager;
    this.gameInputHandler = gameInputHandler;
    this.gameRenderer = gameRenderer!; // Assert non-null for now, but we'll check before use
    this.gameUIManager = gameUIManager;
    this.campaignManager = campaignManager;
    this.gameSettings = gameSettings;
  }

  public setGameRenderer(renderer: GameRenderer): void {
    this.gameRenderer = renderer;
  }

  // Update settings reference
  public updateSettings(gameSettings: GameSettings): void {
    this.gameSettings = gameSettings;
  }

  // Update tournament match data
  public setCurrentTournamentMatch(match: any): void {
    this.currentTournamentMatch = match;
  }

  // Update arcade players data
  public setArcadePlayers(team1: any[], team2: any[]): void {
    this.arcadePlayers = { team1, team2 };
  }

  // Get current state
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getGameState(): GameState | null {
    return this.gameState;
  }

  // Lifecycle operations
  public startGame(): void {
    console.log('🎮 [LIFECYCLE] Starting game');
    this.isPlaying = true;
    this.isPaused = false;

    // Start rendering
    if (this.gameRenderer) {
      this.gameRenderer.startRendering();
    } else {
      console.warn('⚠️ [LIFECYCLE] Game started but no renderer available!');
    }
  }

  public pauseGame(): void {
    if (!this.isPlaying) return;

    this.isPaused = !this.isPaused;
    console.log(this.isPaused ? '🎮 [LIFECYCLE] Game paused' : '🎮 [LIFECYCLE] Game resumed');

    // Send pause message to server
    this.gameNetworkManager.sendPauseCommand(this.isPaused);

    // Update pause button text
    this.updatePauseButtonUI();
  }

  public stopGame(): void {
    console.log(`🛑 [LIFECYCLE] Stopping game, isPlaying: ${this.isPlaying}, isCampaignMode: ${this.campaignManager.isCampaignActive()}`);

    // Set flags first to prevent any new operations
    this.isPlaying = false;
    this.isPaused = false;

    // Stop rendering
    if (this.gameRenderer) {
      this.gameRenderer.stopRendering();
    }

    // Clean up any campaign modals
    this.gameUIManager.cleanupCampaignModals();

    // Close websocket connection
    this.gameNetworkManager.closeConnection();

    // Stop input handling
    this.gameInputHandler.stopInputHandling();

    // Reset game state
    this.gameState = null;

    // If in campaign mode, exit campaign
    if (this.campaignManager.isCampaignActive()) {
      console.log('🛑 [LIFECYCLE] Exiting campaign mode');
      this.campaignManager.endCampaign();
      this.gameUIManager.setCampaignMode(false);
      this.gameUIManager.updateCampaignUI();
    }

    console.log('🛑 [LIFECYCLE] Game stopped - navigation handled by caller');
  }

  public endGame(result: any): void {
    console.log('🎮 [END] Game ended:', result);

    // GUARD: Prevent handling endGame multiple times
    if (!this.isPlaying) {
      console.warn('⚠️ [END] Game already ended, ignoring duplicate endGame call');
      return;
    }

    this.isPlaying = false;

    // Handle different game modes - this will be delegated to GameModeManager
    // For now, just log the result
    console.log('🎮 [END] Game result:', result);
  }

  // Handle game state updates from network
  public handleGameStateUpdate(gameState: GameState): void {
    this.gameState = gameState;

    // Transform GameState to RendererGameState
    const rendererGameState: any = {
      gameState: gameState.gameState,
      countdownValue: gameState.countdownValue
    };

    // Only include scores if they exist in gameState
    if (gameState.scores) {
      rendererGameState.scores = {
        player1: gameState.scores.player1,
        player2: gameState.scores.player2
      };
    }

    // Only include ball if it exists in gameState
    if (gameState.ball) {
      rendererGameState.ball = {
        x: gameState.ball.x,
        y: gameState.ball.y,
        vx: gameState.ball.dx,
        vy: gameState.ball.dy,
        radius: 5 // Default ball radius
      };
    }

    // Include player data for arcade mode
    if (this.gameSettings.gameMode === 'arcade' && this.arcadePlayers.team1.length > 0) {
      rendererGameState.players = {
        team1: this.arcadePlayers.team1.map((player, index) => ({
          userId: player.userId || player.id,
          username: player.username,
          team: 1,
          paddleIndex: index
        })),
        team2: this.arcadePlayers.team2.map((player, index) => ({
          userId: player.userId || player.id,
          username: player.username,
          team: 2,
          paddleIndex: index
        }))
      };
    }

    // Handle paddles - support both single paddles and team arrays
    const paddles: any[] = [];

    if (this.gameSettings.gameMode === 'arcade' && gameState.paddles.team1 && gameState.paddles.team2) {
      // Arcade mode: Use team arrays
      const team1Paddles = gameState.paddles.team1.map((paddle: any, index: number) => ({
        x: paddle.x || (index === 0 ? 50 : index === 1 ? 40 : 30), // Staggered x positions for multiple paddles
        y: paddle.y,
        width: 10,
        height: 100,
        team: 1
      }));

      const team2Paddles = gameState.paddles.team2.map((paddle: any, index: number) => ({
        x: paddle.x || (index === 0 ? 740 : index === 1 ? 750 : 760), // Staggered x positions for multiple paddles
        y: paddle.y,
        width: 10,
        height: 100,
        team: 2
      }));

      paddles.push(...team1Paddles, ...team2Paddles);
    } else {
      // Single paddle mode (coop, tournament)
      paddles.push(
        {
          x: gameState.paddles.player1.x,
          y: gameState.paddles.player1.y,
          width: 10,
          height: 100,
          team: 1
        },
        {
          x: gameState.paddles.player2.x,
          y: gameState.paddles.player2.y,
          width: 10,
          height: 100,
          team: 2
        }
      );
    }

    rendererGameState.paddles = paddles;

    if (this.gameRenderer) {
      this.gameRenderer.setGameState(rendererGameState);
    }
  }

  // Handle connection acknowledgment
  public handleConnectionAck(): void {
    console.log('📡 [LIFECYCLE] Connection acknowledged');
  }

  // Reset UI elements
  public resetFindMatchUI(): void {
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

  // Private helper methods
  private updatePauseButtonUI(): void {
    const pauseBtn = document.getElementById('pause-game-btn');
    if (pauseBtn) {
      const span = pauseBtn.querySelector('span');
      const icon = pauseBtn.querySelector('i');
      if (span && icon) {
        if (this.isPaused) {
          span.textContent = 'Resume';
          icon.className = 'fas fa-play';
        } else {
          span.textContent = 'Pause';
          icon.className = 'fas fa-pause';
        }
      }
    }
  }
}