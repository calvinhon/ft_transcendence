// Stub file - game module
// frontend/src/game.ts - TypeScript version of game manager

interface User {
  userId: number;
  username: string;
  email?: string;
}

interface GameState {
  leftPaddle: { y: number; speed: number };
  rightPaddle: { y: number; speed: number };
  ball: { x: number; y: number; vx: number; vy: number };
  leftScore: number;
  rightScore: number;
  status: string;
  gameWidth: number;
  gameHeight: number;
  paddleHeight: number;
  paddleWidth: number;
  ballRadius: number;
}

interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  ballRadius: number;
  paddleSpeed: number;
}

interface KeyState {
  [key: string]: boolean;
}

interface GameMessage {
  type: string;
  data?: any;
  player?: string;
  gameState?: GameState;
  config?: GameConfig;
  userId?: number;
  username?: string;
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

interface JoinGameMessage extends GameMessage {
  type: 'joinGame' | 'joinBotGame';
  userId: number;
  username: string;
  gameSettings?: GameSettings;
}

interface MovePaddleMessage extends GameMessage {
  type: 'movePaddle';
  direction: 'up' | 'down';
}

export class GameManager {
  // Start game with backend-provided message
  private startGame(message: any): void {
    // Guard: ignore duplicate start requests if a game is already playing
    if (this.isPlaying) {
      console.warn(`⚠️ [GM#${this.instanceId}] startGame called while already playing; ignoring duplicate`, message);
      return;
    }

    console.log(`✅ [GM#${this.instanceId}] Starting game...`);
    
    // Example: set isPlaying, initialize game state, start input handler
    this.isPlaying = true;
    this.isPaused = false;

    // You may want to parse message.gameState or other fields
    this.gameState = message.gameState || null;

    // Ensure canvas is initialized (idempotent)
    try {
      this.ensureCanvasInitialized();
    } catch (e) {
      console.warn('Failed to ensure canvas initialized before starting game', e);
    }

    // Start input handler to emit paddle moves
    this.startInputHandler();

    console.log(`🎮 [GM#${this.instanceId}] Game started with message:`, message);
    // Notify MatchManager (UI) that the game has started so it can hide menus
    try {
      const mm = (window as any).matchManager;
      if (mm && typeof mm.onGameStart === 'function') mm.onGameStart();
    } catch (e) {
      console.warn('Failed to notify matchManager of game start', e);
    }
  }
  
  // Instance tracking
  private static instanceCounter: number = 0;
  private instanceId: number;
  
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private websocket: WebSocket | null = null;
  private boundHandleGameMessage: ((event: MessageEvent) => void) | null = null;
  private gameState: GameState | null = null;
  public isPlaying: boolean = false;
  public isPaused: boolean = false;
  private keys: KeyState = {};
  // private chatSocket: WebSocket | null = null;
  private inputInterval: ReturnType<typeof setInterval> | null = null;
  
  // Game settings
  private gameSettings: GameSettings = {
    gameMode: 'coop',
    aiDifficulty: 'medium',
    ballSpeed: 'medium',
    paddleSpeed: 'medium',
    powerupsEnabled: false,
    accelerateOnHit: false,
    scoreToWin: 3
  };
  
  // Campaign mode properties
  // Start false by default; set to true when entering campaign via startCampaignGame or startBotMatchWithSettings
  private isCampaignMode: boolean = false;
  private currentCampaignLevel: number = 1;
  private maxCampaignLevel: number = 10;

  constructor() {
    // Assign unique instance ID
    GameManager.instanceCounter++;
    this.instanceId = GameManager.instanceCounter;
    
    console.log(`🎮 [GameManager] Constructor called - creating instance #${this.instanceId}`);
    console.trace();
    
    // ENFORCE SINGLETON: Only allow ONE instance
    if (GameManager.instanceCounter > 1) {
      console.error(`⚠️⚠️⚠️ MULTIPLE GameManager instances detected! This is instance #${this.instanceId}`);
      console.error('⚠️⚠️⚠️ BLOCKING DUPLICATE INSTANCE CREATION');
      throw new Error(`GameManager instance #${this.instanceId} rejected - only one instance allowed!`);
    }
    
    this.setupEventListeners();
    // Bind the message handler once so we can attach/detach it safely
    this.boundHandleGameMessage = this.handleGameMessage.bind(this);
    // Chat functionality removed
    // this.setupChat();
  }

  // Campaign progress persistence methods
  private loadPlayerCampaignLevel(): number {
    try {
      const authManager = (window as any).authManager;
      const user = authManager?.getCurrentUser();
      
      if (user && user.userId) {
        const savedLevel = localStorage.getItem(`campaign_level_${user.userId}`);
        if (savedLevel) {
          const level = parseInt(savedLevel, 10);
          if (level >= 1 && level <= this.maxCampaignLevel) {
            console.log(`🎯 [CAMPAIGN] Loaded saved level ${level} for player ${user.username}`);
            return level;
          }
        }
      }
    } catch (error) {
      console.error('Error loading campaign level:', error);
    }
    
    console.log('🎯 [CAMPAIGN] No saved level found, starting at level 1');
    return 1;
  }

  private savePlayerCampaignLevel(level: number): void {
    try {
      const authManager = (window as any).authManager;
      const user = authManager?.getCurrentUser();
      
      if (user && user.userId) {
        localStorage.setItem(`campaign_level_${user.userId}`, level.toString());
        console.log(`🎯 [CAMPAIGN] Saved level ${level} for player ${user.username}`);
      }
    } catch (error) {
      console.error('Error saving campaign level:', error);
    }
  }

  
  private setupEventListeners(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Only handle game controls if game canvas is focused or no input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
      
  console.log('[KEYDOWN] Key pressed:', e.key, 'isPlaying:', this.isPlaying, 'activeElement:', activeElement?.tagName, (activeElement as HTMLElement)?.id);
  console.log('[KEYDOWN] isInputFocused:', isInputFocused);
      
      if (!isInputFocused && this.isPlaying) {
        const key = e.key.toLowerCase();
        this.keys[key] = true;
        
        // Also handle the original key name for arrow keys
        this.keys[e.key] = true;
        
        // Debug logging
        console.log('🎯 [KEYDOWN] Key accepted:', e.key, '-> lowercase:', key, 'isPlaying:', this.isPlaying);
        console.log('🎯 [KEYDOWN] Keys object state:', this.keys);
        
        // Prevent default behavior for game control keys
        if (key === 'w' || key === 's' || key === 'arrowup' || key === 'arrowdown' || 
            e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          console.log('🎯 [KEYDOWN] Prevented default for key:', key, 'original:', e.key);
          
          // Ensure canvas has focus when game keys are pressed
          const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
          if (canvas && canvas !== document.activeElement) {
            canvas.focus();
            console.log('🎯 [KEYDOWN] Re-focused canvas on key press');
          }
        }
      } else {
        console.log('🎯 [KEYDOWN] Key ignored - isInputFocused:', isInputFocused, 'isPlaying:', this.isPlaying);
      }
    });

    document.addEventListener('keyup', (e: KeyboardEvent) => {
      // Only handle game controls if no input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
      
      if (!isInputFocused && this.isPlaying) {
        const key = e.key.toLowerCase();
        this.keys[key] = false;
        this.keys[e.key] = false;
        
        // Debug logging
        console.log('Key released:', e.key, '-> lowercase:', key);
        
        // Prevent default behavior for game control keys
        if (key === 'w' || key === 's' || key === 'arrowup' || key === 'arrowdown' ||
            e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
        }
      }
    });

    // Add click handler to game canvas for focus management
    document.addEventListener('click', (e: MouseEvent) => {
      const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      const gameContainer = document.getElementById('game-canvas-container');
      
      if (this.isPlaying && gameCanvas && gameContainer) {
        // If clicking inside the game area, ensure focus on game
        if (gameContainer.contains(e.target as Node)) {
          gameCanvas.focus();
          console.log('Canvas focused via click');
        } else {
          // Clicking outside game area - allow normal browser behavior
          gameCanvas.blur();
          console.log('Canvas blurred - clicked outside');
        }
      }
    });

    // Add direct canvas click handler
    document.addEventListener('DOMContentLoaded', () => {
      const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      if (gameCanvas) {
        gameCanvas.addEventListener('click', () => {
          if (this.isPlaying) {
            gameCanvas.focus();
            console.log('🎯 [CANVAS-CLICK] Canvas clicked and focused, activeElement:', (document.activeElement as HTMLElement)?.id);
            
            // Test key capture
            console.log('🎯 [CANVAS-CLICK] Testing immediate key capture after focus...');
            const testKeys = () => {
              console.log('🎯 [CANVAS-CLICK] Current keys state after focus:', this.keys);
            };
            setTimeout(testKeys, 100);
          }
        });
        
        // Add manual focus method for testing
        gameCanvas.addEventListener('keydown', (e: KeyboardEvent) => {
          console.log('🎯 [CANVAS-KEYDOWN] Canvas received keydown directly:', e.key);
        });
      }
    });

    // Find match button (legacy support)
    const findMatchBtn = document.getElementById('find-match-btn') as HTMLButtonElement;
    if (findMatchBtn) {
      findMatchBtn.addEventListener('click', () => {
        this.findMatch();
      });
    }
  }

  async findMatch(): Promise<void> {
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
      await this.connectToGameServer();
    } catch (error) {
      console.error('Failed to connect to game server:', error);
      this.resetFindMatch();
    }
  }

  private async connectToGameServer(): Promise<void> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;
    
    return new Promise((resolve, reject) => {
      // Close any existing websocket first to avoid duplicate handlers/sockets
      if (this.websocket) {
        try {
          this.websocket.onmessage = null as any;
          this.websocket.onopen = null as any;
          this.websocket.onclose = null as any;
          this.websocket.onerror = null as any;
          this.websocket.close();
        } catch (e) {
          console.warn('Error closing existing websocket before opening new one', e);
        }
        this.websocket = null;
      }

      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('Connected to game server');
        const authManager = (window as any).authManager;
        const user = authManager?.getCurrentUser();
        console.log('Current user:', user);
        if (!user || !user.userId) {
          console.error('No valid user logged in!');
          reject(new Error('No valid user'));
          return;
        }

        // Send authentication
        if (this.websocket) {
          this.websocket.send(JSON.stringify({
            type: 'userConnect',
            userId: user.userId,
            username: user.username
          }));
          
          // Request game match with game settings
          setTimeout(() => {
            if (this.websocket) {
              // Get game settings from the app
              const app = (window as any).app;
              const gameSettings = app?.gameSettings || {
                gameMode: 'coop',
                aiDifficulty: 'medium',
                ballSpeed: 'medium',
                paddleSpeed: 'medium',
                powerupsEnabled: false,
                accelerateOnHit: false,
                scoreToWin: 5
              };
              
              console.log('🎮 [SETTINGS] Sending game settings to backend:', gameSettings);
              
              this.websocket.send(JSON.stringify({
                type: 'joinBotGame', // fix here for bot game
                userId: user.userId,
                username: user.username,
                gameSettings: gameSettings
              }));
            }
          }, 100);
        }
        resolve();
      };

      // Attach the single bound message handler to ensure only one handler is called
      if (this.websocket && this.boundHandleGameMessage) {
        this.websocket.onmessage = this.boundHandleGameMessage;
      }

      this.websocket.onclose = () => {
        console.log('Game server connection closed');
        this.resetFindMatch();
        this.isPlaying = false;
        if (this.inputInterval) {
          clearInterval(this.inputInterval);
          this.inputInterval = null;
        }
      };

      this.websocket.onerror = (error) => {
        console.error('Game server connection error:', error);
        this.isPlaying = false; // <-- Ensure game is not marked as playing
        this.resetFindMatch();  
        reject(error);

      };
    });
  }

  private handleGameMessage(event: MessageEvent): void {
    try {
      const message: any = JSON.parse(event.data);
      console.log(`🎮 [GM#${this.instanceId}] Received message type:`, message.type, 'isPlaying:', this.isPlaying);
      
      switch (message.type) {
        case 'connectionAck': {
          console.log('Game connection acknowledged:', message.message);
          // Send joinBotGame only after connectionAck
          const authManager = (window as any).authManager;
          const user = authManager?.getCurrentUser();
          if (user && user.userId && this.websocket) {
            let gameSettings: any;
            if (this.isCampaignMode) {
              gameSettings = this.getCampaignLevelSettings();
            } else {
              const app = (window as any).app;
              gameSettings = app?.gameSettings || {
                gameMode: 'coop',
                aiDifficulty: 'easy',
                ballSpeed: 'medium',
                paddleSpeed: 'medium',
                powerupsEnabled: false,
                accelerateOnHit: false,
                scoreToWin: 5
              };
            }
            console.log('🎮 [SETTINGS] Sending joinBotGame after connectionAck:', gameSettings);
            this.websocket.send(JSON.stringify({
              type: 'joinBotGame',
              userId: user.userId,
              username: user.username,
              gameSettings: gameSettings
            }));
          }
          break;
        }
        case 'waiting':
          // console.log('Waiting for opponent:', message.message);
          break;
        case 'gameStart':
          console.log('🎮 [GAME-MSG] gameStart received, current isPlaying:', this.isPlaying);
          console.log('🎮 [GAME-MSG] Game starting:', message);
          this.startGame(message);
          break;
        case 'gameState':
          // console.log('🎮 [GAME-MSG] Game state update:', message);
          this.updateGameFromBackend(message);
          break;
        case 'gameEnd':
          console.log('🎮 [GAME-MSG] gameEnd received, current isPlaying:', this.isPlaying);
          console.log('🎮 [GAME-MSG] Game ended:', message);
          this.endGame(message);
          break;
        default:
          // console.log('🎮 [GAME-MSG] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing game message:', error);
    }
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
  }

  /**
   * Ensure the canvas is initialized only once. Uses the default config
   * so callers can be idempotent.
   */
  private ensureCanvasInitialized(): void {
    if (this.canvas) return; // already initialized
    this.initCanvas({
      canvasWidth: 800,
      canvasHeight: 600,
      paddleWidth: 10,
      paddleHeight: 100,
      ballRadius: 5,
      paddleSpeed: this.getPaddleSpeedValue()
    });
  }

  private startInputHandler(): void {
    if (this.inputInterval) {
      clearInterval(this.inputInterval);
      this.inputInterval = null;
    }
    this.inputInterval = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN && !this.isPaused) {
        // Send individual paddle movement messages based on current key state
        if (this.keys['w'] || this.keys['arrowup'] || this.keys['ArrowUp']) {
          console.log('🎮 [INPUT] Sending paddle UP command');
          this.websocket.send(JSON.stringify({
            type: 'movePaddle',
            direction: 'up'
          }));
        }
        
        if (this.keys['s'] || this.keys['arrowdown'] || this.keys['ArrowDown']) {
          console.log('🎮 [INPUT] Sending paddle DOWN command');
          this.websocket.send(JSON.stringify({
            type: 'movePaddle',
            direction: 'down'
          }));
        }
      }
    }, 16); // ~60fps
  }

  private updateGameFromBackend(backendState: any): void {
    // Don't update game state if paused or not playing
    if (this.isPaused) {
      // console.log(`🎮 [GM#${this.instanceId}] Ignoring game state - game is paused`);
      return;
    }
    
    if (!this.isPlaying) {
      console.log(`⚠️ [GM#${this.instanceId}] Ignoring game state - game is not playing`);
      return;
    }
    
    // Convert backend game state format to frontend format
    if (backendState.ball && backendState.paddles && backendState.scores) {
      const frontendState: GameState = {
        leftPaddle: { y: backendState.paddles.player1.y, speed: 0 },
        rightPaddle: { y: backendState.paddles.player2.y, speed: 0 },
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
      
      this.gameState = frontendState;
      this.render();
      
      // No longer need to update HTML UI elements - everything is rendered on canvas
    }
  }

  private updateScoreDisplay(): void {
    // This method is no longer needed since we're rendering everything on canvas
    // All UI updates are now handled in the render() method
  }

  private render(): void {
    if (!this.ctx || !this.canvas || !this.gameState || this.isPaused) return;
    
    // Clear canvas
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw center line
    this.ctx.strokeStyle = '#333';
    this.ctx.setLineDash([10, 10]);
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    
    // Draw paddles with cyberpunk style
    this.ctx.fillStyle = '#77e6ff';
    this.ctx.shadowColor = '#77e6ff';
    this.ctx.shadowBlur = 10;
    
    // Left paddle
    this.ctx.fillRect(50, this.gameState.leftPaddle.y, this.gameState.paddleWidth, this.gameState.paddleHeight);
    
    // Right paddle  
    this.ctx.fillRect(this.canvas.width - 60, this.gameState.rightPaddle.y, this.gameState.paddleWidth, this.gameState.paddleHeight);
    
    // Draw ball with trailing effect based on speed
    this.drawBallWithTrail();
    
    // Reset shadow for other elements
    this.ctx.shadowBlur = 0;
    
    // Draw all player information and UI elements on canvas
    this.drawPlayerInfo();
  }

  private drawBallWithTrail(): void {
    if (!this.ctx || !this.gameState) return;

    const ball = this.gameState.ball;
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const maxSpeed = 15; // Adjust based on your game's max ball speed
    const normalizedSpeed = Math.min(speed / maxSpeed, 1);
    
    // Calculate trail length based on speed AND campaign level
    const speedTrailLength = Math.floor(normalizedSpeed * 8) + 3;
    const campaignBonus = this.isCampaignMode ? Math.floor(this.currentCampaignLevel / 2) : 0;
    const trailLength = Math.min(speedTrailLength + campaignBonus, 15); // Cap at 15 for performance
    
    const trailSpacing = normalizedSpeed * 3 + 1;
    
    // Dynamic ball size based on speed (slightly larger when faster)
    const dynamicRadius = this.gameState.ballRadius * (1 + normalizedSpeed * 0.2);
    
    // Calculate direction opposite to ball movement for trail
    const angle = Math.atan2(ball.vy, ball.vx);
    const trailDx = -Math.cos(angle) * trailSpacing;
    const trailDy = -Math.sin(angle) * trailSpacing;
    
    // Draw trail particles
    for (let i = 1; i <= trailLength; i++) {
      const trailX = ball.x + (trailDx * i);
      const trailY = ball.y + (trailDy * i);
      
      // Calculate fade effect for trail
      const alpha = 1 - (i / trailLength);
      const trailRadius = this.gameState.ballRadius * (1 - (i / trailLength) * 0.7);
      
      // Get dynamic colors
      const ballColors = this.getBallColors(normalizedSpeed);
      
      // Set trail color with fade
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.6;
      this.ctx.fillStyle = ballColors.trail;
      this.ctx.shadowColor = ballColors.trail;
      this.ctx.shadowBlur = 8 * alpha;
      
      this.ctx.beginPath();
      this.ctx.arc(trailX, trailY, trailRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
    
    // Draw main ball with enhanced glow
    const ballColors = this.getBallColors(normalizedSpeed);
    this.ctx.save();
    this.ctx.fillStyle = ballColors.main;
    this.ctx.shadowColor = ballColors.main;
    this.ctx.shadowBlur = 15 + (normalizedSpeed * 10); // Stronger glow for faster ball
    
    // Add outer glow ring
    this.ctx.globalAlpha = 0.3;
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, dynamicRadius + 3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw main ball
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 20 + (normalizedSpeed * 15);
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, dynamicRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add inner highlight for 3D effect
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = ballColors.highlight;
    this.ctx.globalAlpha = 0.8;
    this.ctx.beginPath();
    this.ctx.arc(ball.x - 1, ball.y - 1, dynamicRadius * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private getBallColors(normalizedSpeed: number): { main: string; highlight: string; trail: string } {
    // Color transitions based on speed: slow (cyan) -> medium (white) -> fast (red)
    if (normalizedSpeed < 0.3) {
      // Slow speed - cyan
      return {
        main: '#77e6ff',
        highlight: '#a3f0ff',
        trail: '#77e6ff'
      };
    } else if (normalizedSpeed < 0.7) {
      // Medium speed - white/yellow
      return {
        main: '#ffffff',
        highlight: '#ffffcc',
        trail: '#ccffff'
      };
    } else {
      // High speed - red/orange
      return {
        main: '#e94560',
        highlight: '#ff6b8a',
        trail: '#ff9999'
      };
    }
  }

  private drawPlayerInfo(): void {
    if (!this.ctx || !this.gameState || !this.canvas) return;

    // Save current context
    this.ctx.save();
    
    // Reset any transformations and shadows
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;

    // Draw semi-transparent background for player info area
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, 80);

    // Get user information (you might want to pass this as parameters or store in gameState)
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    
    // Player names and levels (these could be passed from game server)
	const leftPlayerName = user?.username || 'Player 1';
	const rightPlayerName = 'AI Bot';

	// Try to read player level from user profile (supports number or numeric string)
	const userLevelFromProfile = (() => {
	  const maybeLevel = (user as any)?.level ?? (user as any)?.profileLevel ?? (user as any)?.profile?.level;
	  if (typeof maybeLevel === 'number') return Math.max(1, Math.floor(maybeLevel));
	  if (typeof maybeLevel === 'string' && !isNaN(parseInt(maybeLevel, 10))) return Math.max(1, parseInt(maybeLevel, 10));
	  return null;
	})();

	// Left player level comes from user profile when available, otherwise fallback
	const leftPlayerLevel = userLevelFromProfile ?? (this.isCampaignMode ? this.currentCampaignLevel : 1);

	// AI level starts with the user's level (can be adjusted later based on difficulty)
	const rightPlayerLevel = leftPlayerLevel;

	// Use getter to respect current game settings and campaign adjustments
	const targetScore = this.getScoreToWin();

    // Left player info
    this.drawPlayerInfoSection(
      50, // x position
      25, // y position  
      leftPlayerName,
      leftPlayerLevel,
      this.gameState.leftScore,
      '👤', // icon
      'left'
    );

    // Right player info
    this.drawPlayerInfoSection(
      this.canvas.width - 50, // x position
      25, // y position
      rightPlayerName,
      rightPlayerLevel,
      this.gameState.rightScore,
      '🤖', // icon
      'right'
    );

    // Center info - "First to X" or campaign level
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    
    if (this.isCampaignMode) {
      this.ctx.fillText(`Campaign Level ${this.currentCampaignLevel} - First to ${targetScore}`, this.canvas.width / 2, 30);
    } else {
      this.ctx.fillText(`First to ${targetScore}`, this.canvas.width / 2, 30);
    }

    // Draw large scores in center-top area
    this.ctx.font = 'bold 48px Courier New, monospace';
    this.ctx.fillStyle = '#77e6ff';
    this.ctx.shadowColor = '#77e6ff';
    this.ctx.shadowBlur = 10;
    
    // Left score
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.gameState.leftScore.toString(), this.canvas.width / 4, 130);
    
    // Right score
    this.ctx.fillText(this.gameState.rightScore.toString(), (this.canvas.width * 3) / 4, 130);

    // Restore context
    this.ctx.restore();
  }

  private drawPlayerInfoSection(x: number, y: number, name: string, level: number, score: number, icon: string, alignment: 'left' | 'right'): void {
    if (!this.ctx) return;

    this.ctx.save();
    
    // Draw player icon
    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = '#77e6ff';
    
    if (alignment === 'left') {
      this.ctx.textAlign = 'left';
      this.ctx.fillText(icon, x, y);
      
      // Draw name
      this.ctx.font = 'bold 14px Arial';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(name, x + 30, y - 2);
      
      // Draw level
      this.ctx.font = '12px Arial';
      this.ctx.fillStyle = '#aaaaaa';
      this.ctx.fillText(`Level ${level}`, x + 30, y + 15);
      
    } else {
      this.ctx.textAlign = 'right';
      this.ctx.fillText(icon, x, y);
      
      // Draw name
      this.ctx.font = 'bold 14px Arial';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(name, x - 30, y - 2);
      
      // Draw level
      this.ctx.font = '12px Arial';
      this.ctx.fillStyle = '#aaaaaa';
      this.ctx.fillText(`Level ${level}`, x - 30, y + 15);
    }

    this.ctx.restore();
  }

  private endGame(result: any): void {
    console.log('🎮 [END] Game ended:', result);
    
    // GUARD: Prevent handling endGame multiple times
    if (!this.isPlaying) {
      console.warn('⚠️ [END] Game already ended, ignoring duplicate endGame call');
      return;
    }
    
    this.isPlaying = false;
    
    if (this.inputInterval) {
      clearInterval(this.inputInterval);
      this.inputInterval = null;
    }
    
    // Handle campaign mode progression
    if (this.isCampaignMode) {
      console.log('🎯 [CAMPAIGN] Handling campaign game end');
      this.handleCampaignGameEnd(result);
      return; // Campaign mode handles its own UI and navigation
    }
    
    // Regular game end handling
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
    
    // Reset UI
    this.resetFindMatch();
    
    // Close websocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    // Notify MatchManager (UI) that the game ended
    try {
      const mm = (window as any).matchManager;
      if (mm && typeof mm.onGameEnd === 'function') mm.onGameEnd();
    } catch (e) {
      console.warn('Failed to notify matchManager of game end', e);
    }

    // Navigate back to play config
    const app = (window as any).app;
    if (app && typeof app.showScreen === 'function') {
      app.showScreen('play-config');
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

  // private authenticateChatSocket(): void {
  //   const authManager = (window as any).authManager;
  //   const user = authManager?.getCurrentUser();
  //   if (!user) return;
    
  //   if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
  //     this.chatSocket.send(JSON.stringify({
  //       type: 'userConnect',
  //       userId: user.userId,
  //       username: user.username
  //     }));
  //   }
  

  public onUserAuthenticated(user: User): void {
    console.log('GameManager: User authenticated:', user);
      
    // If game websocket is connected, authenticate it too
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      console.log('Authenticating existing game socket');
      this.websocket.send(JSON.stringify({
        type: 'userConnect',
        userId: user.userId,
        username: user.username
      }));
    }
  }

  public async loadGameHistory(userId: number): Promise<void> {
    // Implement game history loading
    console.log('Loading game history for user:', userId);
  }

  public async loadGameStats(userId: number): Promise<void> {
    // Implement game stats loading
    console.log('Loading game stats for user:', userId);
  }

  // Debug method to test keyboard input
  public testKeyboard(): void {
    console.log('🧪 [TEST] Testing keyboard input...');
    console.log('🧪 [TEST] isPlaying:', this.isPlaying);
    console.log('🧪 [TEST] keys object:', this.keys);
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

  // Start a bot match (single player game against AI)
  public async startBotMatch(): Promise<void> {
    console.log('🎮 [GameManager.startBotMatch] === CALLED === Stack trace:');
    console.trace();
    
    // GUARD: Prevent double starts
    if (this.isPlaying) {
      console.warn('⚠️ GameManager: Game already in progress, ignoring duplicate startBotMatch call');
      console.warn('⚠️ Current isPlaying state:', this.isPlaying);
      return;
    }

    console.log('✅ [GameManager.startBotMatch] Guard passed - proceeding with bot match');
    console.log('GameManager: Starting bot match');
  // error to stopGame() here
    // Check if this is CO-OP mode (campaign mode)
    if (this.gameSettings.gameMode === 'coop') {
      console.log('🎯 [CAMPAIGN] CO-OP mode detected, starting campaign game');
      await this.startCampaignGame();
    } else {
      this.startBotMatchWithSettings(false);
    }
    
    console.log('🏁 [GameManager.startBotMatch] === COMPLETED ===');
  }

  // Start campaign mode (progressive difficulty against AI)
  public async startCampaignGame(): Promise<void> {
    console.log('🎯 [CAMPAIGN] Starting campaign mode');
    this.isCampaignMode = true;
    
    // Load player's current campaign level instead of always starting at 1
    this.currentCampaignLevel = this.loadPlayerCampaignLevel();
    
    console.log(`🎯 [CAMPAIGN] Starting campaign at player's current level ${this.currentCampaignLevel}`);
    // Ensure canvas exists once when campaign starts
    this.ensureCanvasInitialized();
    this.updateCampaignLevelSettings();
    this.updateCampaignUI();
    this.startCampaignMatch();
  }

  private async startBotMatchWithSettings(isCampaign: boolean): Promise<void> {
    // Check if user is logged in
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

    // Initialize campaign mode if requested
    if (isCampaign) {
      this.isCampaignMode = true;
      this.currentCampaignLevel = 1;
      this.updateCampaignLevelSettings();
    }

    // Update UI to show game starting
    const waitingMsg = document.getElementById('waiting-message');
    const gameArea = document.getElementById('game-area');
    
  // Ensure canvas is initialized for non-campaign bot matches as well
  this.ensureCanvasInitialized();

    if (waitingMsg) waitingMsg.classList.remove('hidden');
    
    try {
      // Connect to game server for bot match
      await this.connectToBotGameServer();
    } catch (error) {
      console.error('Failed to start bot match:', error);
      if (waitingMsg) waitingMsg.classList.add('hidden');
      alert('Failed to start bot match. Please try again.<Frontend>');
      this.isPlaying = false; //modified
      this.stopGame(); // <-- Ensures full cleanup
      return; // no further action
    }
  }

  private async connectToBotGameServer(): Promise<void> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;
    
    return new Promise((resolve, reject) => {
      // Close any existing websocket first to avoid duplicate handlers/sockets
      if (this.websocket) {
        try {
          this.websocket.onmessage = null as any;
          this.websocket.onopen = null as any;
          this.websocket.onclose = null as any;
          this.websocket.onerror = null as any;
          this.websocket.close();
        } catch (e) {
          console.warn('Error closing existing websocket before opening new one', e);
        }
        this.websocket = null;
      }

      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('Connected to game server for bot match');
        const authManager = (window as any).authManager;
        const user = authManager?.getCurrentUser();
        
        if (!user || !user.userId) {
          console.error('No valid user logged in!');
          reject(new Error('No valid user'));
          return;
        }

        // Send authentication only
        if (this.websocket) {
          this.websocket.send(JSON.stringify({
            type: 'userConnect',
            userId: user.userId,
            username: user.username
          }));
        }
        resolve();
      };

      // Attach the single bound message handler to ensure only one handler is called
      if (this.websocket && this.boundHandleGameMessage) {
        this.websocket.onmessage = this.boundHandleGameMessage;
      }

      this.websocket.onclose = () => {
        console.log('Bot game server connection closed');
        this.resetFindMatch();
        this.isPlaying = false;
        if (this.inputInterval) {
          clearInterval(this.inputInterval);
          this.inputInterval = null;
        }
      };

      this.websocket.onerror = (error) => {
        console.error('Bot game server connection error:', error);
        this.isPlaying = false;
        this.resetFindMatch();
        reject(error);
      };
    });
  }

  // Pause/Resume functionality
  public pauseGame(): void {
    if (!this.isPlaying) return;
    
    this.isPaused = !this.isPaused;
    console.log(this.isPaused ? 'Game paused' : 'Game resumed');
    
    // Send pause message to server if connected
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'pause',
        paused: this.isPaused
      }));
    }
    
    // Update pause button text
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

  // Stop game functionality
  public stopGame(): void {
    console.log(`🛑 [GM#${this.instanceId}] stopGame called, isPlaying:`, this.isPlaying, 'isCampaignMode:', this.isCampaignMode);
    
    // Set flags first to prevent any new operations
    this.isPlaying = false;
    this.isPaused = false;
    
    // Close websocket connection
    if (this.websocket) {
      console.log(`🛑 [GM#${this.instanceId}] Closing websocket`);
      try {
        this.websocket.onmessage = null as any;
        this.websocket.onopen = null as any;
        this.websocket.onclose = null as any;
        this.websocket.onerror = null as any;
        this.websocket.close();
      } catch (e) {
        console.warn('Error closing websocket in stopGame', e);
      }
      this.websocket = null;
    }
    
    // Clear input interval
    if (this.inputInterval) {
      console.log(`🛑 [GM#${this.instanceId}] Clearing input interval`);
      clearInterval(this.inputInterval);
      this.inputInterval = null;
    }
    
    // Reset game state
    this.gameState = null;
    
    // If in campaign mode, exit campaign
    if (this.isCampaignMode) {
      console.log(`🛑 [GM#${this.instanceId}] Exiting campaign mode`);
      this.isCampaignMode = false;
      this.currentCampaignLevel = 1;
    }
    
    console.log(`🛑 [GM#${this.instanceId}] Game stopped - attempting navigation to play-config`);
    
    // Navigate back to play config using router
    const app = (window as any).app;
    console.log(`🛑 [GM#${this.instanceId}] App exists:`, !!app, 'Router exists:', !!(app && app.router));
    
    if (app && app.router && typeof app.router.navigate === 'function') {
      console.log(`🛑 [GM#${this.instanceId}] Calling router.navigate('play-config')`);
      app.router.navigate('play-config');
      console.log(`🛑 [GM#${this.instanceId}] Navigation call completed`);
    } else {
      console.error(`🛑 [GM#${this.instanceId}] ERROR: Cannot navigate - app or router not available!`);
    }
  }

  // Game Settings Methods
  public setGameSettings(settings: Partial<GameSettings>): void {
    this.gameSettings = { ...this.gameSettings, ...settings };
    console.log('🎮 [GAME-SETTINGS] Updated game settings:', this.gameSettings);
  }

  public getGameSettings(): GameSettings {
    return { ...this.gameSettings };
  }

  public getBallSpeedValue(): number {
    switch (this.gameSettings.ballSpeed) {
      case 'slow': return 3;
      case 'medium': return 5;
      case 'fast': return 7;
      default: return 5;
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

  private getCampaignLevelSettings(): GameSettings {
    const level = this.currentCampaignLevel;
    
    console.log(`🎯 [CAMPAIGN] Getting settings for level ${level} (host player level)`);
    
    // Calculate settings based on current level
    let ballSpeed: 'slow' | 'medium' | 'fast';
    if (level <= 3) ballSpeed = 'slow';
    else if (level <= 6) ballSpeed = 'medium';
    else ballSpeed = 'fast';
    
    // Paddle speed increases with level
    let paddleSpeed: 'slow' | 'medium' | 'fast';
    if (level <= 2) paddleSpeed = 'slow';
    else if (level <= 5) paddleSpeed = 'medium';
    else paddleSpeed = 'fast';
    
    // AI difficulty increases with level - directly tied to host player level
    let aiDifficulty: 'easy' | 'medium' | 'hard';
    if (level <= 3) aiDifficulty = 'easy';
    else if (level <= 7) aiDifficulty = 'medium';
    else aiDifficulty = 'hard';
    
    // Score to win increases slightly with level
    const scoreToWin = Math.min(3 + Math.floor((level - 1) / 3), 5);
    
    // Enable accelerate on hit from level 4
    const accelerateOnHit = level >= 4;
    
    const settings: GameSettings = {
      gameMode: 'coop' as const,
      aiDifficulty,
      ballSpeed,
      paddleSpeed,
      powerupsEnabled: false, // Keep powerups disabled for campaign
      accelerateOnHit,
      scoreToWin
    };
    
    console.log(`🎯 [CAMPAIGN] Level ${level} AI settings:`, {
      aiDifficulty,
      ballSpeed,
      paddleSpeed,
      scoreToWin,
      accelerateOnHit
    });
    
    return settings;
  }

  public getCurrentCampaignLevel(): number {
    return this.currentCampaignLevel;
  }

  public isInCampaignMode(): boolean {
    return this.isCampaignMode;
  }

  private updateCampaignLevelSettings(): void {
    // Calculate settings based on current level
    const level = this.currentCampaignLevel;
    
    // Ball speed increases with level (starts slow, gets faster)
    let ballSpeed: 'slow' | 'medium' | 'fast';
    if (level <= 3) ballSpeed = 'slow';
    else if (level <= 6) ballSpeed = 'medium';
    else ballSpeed = 'fast';
    
    // Paddle speed increases with level
    let paddleSpeed: 'slow' | 'medium' | 'fast';
    if (level <= 2) paddleSpeed = 'slow';
    else if (level <= 5) paddleSpeed = 'medium';
    else paddleSpeed = 'fast';
    
    // AI difficulty increases with level
    let aiDifficulty: 'easy' | 'medium' | 'hard';
    if (level <= 3) aiDifficulty = 'easy';
    else if (level <= 7) aiDifficulty = 'medium';
    else aiDifficulty = 'hard';
    
    // Score to win increases slightly with level
    const scoreToWin = Math.min(3 + Math.floor((level - 1) / 3), 5);
    // Enable accelerate on hit from level 4
    const accelerateOnHit = level >= 4;
    
    // Update game settings
    const newSettings: Partial<GameSettings> = {
      gameMode: 'coop',
      aiDifficulty,
      ballSpeed,
      paddleSpeed,
      powerupsEnabled: false, // Keep powerups disabled for campaign
      accelerateOnHit,
      scoreToWin
    };
    
    this.setGameSettings(newSettings);
    
    // Update UI to show current level
    this.updateCampaignUI();
    
    console.log(`🎯 [CAMPAIGN] Level ${level} settings updated:`, newSettings);
  }

  private updateCampaignUI(): void {
    // Update level display
    const levelDisplay = document.getElementById('campaign-level-display');
    const levelNumber = document.getElementById('current-level-number');
    const progressBar = document.getElementById('campaign-progress-fill');
    
    if (levelDisplay && levelNumber) {
      levelNumber.textContent = this.currentCampaignLevel.toString();
      // Show the level display during campaign mode
      levelDisplay.style.display = this.isCampaignMode ? 'block' : 'none';
    }
    
    // Update level progress bar
    if (progressBar) {
      const progress = (this.currentCampaignLevel / this.maxCampaignLevel) * 100;
      progressBar.style.width = `${progress}%`;
    }
  }

  public progressToNextLevel(): void {
    if (!this.isCampaignMode) return;

    // Ensure only one match is playing at a time
    if (this.isPlaying) {
      // Record result if needed (could be extended to save stats, etc.)
      console.log('🎯 [CAMPAIGN] Closing previous match before progressing to next level');
      this.stopGame();
    }

    const oldLevel = this.currentCampaignLevel;
    if (this.currentCampaignLevel < this.maxCampaignLevel) {
      this.currentCampaignLevel++;
      console.log(`🎯 [CAMPAIGN] Level progressed from ${oldLevel} to ${this.currentCampaignLevel}`);

      // Save the new level to localStorage
      this.savePlayerCampaignLevel(this.currentCampaignLevel);

      // Try to persist the new level to the backend (user stats/profile)
      try {
        const authManager = (window as any).authManager;
        const user = authManager?.getCurrentUser();
        const headers = authManager?.getAuthHeaders ? authManager.getAuthHeaders() : {};
        if (user && user.userId) {
          const url = `/api/game/update-stats/${user.userId}`;
          const body = { level: this.currentCampaignLevel };
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body)
          }).then(res => {
            if (!res.ok) console.warn('Failed to update campaign level on server');
            else console.log('🎯 [CAMPAIGN] Synced new level to server');
          }).catch(err => console.warn('Error syncing campaign level:', err));
        }
      } catch (err) {
        console.warn('Could not sync campaign level to server:', err);
      }

      // Show level up message with confirmation button
      this.showLevelUpMessageWithConfirm();

      // Update settings for new level
      this.updateCampaignLevelSettings();
      // Do NOT automatically restart the game here!
      // Only start next match after confirmation
      // this.restartCampaignLevel(); <-- removed to ensure only one match at a time
    } else {
      // Campaign completed!
      this.showCampaignCompleteMessage();
    }
  }

  // --- Add new method to show confirmation button for next level ---

  private showLevelUpMessageWithConfirm(): void {
    const message = document.createElement('div');
    message.id = 'level-up-message';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: #ffffff;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      z-index: 10000;
      border: 2px solid #77e6ff;
      box-shadow: 0 0 30px rgba(119, 230, 255, 0.5);
    `;
    message.innerHTML = `
      <div style="color: #77e6ff; margin-bottom: 10px;">🎯 LEVEL UP!</div>
      <div>Level ${this.currentCampaignLevel}</div>
      <div style="font-size: 16px; margin-top: 10px; color: #cccccc;">
        Get ready for the next challenge!
      </div>
      <button id="next-level-confirm-btn" style="
        margin-top: 20px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #77e6ff, #e94560);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 18px;
        cursor: pointer;
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(119, 230, 255, 0.3);
      ">Start Next Level</button>
    `;

    document.body.appendChild(message);

    // Add click handler for confirmation button
    const confirmBtn = document.getElementById('next-level-confirm-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (message.parentNode) {
          message.parentNode.removeChild(message);
        }
        this.restartCampaignLevel();
      });
    }
  }

  private showCampaignCompleteMessage(): void {
    const message = document.createElement('div');
    message.id = 'campaign-complete-message';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      color: #ffffff;
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      font-size: 28px;
      font-weight: bold;
      z-index: 10000;
      border: 3px solid #77e6ff;
      box-shadow: 0 0 50px rgba(119, 230, 255, 0.8);
      max-width: 500px;
    `;
    message.innerHTML = `
      <div style="color: #77e6ff; margin-bottom: 15px;">🏆 CAMPAIGN COMPLETE!</div>
      <div style="font-size: 18px; color: #cccccc; margin-bottom: 20px;">
        Congratulations! You have mastered all levels!
      </div>
      <div style="font-size: 16px;">
        🏅 Pong Champion 🏅
      </div>
    `;
    
    document.body.appendChild(message);
    
    // Return to main menu after 5 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
      this.endCampaign();
    }, 5000);
  }

  private restartCampaignLevel(): void {
    console.log('🎯 [CAMPAIGN] Restarting level with new settings');
    
    // GUARD: Prevent restart if already playing
    if (this.isPlaying) {
      console.warn('⚠️ [CAMPAIGN] Game already playing, cannot restart yet');
      return;
    }
    
    // Stop current game WITHOUT navigating away (campaign mode stays on game screen)
    this.isPlaying = false;
    this.isPaused = false;
    
    // Close websocket connection
    if (this.websocket) {
      console.log('🎯 [CAMPAIGN] Closing existing websocket before restart');
      this.websocket.close();
      this.websocket = null;
    }
    
    // Clear input interval
    if (this.inputInterval) {
      clearInterval(this.inputInterval);
      this.inputInterval = null;
    }
    
    // Reset game state
    this.gameState = null;
    
    // Start new match after a short delay to ensure websocket is fully closed
    setTimeout(() => {
      console.log('🎯 [CAMPAIGN] Starting new campaign match after cleanup');
      this.startCampaignMatch();
    }, 100);
  }

  private startCampaignMatch(): void {
    console.log('🎯 [CAMPAIGN] startCampaignMatch called, checking if safe to start...');
    
    // GUARD: Don't start if already playing
    if (this.isPlaying) {
      console.warn('⚠️ [CAMPAIGN] Match already playing, ignoring startCampaignMatch call');
      return;
    }
    
    // GUARD: Don't start if websocket already exists
    if (this.websocket && this.websocket.readyState !== WebSocket.CLOSED) {
      console.warn('⚠️ [CAMPAIGN] Websocket already open, ignoring startCampaignMatch call');
      return;
    }
    
    console.log('🎯 [CAMPAIGN] Guards passed - Starting campaign match at level', this.currentCampaignLevel);

    // Update campaign UI to show current level
    this.updateCampaignUI();
    
    // Check if user is logged in
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    if (!user || !user.userId) {
      alert('You must be logged in to play. Redirecting to login page.');
      const gameScreen = document.getElementById('game-screen');
      const loginScreen = document.getElementById('login-screen');
      if (gameScreen && loginScreen) {
        gameScreen.classList.remove('active');
        loginScreen.classList.add('active');
      }
      return;
    }

    // Update UI to show game starting
    const waitingMsg = document.getElementById('waiting-message');
    const gameArea = document.getElementById('game-area');
    
    if (waitingMsg) waitingMsg.classList.remove('hidden');
    
    // Connect to game server for campaign match
    this.connectToCampaignGameServer().catch((error) => {
      console.error('Failed to start campaign match:', error);
      if (waitingMsg) waitingMsg.classList.add('hidden');
      alert('Failed to start campaign match. Please try again.');
      // Reset state on error
      this.isPlaying = false;
    });
  }

  private async connectToCampaignGameServer(): Promise<void> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;
    
    return new Promise((resolve, reject) => {
      // Close any existing websocket first to avoid duplicate handlers/sockets
      if (this.websocket) {
        try {
          this.websocket.onmessage = null as any;
          this.websocket.onopen = null as any;
          this.websocket.onclose = null as any;
          this.websocket.onerror = null as any;
          this.websocket.close();
        } catch (e) {
          console.warn('Error closing existing websocket before opening new one', e);
        }
        this.websocket = null;
      }

      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('Connected to game server for campaign match');
        const authManager = (window as any).authManager;
        const user = authManager?.getCurrentUser();
        
        // In CO-OP campaign mode, always use the latest campaign level from localStorage
        if (!user || !user.userId) {
          console.error('No valid user logged in!');
          reject(new Error('No valid user'));
          return;
        }
        if (this.isCampaignMode) {
          // Always reload the latest campaign level before starting the match
          this.currentCampaignLevel = this.loadPlayerCampaignLevel();
          this.updateCampaignLevelSettings();
          this.updateCampaignUI();
          console.log(`🎯 [CAMPAIGN] Synced campaign level from storage: ${this.currentCampaignLevel}`);
        }

        // Send authentication only - joinBotGame will be sent after connectionAck
        if (this.websocket) {
          this.websocket.send(JSON.stringify({
            type: 'userConnect',
            userId: user.userId,
            username: user.username
          }));
          
          // NOTE: Don't send joinBotGame here! It's already sent in the connectionAck handler
          // This was causing duplicate games (2 gameStart messages)
          console.log('🎯 [CAMPAIGN] Waiting for connectionAck before sending joinBotGame');
        }
        resolve();
      };

      // Attach the single bound message handler to ensure only one handler is called
      if (this.websocket && this.boundHandleGameMessage) {
        this.websocket.onmessage = this.boundHandleGameMessage;
      }

      this.websocket.onclose = () => {
        console.log('Campaign game server connection closed');
        this.resetFindMatch();
        this.isPlaying = false;
        if (this.inputInterval) {
          clearInterval(this.inputInterval);
          this.inputInterval = null;
        }
      };

      this.websocket.onerror = (error) => {
        console.error('Campaign game server connection error:', error);
        this.isPlaying = false; // <-- Ensure game is not marked as playing
        this.resetFindMatch();  
        reject(error);
      };
    });
  }

  public endCampaign(): void {
    this.isCampaignMode = false;
    this.currentCampaignLevel = 1;
    console.log('🎯 [CAMPAIGN] Campaign ended');
    
    // Update UI to hide campaign elements
    this.updateCampaignUI();
    
    // Navigate back to play config
    const app = (window as any).app;
    if (app && typeof app.showScreen === 'function') {
      app.showScreen('play-config');
    }
  }

  // Override game end handling for campaign mode
  private handleCampaignGameEnd(gameData: any): void {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    
    if (!user) return;
    
    // Check if player won (accept either `winner` or `winnerId` from backend)
    const winnerId = (typeof gameData.winner === 'number') ? gameData.winner : gameData.winnerId;
    const playerWon = winnerId === user.userId;
    
    if (playerWon && this.isCampaignMode) {
      console.log('🎯 [CAMPAIGN] Player won! Progressing to next level');
      this.progressToNextLevel();
    } else if (!playerWon && this.isCampaignMode) {
      console.log('🎯 [CAMPAIGN] Player lost. Restarting current level');
      // Show retry message
      this.showRetryMessage();
      
      // Restart level after delay
      setTimeout(() => {
        this.restartCampaignLevel();
      }, 3000);
    }
  }

  private showRetryMessage(): void {
    const message = document.createElement('div');
    message.id = 'retry-message';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(233, 69, 96, 0.9);
      color: #ffffff;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      z-index: 10000;
      border: 2px solid #ff6b8a;
      box-shadow: 0 0 30px rgba(233, 69, 96, 0.5);
    `;
    message.innerHTML = `
      <div style="color: #ff6b8a; margin-bottom: 10px;">💪 TRY AGAIN!</div>
      <div>Level ${this.currentCampaignLevel}</div>
      <div style="font-size: 16px; margin-top: 10px; color: #ffcccc;">
        You can do this! Practice makes perfect!
      </div>
    `;
    
    document.body.appendChild(message);
    
    // Remove message after 3 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }
}

// Do not create a global GameManager here. The app entrypoint (`frontend/src/main.ts`)
// is responsible for creating and assigning the singleton instance to window.gameManager.
// Creating it here would produce duplicate managers during module import/HMR and
// can cause multiple websockets/render loops to run.