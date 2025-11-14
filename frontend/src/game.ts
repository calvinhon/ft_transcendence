// Stub file - game module
// frontend/src/game.ts - TypeScript version of game manager

interface User {
  userId: number;
  username: string;
  email?: string;
}

interface PaddlePlayer {
  y: number;
  speed: number;
  username?: string;
  userId?: number;
  color?: string;
}

interface GameState {
  leftPaddle: { y: number; speed: number };
  rightPaddle: { y: number; speed: number };
  leftPaddles?: Array<PaddlePlayer>; // Multiple paddles for team 1 with player info
  rightPaddles?: Array<PaddlePlayer>; // Multiple paddles for team 2 with player info
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
    
    // Apply game settings from the server if provided
    if (message.gameSettings) {
      console.log(`🎮 [GM#${this.instanceId}] Applying gameSettings from server:`, message.gameSettings);
      this.gameSettings = { ...this.gameSettings, ...message.gameSettings };
    }
    
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
    
    // Start a periodic check to ensure keys are being tracked
    this.startKeyMonitor();

    console.log(`🎮 [GM#${this.instanceId}] Game started with message:`, message);
    // Notify MatchManager (UI) that the game has started so it can hide menus
    try {
      const mm = (window as any).matchManager;
      if (mm && typeof mm.onGameStart === 'function') mm.onGameStart();
    } catch (e) {
      console.warn('Failed to notify matchManager of game start', e);
    }
  }
  
  // Monitor key state to detect if keys get "stuck"
  private keyMonitorInterval: ReturnType<typeof setInterval> | null = null;
  private lastKeyPressTime: { [key: string]: number } = {};
  
  private startKeyMonitor(): void {
    // Clear existing monitor
    if (this.keyMonitorInterval) {
      clearInterval(this.keyMonitorInterval);
    }
    
    // Check every 100ms for stuck keys or lost input
    this.keyMonitorInterval = setInterval(() => {
      if (this.isPlaying && !this.isPaused) {
        const now = Date.now();
        
        // Check for keys that have been held for suspiciously long (>10 seconds)
        // These might be "stuck" from a missed keyup event
        for (const key in this.keys) {
          if (this.keys[key] === true) {
            const lastPress = this.lastKeyPressTime[key] || now;
            if (now - lastPress > 10000) {
              console.warn('Detected stuck key:', key, '- auto-releasing');
              this.keys[key] = false;
              delete this.lastKeyPressTime[key];
            }
          }
        }
      }
    }, 100);
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
  private arcadeInputWarningShown: boolean = false; // Track if arcade input warnings have been shown
  
  // Countdown state
  private countdownValue: number | null = null;
  
  // Store player info for arcade mode
  private team1Players: any[] = [];
  private team2Players: any[] = [];
  
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
  private maxCampaignLevel: number = 21; //Maximum level one can reach

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
        // Sync from database asynchronously (don't block)
        this.syncCampaignLevelFromDatabase().catch(err => {
          console.warn('Background sync failed:', err);
        });
        
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
  
  // Sync campaign level from database to localStorage
  private async syncCampaignLevelFromDatabase(): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const user = authManager?.getCurrentUser();
      const headers = authManager?.getAuthHeaders ? authManager.getAuthHeaders() : {};
      
      if (user && user.userId) {
        const response = await fetch(`/api/user/profile/${user.userId}`, { headers });
        if (response.ok) {
          const profile = await response.json();
          if (profile.campaign_level && profile.campaign_level > 1) {
            // Update localStorage with database value if it's higher
            const localLevel = localStorage.getItem(`campaign_level_${user.userId}`);
            const localLevelNum = localLevel ? parseInt(localLevel, 10) : 1;
            
            if (profile.campaign_level > localLevelNum) {
              localStorage.setItem(`campaign_level_${user.userId}`, profile.campaign_level.toString());
              console.log(`🎯 [CAMPAIGN] Synced level ${profile.campaign_level} from database`);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Could not sync campaign level from database:', error);
    }
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
    // Use window-level key listeners with capture phase to ensure we always get events
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Only handle game controls if game canvas is focused or no input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
      
      if (!isInputFocused && this.isPlaying) {
        const key = e.key.toLowerCase();
        this.keys[key] = true;
        
        // Track when this key was pressed (for stuck key detection)
        this.lastKeyPressTime[key] = Date.now();
        
        // Also handle the original key name for arrow keys
        this.keys[e.key] = true;
        this.lastKeyPressTime[e.key] = Date.now();
        
        // Define all game control keys
        const gameControlKeys = [
          'w', 's', 'q', 'a', 'e', 'd',  // Team 1 keys
          'u', 'j', 'i', 'k', 'o', 'l',  // Team 2 keys
          'arrowup', 'arrowdown'          // Alternative keys
        ];
        
        // Prevent default behavior for game control keys
        if (gameControlKeys.includes(key) || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
    }, true); // Use capture phase to get events before they're handled elsewhere

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      // Only handle game controls if no input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
      
      if (!isInputFocused && this.isPlaying) {
        const key = e.key.toLowerCase();
        this.keys[key] = false;
        this.keys[e.key] = false;
        
        // Clear tracking for released keys
        delete this.lastKeyPressTime[key];
        delete this.lastKeyPressTime[e.key];
        
        // Define all game control keys
        const gameControlKeys = [
          'w', 's', 'q', 'a', 'e', 'd',  // Team 1 keys
          'u', 'j', 'i', 'k', 'o', 'l',  // Team 2 keys
          'arrowup', 'arrowdown'          // Alternative keys
        ];
        
        // Prevent default behavior for game control keys
        if (gameControlKeys.includes(key) || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
    }, true); // Use capture phase

    // Add visibility change listener to clear keys when tab loses focus
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isPlaying) {
        // Clear all keys when tab is hidden
        for (const key in this.keys) {
          this.keys[key] = false;
        }
        this.lastKeyPressTime = {};
      }
    });
    
    // Add blur listener to window to catch when window loses focus
    window.addEventListener('blur', () => {
      if (this.isPlaying) {
        for (const key in this.keys) {
          this.keys[key] = false;
        }
        this.lastKeyPressTime = {};
      }
    });

    // Setup canvas click handler - check if DOM is already loaded
    const setupCanvasHandlers = () => {
      const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      if (gameCanvas) {
        gameCanvas.addEventListener('click', () => {
          if (this.isPlaying) {
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
              // Use GameManager's own settings (already synced from app)
              gameSettings = this.gameSettings;
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
        
        // Handle different game modes
        if (this.gameSettings.gameMode === 'arcade' || this.gameSettings.gameMode === 'tournament') {
          // Arcade mode and Tournament mode: Team vs Team with multiple players per side
          this.handleArcadeInputs();
        } else {
          // Co-op/Campaign mode: Single player controls (original logic)
          this.handleSinglePlayerInputs();
        }
      }
    }, 16); // ~60fps
  }

  private handleSinglePlayerInputs(): void {
    // Original co-op/campaign input handling
    const upPressed = this.keys['w'] || this.keys['arrowup'] || this.keys['ArrowUp'];
    const downPressed = this.keys['s'] || this.keys['arrowdown'] || this.keys['ArrowDown'];
    
    // If both keys are pressed, use the most recently pressed one
    if (upPressed && downPressed) {
      const upTime = Math.max(
        this.lastKeyPressTime['w'] || 0,
        this.lastKeyPressTime['arrowup'] || 0,
        this.lastKeyPressTime['ArrowUp'] || 0
      );
      const downTime = Math.max(
        this.lastKeyPressTime['s'] || 0,
        this.lastKeyPressTime['arrowdown'] || 0,
        this.lastKeyPressTime['ArrowDown'] || 0
      );
      
      if (downTime > upTime) {
        this.websocket?.send(JSON.stringify({
          type: 'movePaddle',
          direction: 'down'
        }));
      } else {
        this.websocket?.send(JSON.stringify({
          type: 'movePaddle',
          direction: 'up'
        }));
      }
    } else if (upPressed) {
      this.websocket?.send(JSON.stringify({
        type: 'movePaddle',
        direction: 'up'
      }));
    } else if (downPressed) {
      this.websocket?.send(JSON.stringify({
        type: 'movePaddle',
        direction: 'down'
      }));
    }
  }

  private handleArcadeInputs(): void {
    // Arcade mode: Multiple players with team-based controls
    // Team 1 players: Q/A, W/S, E/D (+ Arrow keys as alternative)
    // Team 2 players: U/J, I/K, O/L
    
    const app = (window as any).app;
    
    // Debug logging (only log once)
    if (!app) {
      if (!this.arcadeInputWarningShown) {
        console.log('🎮 [ARCADE-INPUT] ❌ app not found');
        this.arcadeInputWarningShown = true;
      }
      return;
    }
    if (!app.localPlayers) {
      if (!this.arcadeInputWarningShown) {
        console.log('🎮 [ARCADE-INPUT] ❌ app.localPlayers not found');
        this.arcadeInputWarningShown = true;
      }
      return;
    }
    if (!app.selectedPlayerIds) {
      if (!this.arcadeInputWarningShown) {
        console.log('🎮 [ARCADE-INPUT] ❌ app.selectedPlayerIds not found');
        this.arcadeInputWarningShown = true;
      }
      return;
    }
    
    // Build team player lists including host if selected
    let team1Players: any[] = [];
    let team2Players: any[] = [];
    
    // Check if this is a tournament match
    const isTournament = app.gameSettings?.gameMode === 'tournament' && app.currentTournamentMatch;
    
    if (isTournament) {
      // Tournament mode: Both players control locally
      const match = app.currentTournamentMatch;
      
      console.log('🏆 [TOURNAMENT-INPUT] Tournament match mode detected');
      console.log('🏆 [TOURNAMENT-INPUT] Player 1 (left/Team1):', match.player1Name, '- Controls: W/S or Arrow keys');
      console.log('🏆 [TOURNAMENT-INPUT] Player 2 (right/Team2):', match.player2Name, '- Controls: U/J');
      
      // Player 1 on Team 1 (left side)
      team1Players.push({
        userId: match.player1Id,
        username: match.player1Name,
        team: 1,
        paddleIndex: 0
      });
      
      // Player 2 on Team 2 (right side)  
      team2Players.push({
        userId: match.player2Id,
        username: match.player2Name,
        team: 2,
        paddleIndex: 0
      });
    } else {
      // Regular arcade mode: Use selected players
      // Check if host is selected
      const authManager = (window as any).authManager;
      const hostUser = authManager?.getCurrentUser();
      const hostCard = document.getElementById('host-player-card');
      const isHostSelected = hostCard && hostCard.classList.contains('active') && 
                             hostUser && app.selectedPlayerIds.has(hostUser.userId.toString());
      
      // Log detailed player detection info every frame
      console.log('🎮 [ARCADE-INPUT] 🔍 Player Detection:');
      console.log('  - selectedPlayerIds:', Array.from(app.selectedPlayerIds));
      console.log('  - hostUser:', hostUser);
      console.log('  - isHostSelected:', isHostSelected);
      console.log('  - hostCard active?', hostCard?.classList.contains('active'));
      
      if (isHostSelected) {
        // Host is always first in Team 1
        team1Players.push({
          userId: hostUser.userId,
          username: hostUser.username,
          id: hostUser.userId.toString(),
          team: 1,
          paddleIndex: 0
        });
        console.log('  - ✅ Added host to Team 1:', hostUser.username);
      }
      
      // Get SELECTED local players (highlighted in party list)
      const selectedPlayers = app.localPlayers.filter((p: any) => 
        app.selectedPlayerIds.has(p.id?.toString())
      );
      
      console.log('  - Selected local players:', selectedPlayers.map((p: any) => `${p.username} (team ${p.team})`));
      
      // Add local players to their teams
      const localTeam1 = selectedPlayers.filter((p: any) => p.team === 1);
      const localTeam2 = selectedPlayers.filter((p: any) => p.team === 2);
      
      localTeam1.forEach((p: any) => {
        team1Players.push({
          ...p,
          paddleIndex: team1Players.length
        });
      });
      
      localTeam2.forEach((p: any) => {
        team2Players.push({
          ...p,
          paddleIndex: team2Players.length
        });
      });
      
      // Check if AI is selected and add to appropriate team
      const aiCard = document.getElementById('ai-player-card');
      if (aiCard && aiCard.classList.contains('active') && app.selectedPlayerIds.has('ai-player')) {
        const inTeam2 = aiCard.closest('#team2-list') !== null;
        if (inTeam2) {
          team2Players.push({ userId: 0, username: 'Bot', team: 2, paddleIndex: team2Players.length });
        } else {
          team1Players.push({ userId: 0, username: 'Bot', team: 1, paddleIndex: team1Players.length });
        }
      }
      
      console.log('  - 🏀 Team 1 players:', team1Players.map((p: any) => `${p.username} [paddle ${p.paddleIndex}]`));
      console.log('  - 🏀 Team 2 players:', team2Players.map((p: any) => `${p.username} [paddle ${p.paddleIndex}]`));
    }    
    // Store player information for rendering
    this.team1Players = team1Players;
    this.team2Players = team2Players;
    
    // Log team composition for debugging
    if (team1Players.length === 0 && team2Players.length === 0) {
      console.error('🎮 [ARCADE-INPUT] ❌ NO PLAYERS IN EITHER TEAM!');
      return; // Don't process input if no players
    }
    
    // Team 1 key mappings (left side)
    const team1Keys = [
      { up: 'q', down: 'a' },  // Player 1
      { up: 'w', down: 's' },  // Player 2
      { up: 'e', down: 'd' }   // Player 3
    ];
    
    // Team 2 key mappings (right side)
    const team2Keys = [
      { up: 'u', down: 'j' },  // Player 1
      { up: 'i', down: 'k' },  // Player 2
      { up: 'o', down: 'l' }   // Player 3
    ];
    
    // Handle Team 1 inputs (left paddle)
    let team1Direction: 'up' | 'down' | null = null;
    let team1PaddleIndex = 0;
    
    // Check Arrow keys as alternative control (works for any Team 1 player - controls first paddle)
    const arrowUpPressed = this.keys['arrowup'] || this.keys['ArrowUp'];
    const arrowDownPressed = this.keys['arrowdown'] || this.keys['ArrowDown'];
    
    if (arrowUpPressed && !arrowDownPressed && team1Players.length > 0) {
      team1Direction = 'up';
      team1PaddleIndex = 0; // Arrow keys control first paddle
    } else if (arrowDownPressed && !arrowUpPressed && team1Players.length > 0) {
      team1Direction = 'down';
      team1PaddleIndex = 0; // Arrow keys control first paddle
    } else {
      // Check team-specific keys - each player controls their own paddle
      for (let i = 0; i < team1Players.length && i < 3; i++) {
        const keyMap = team1Keys[i];
        const upPressed = this.keys[keyMap.up] || this.keys[keyMap.up.toUpperCase()];
        const downPressed = this.keys[keyMap.down] || this.keys[keyMap.down.toUpperCase()];
        
        if (upPressed && !downPressed) {
          team1Direction = 'up';
          team1PaddleIndex = i;
          break; // First player to press takes control
        } else if (downPressed && !upPressed) {
          team1Direction = 'down';
          team1PaddleIndex = i;
          break;
        }
      }
    }
    
    if (team1Direction) {
      const message = {
        type: 'movePaddle',
        playerId: 1, // Team 1 / Left side
        paddleIndex: team1PaddleIndex, // Which paddle (0, 1, or 2)
        direction: team1Direction
      };
      console.log('🎮 [ARCADE-INPUT] 📤 Sending Team 1 move:', message);
      this.websocket?.send(JSON.stringify(message));
    }
    
    // Handle Team 2 inputs (right paddle) - each player controls their own paddle
    let team2Direction: 'up' | 'down' | null = null;
    let team2PaddleIndex = 0;
    
    for (let i = 0; i < team2Players.length && i < 3; i++) {
      const keyMap = team2Keys[i];
      const upPressed = this.keys[keyMap.up] || this.keys[keyMap.up.toUpperCase()];
      const downPressed = this.keys[keyMap.down] || this.keys[keyMap.down.toUpperCase()];
      
      if (upPressed && !downPressed) {
        team2Direction = 'up';
        team2PaddleIndex = i;
        break; // First player to press takes control
      } else if (downPressed && !upPressed) {
        team2Direction = 'down';
        team2PaddleIndex = i;
        break;
      }
    }
    
    if (team2Direction) {
      const message = {
        type: 'movePaddle',
        playerId: 2, // Team 2 / Right side
        paddleIndex: team2PaddleIndex, // Which paddle (0, 1, or 2)
        direction: team2Direction
      };
      console.log('🎮 [ARCADE-INPUT] 📤 Sending Team 2 move:', message);
      this.websocket?.send(JSON.stringify(message));
    }
  }

  private updateGameFromBackend(backendState: any): void {
    // Don't update game state if paused
    if (this.isPaused) {
      // console.log(`🎮 [GM#${this.instanceId}] Ignoring game state - game is paused`);
      return;
    }
    
    // Allow updates during countdown
    if (!this.isPlaying && backendState.gameState !== 'countdown') {
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
      
      // Handle multiple paddles for arcade mode if backend sends them
      if (backendState.paddles.team1 && Array.isArray(backendState.paddles.team1)) {
        frontendState.leftPaddles = backendState.paddles.team1.map((p: any, index: number) => {
          const playerInfo = this.team1Players[index];
          return {
            y: p.y,
            speed: 0,
            username: playerInfo?.username,
            userId: playerInfo?.userId,
            color: playerInfo?.color
          };
        });
      }
      if (backendState.paddles.team2 && Array.isArray(backendState.paddles.team2)) {
        frontendState.rightPaddles = backendState.paddles.team2.map((p: any, index: number) => {
          const playerInfo = this.team2Players[index];
          return {
            y: p.y,
            speed: 0,
            username: playerInfo?.username,
            userId: playerInfo?.userId,
            color: playerInfo?.color
          };
        });
      }
      
      this.gameState = frontendState;
      
      // Store countdown value if in countdown state
      if (backendState.gameState === 'countdown' && backendState.countdownValue !== undefined) {
        this.countdownValue = backendState.countdownValue;
      } else if (backendState.gameState === 'playing') {
        // Clear countdown when game starts
        this.countdownValue = null;
        if (!this.isPlaying) {
          this.isPlaying = true;
        }
      }
      
      this.render();
      
      // No longer need to update HTML UI elements - everything is rendered on canvas
    }
  }

  private updateScoreDisplay(): void {
    // This method is no longer needed since we're rendering everything on canvas
    // All UI updates are now handled in the render() method
  }

  private drawCountdownOverlay(value: number): void {
    if (!this.ctx || !this.canvas) return;
    
    // Draw very light semi-transparent overlay (barely visible to keep game bright)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw countdown text with subtle glow effect
    this.ctx.shadowColor = '#77e6ff';
    this.ctx.shadowBlur = 8;
    this.ctx.fillStyle = 'rgba(119, 230, 255, 0.9)'; // Less bright cyan
    this.ctx.font = 'bold 60px "Courier New", monospace'; // Even smaller font
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const text = value > 0 ? value.toString() : 'GO!';
    this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    
    // Add "GET READY" text above countdown (smaller and less bright)
    if (value > 0) {
      this.ctx.font = 'bold 20px "Courier New", monospace';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.shadowBlur = 5;
      this.ctx.fillText('GET READY', this.canvas.width / 2, this.canvas.height / 2 - 50);
    }
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
  }

  private hideCountdown(): void {
    // Countdown is hidden by normal render() calls
    // This method exists for clarity and future enhancements
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
    // Default color for single paddle modes
    const defaultColor = '#77e6ff';
    
    // Color palette for arcade mode (vibrant, distinct colors)
    const paddleColors = [
      '#77e6ff', // Cyan (default)
      '#ff77e6', // Pink/Magenta
      '#77ff77', // Green
      '#ffff77', // Yellow
      '#ff7777'  // Red/Orange
    ];
    
    // Draw left side paddles
    if (this.gameState.leftPaddles && this.gameState.leftPaddles.length > 0) {
      // Multiple paddles for arcade mode - each with different color
      this.gameState.leftPaddles.forEach((paddle, index) => {
        const color = paddle.color || paddleColors[index % paddleColors.length];
        this.ctx!.fillStyle = color;
        this.ctx!.shadowColor = color;
        this.ctx!.shadowBlur = 10;
        this.ctx!.fillRect(50, paddle.y, this.gameState.paddleWidth, this.gameState.paddleHeight);
        
        // Draw player name on the RIGHT side of paddle (towards center)
        if (paddle.username) {
          this.ctx!.shadowBlur = 0;
          this.ctx!.fillStyle = color;
          this.ctx!.font = 'bold 14px "Courier New", monospace';
          this.ctx!.textAlign = 'left';
          this.ctx!.fillText(paddle.username, 65, paddle.y + this.gameState.paddleHeight / 2 + 5);
        }
      });
    } else {
      // Single paddle for co-op/campaign mode
      this.ctx.fillStyle = defaultColor;
      this.ctx.shadowColor = defaultColor;
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(50, this.gameState.leftPaddle.y, this.gameState.paddleWidth, this.gameState.paddleHeight);
    }
    
    // Draw right side paddles
    if (this.gameState.rightPaddles && this.gameState.rightPaddles.length > 0) {
      // Multiple paddles for arcade mode - each with different color
      this.gameState.rightPaddles.forEach((paddle, index) => {
        const color = paddle.color || paddleColors[index % paddleColors.length];
        this.ctx!.fillStyle = color;
        this.ctx!.shadowColor = color;
        this.ctx!.shadowBlur = 10;
        this.ctx!.fillRect(this.canvas.width - 60, paddle.y, this.gameState.paddleWidth, this.gameState.paddleHeight);
        
        // Draw player name on the LEFT side of paddle (towards center)
        if (paddle.username) {
          this.ctx!.shadowBlur = 0;
          this.ctx!.fillStyle = color;
          this.ctx!.font = 'bold 14px "Courier New", monospace';
          this.ctx!.textAlign = 'right';
          this.ctx!.fillText(paddle.username, this.canvas.width - 65, paddle.y + this.gameState.paddleHeight / 2 + 5);
        }
      });
    } else {
      // Single paddle for co-op/campaign mode
      this.ctx.fillStyle = defaultColor;
      this.ctx.shadowColor = defaultColor;
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(this.canvas.width - 60, this.gameState.rightPaddle.y, this.gameState.paddleWidth, this.gameState.paddleHeight);
    }
    
    // Draw ball with trailing effect based on speed
    this.drawBallWithTrail();
    
    // Reset shadow for other elements
    this.ctx.shadowBlur = 0;
    
    // Draw all player information and UI elements on canvas
    this.drawPlayerInfo();
    
    // Draw control keys for arcade mode
    this.drawArcadeControls();
    
    // Draw countdown overlay if active (drawn last so it's on top)
    if (this.countdownValue !== null) {
      this.drawCountdownOverlay(this.countdownValue);
    }
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

    // Get user information
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    
    // Check if we're in arcade mode (multiple paddles)
    const isArcadeMode = (this.gameState.leftPaddles && this.gameState.leftPaddles.length > 0) ||
                         (this.gameState.rightPaddles && this.gameState.rightPaddles.length > 0);
    
    // Player names and levels
    let leftPlayerName: string;
    let rightPlayerName: string;
    let leftPlayerLevel: number;
    let rightPlayerLevel: number;
    
    if (isArcadeMode) {
      // Arcade mode: Show team names with average levels
      leftPlayerName = 'Team 1';
      rightPlayerName = 'Team 2';
      
      // Calculate average level for Team 1
      if (this.team1Players.length > 0) {
        const totalLevel = this.team1Players.reduce((sum, player) => {
          // Try to get level from player object
          const playerLevel = player.level || player.profileLevel || 1;
          return sum + playerLevel;
        }, 0);
        leftPlayerLevel = Math.round(totalLevel / this.team1Players.length);
      } else {
        leftPlayerLevel = 1;
      }
      
      // Calculate average level for Team 2
      if (this.team2Players.length > 0) {
        const totalLevel = this.team2Players.reduce((sum, player) => {
          // Try to get level from player object
          const playerLevel = player.level || player.profileLevel || 1;
          return sum + playerLevel;
        }, 0);
        rightPlayerLevel = Math.round(totalLevel / this.team2Players.length);
      } else {
        rightPlayerLevel = 1;
      }
    } else {
      // Co-op/Campaign/Tournament mode: Show player names
      const app = (window as any).app;
      const tournamentMatch = app?.currentTournamentMatch;
      
      if (tournamentMatch && tournamentMatch.player1Name && tournamentMatch.player2Name) {
        // Tournament mode: Use player names from match data
        leftPlayerName = tournamentMatch.player1Name;
        rightPlayerName = tournamentMatch.player2Name;
        leftPlayerLevel = 1; // Can enhance later with actual player levels
        rightPlayerLevel = 1;
      } else {
        // Co-op/Campaign mode: Show player vs AI
        leftPlayerName = user?.username || 'Player 1';
        rightPlayerName = 'AI Bot';
        
        // Try to read player level from user profile
        const userLevelFromProfile = (() => {
          const maybeLevel = (user as any)?.level ?? (user as any)?.profileLevel ?? (user as any)?.profile?.level;
          if (typeof maybeLevel === 'number') return Math.max(1, Math.floor(maybeLevel));
          if (typeof maybeLevel === 'string' && !isNaN(parseInt(maybeLevel, 10))) return Math.max(1, parseInt(maybeLevel, 10));
          return null;
        })();

        leftPlayerLevel = userLevelFromProfile ?? (this.isCampaignMode ? this.currentCampaignLevel : 1);
        rightPlayerLevel = leftPlayerLevel;
      }
    }

    // Use getter to respect current game settings and campaign adjustments
    const targetScore = this.getScoreToWin();

    // Left player info
    this.drawPlayerInfoSection(
      50, // x position
      25, // y position  
      leftPlayerName,
      leftPlayerLevel,
      this.gameState.leftScore,
      isArcadeMode ? '👥' : '👤', // icon
      'left'
    );

    // Right player info
    this.drawPlayerInfoSection(
      this.canvas.width - 50, // x position
      25, // y position
      rightPlayerName,
      rightPlayerLevel,
      this.gameState.rightScore,
      isArcadeMode ? '👥' : '🤖', // icon
      'right'
    );

    // Center info - "First to X" or campaign level or team matchup
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    
    if (this.isCampaignMode) {
      this.ctx.fillText(`Campaign Level ${this.currentCampaignLevel} - First to ${targetScore}`, this.canvas.width / 2, 30);
    } else if (isArcadeMode) {
      // Show Team vs Team with levels
      this.ctx.fillText(`First to ${targetScore}`, this.canvas.width / 2, 30);
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
    
    // Check if this is a team name (for arcade mode)
    const isTeam = name.startsWith('Team ');
    
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
      
      // Draw level (skip for teams in arcade mode)
      if (!isTeam) {
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillText(`Level ${level}`, x + 30, y + 15);
      }
      
    } else {
      this.ctx.textAlign = 'right';
      this.ctx.fillText(icon, x, y);
      
      // Draw name
      this.ctx.font = 'bold 14px Arial';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(name, x - 30, y - 2);
      
      // Draw level (skip for teams in arcade mode)
      if (!isTeam) {
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillText(`Level ${level}`, x - 30, y + 15);
      }
    }

    this.ctx.restore();
  }

  private drawArcadeControls(): void {
    if (!this.ctx || !this.canvas || !this.gameState) return;
    
    // Check if we're in arcade mode
    const isArcadeMode = (this.gameState.leftPaddles && this.gameState.leftPaddles.length > 0) ||
                         (this.gameState.rightPaddles && this.gameState.rightPaddles.length > 0);
    
    if (!isArcadeMode) return; // Only show controls in arcade mode
    
    this.ctx.save();
    
    // Draw semi-transparent background at the bottom
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, this.canvas.height - 80, this.canvas.width, 80);
    
    // Color palette matching paddles
    const paddleColors = [
      '#77e6ff', // Cyan
      '#ff77e6', // Pink/Magenta
      '#77ff77', // Green
      '#ffff77', // Yellow
      '#ff7777'  // Red/Orange
    ];
    
    // Team 1 controls (left side)
    const team1Keys = [
      { label: 'Q/A', description: 'Player 1' },
      { label: 'W/S', description: 'Player 2' },
      { label: 'E/D', description: 'Player 3' }
    ];
    
    // Team 2 controls (right side)
    const team2Keys = [
      { label: 'U/J', description: 'Player 1' },
      { label: 'I/K', description: 'Player 2' },
      { label: 'O/L', description: 'Player 3' }
    ];
    
    const startY = this.canvas.height - 60;
    const lineHeight = 20;
    
    // Draw Team 1 controls (left side)
    this.ctx.textAlign = 'left';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('TEAM 1 CONTROLS:', 20, startY - 5);
    
    for (let i = 0; i < Math.min(this.team1Players.length, 3); i++) {
      const player = this.team1Players[i];
      const color = paddleColors[i % paddleColors.length];
      const yPos = startY + 15 + (i * lineHeight);
      
      // Draw colored indicator
      this.ctx.fillStyle = color;
      this.ctx.fillRect(20, yPos - 10, 8, 12);
      
      // Draw player name and keys
      this.ctx.font = 'bold 11px Arial';
      this.ctx.fillStyle = color;
      this.ctx.fillText(player.username, 35, yPos);
      
      this.ctx.font = '11px Arial';
      this.ctx.fillStyle = '#aaaaaa';
      this.ctx.fillText(`- ${team1Keys[i].label}`, 35 + this.ctx.measureText(player.username).width + 5, yPos);
    }
    
    // Add arrow keys alternative for Team 1
    if (this.team1Players.length > 0) {
      const arrowY = startY + 15 + (Math.min(this.team1Players.length, 3) * lineHeight);
      this.ctx.font = '10px Arial';
      this.ctx.fillStyle = '#666666';
      this.ctx.fillText('(Arrow Keys: Player 1)', 20, arrowY);
    }
    
    // Draw Team 2 controls (right side)
    this.ctx.textAlign = 'right';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('TEAM 2 CONTROLS:', this.canvas.width - 20, startY - 5);
    
    for (let i = 0; i < Math.min(this.team2Players.length, 3); i++) {
      const player = this.team2Players[i];
      const color = paddleColors[i % paddleColors.length];
      const yPos = startY + 15 + (i * lineHeight);
      
      // Measure text widths for right alignment
      this.ctx.font = 'bold 11px Arial';
      const nameWidth = this.ctx.measureText(player.username).width;
      this.ctx.font = '11px Arial';
      const keysText = `${team2Keys[i].label} - `;
      const keysWidth = this.ctx.measureText(keysText).width;
      
      // Draw colored indicator
      this.ctx.fillStyle = color;
      this.ctx.fillRect(this.canvas.width - 28, yPos - 10, 8, 12);
      
      // Draw keys and player name
      this.ctx.font = '11px Arial';
      this.ctx.fillStyle = '#aaaaaa';
      this.ctx.fillText(keysText, this.canvas.width - 35, yPos);
      
      this.ctx.font = 'bold 11px Arial';
      this.ctx.fillStyle = color;
      this.ctx.fillText(player.username, this.canvas.width - 35 - keysWidth, yPos);
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
    
    // Handle arcade mode completion
    if (this.gameSettings.gameMode === 'arcade') {
      console.log('🕹️ [ARCADE] Handling arcade game end');
      this.handleArcadeGameEnd(result);
      return; // Arcade mode handles its own UI and navigation
    }

    // Handle tournament mode completion
    if (this.gameSettings.gameMode === 'tournament') {
      console.log('🏆 [TOURNAMENT] Handling tournament game end');
      this.handleTournamentGameEnd(result);
      return; // Tournament mode handles its own UI and navigation
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
    console.log('GameManager: Starting bot match with mode:', this.gameSettings.gameMode);
    
    // Check game mode and start appropriate match type
    if (this.gameSettings.gameMode === 'coop') {
      console.log('🎯 [CAMPAIGN] CO-OP mode detected, starting campaign game');
      await this.startCampaignGame();
    } else if (this.gameSettings.gameMode === 'arcade') {
      console.log('🕹️ [ARCADE] ARCADE mode detected, starting arcade match');
      await this.startArcadeMatch();
    } else {
      // Default or other modes
      console.log('🎮 [GAME] Starting standard bot match');
      this.startBotMatchWithSettings(false);
    }
    
    console.log('🏁 [GameManager.startBotMatch] === COMPLETED ===');
  }

  // Start arcade mode (classic match with score to win)
  public async startArcadeMatch(): Promise<void> {
    console.log('🕹️ [ARCADE] Starting arcade mode');
    this.isCampaignMode = false; // Arcade is NOT campaign mode
    
    // Sync settings from app before starting
    const app = (window as any).app;
    if (app && app.gameSettings) {
      this.gameSettings = { ...this.gameSettings, ...app.gameSettings };
      console.log('🕹️ [ARCADE] Synced game settings from app:', this.gameSettings);
    }
    
    console.log(`🕹️ [ARCADE] Score to win: ${this.gameSettings.scoreToWin}`);
    
    // Ensure canvas exists
    this.ensureCanvasInitialized();
    
    // Update arcade UI to show controls
    this.updateArcadeUI();
    
    // Start the arcade match
    await this.startArcadeMatchWithSettings();
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

  // Start arcade match with custom settings
  private async startArcadeMatchWithSettings(): Promise<void> {
    console.log('🕹️ [ARCADE] Starting arcade match with settings');
    
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

    // Ensure canvas is initialized for arcade matches
    this.ensureCanvasInitialized();

    // Update UI to show game starting
    const waitingMsg = document.getElementById('waiting-message');
    if (waitingMsg) waitingMsg.classList.remove('hidden');
    
    try {
      // Connect to game server for arcade match
      await this.connectToArcadeGameServer();
    } catch (error) {
      console.error('🕹️ [ARCADE] Failed to start arcade match:', error);
      if (waitingMsg) waitingMsg.classList.add('hidden');
      alert('Failed to start arcade match. Please try again.');
      this.isPlaying = false;
      this.stopGame();
      return;
    }
  }

  private async connectToArcadeGameServer(): Promise<void> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;
    
    return new Promise((resolve, reject) => {
      // Close any existing websocket first
      if (this.websocket) {
        try {
          this.websocket.onmessage = null as any;
          this.websocket.onopen = null as any;
          this.websocket.onclose = null as any;
          this.websocket.onerror = null as any;
          this.websocket.close();
        } catch (e) {
          console.warn('🕹️ [ARCADE] Error closing existing websocket', e);
        }
        this.websocket = null;
      }

      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('🕹️ [ARCADE] Connected to game server for arcade match');
        const authManager = (window as any).authManager;
        const user = authManager?.getCurrentUser();
        
        if (!user || !user.userId) {
          console.error('🕹️ [ARCADE] No valid user logged in!');
          reject(new Error('No valid user'));
          return;
        }

        // Get selected players and their team assignments
        const app = (window as any).app;
        let team1Players: any[] = [];
        let team2Players: any[] = [];
        
        // First, check if host player is selected - host is ALWAYS first in team 1
        const hostCard = document.getElementById('host-player-card');
        const isHostSelected = hostCard && hostCard.classList.contains('active') && 
                               app.selectedPlayerIds && app.selectedPlayerIds.has(user.userId.toString());
        
        if (isHostSelected) {
          const hostPlayer = {
            userId: user.userId,
            username: user.username,
            id: user.userId.toString(),
            team: 1,
            paddleIndex: 0 // Host is always first paddle in team 1
          };
          team1Players.push(hostPlayer);
          console.log('🕹️ [ARCADE] Host added to Team 1 as first player (paddle 0) - Keys: Q/A + Arrows');
        }
        
        // Then add local players based on their team assignments
        if (app && app.localPlayers && app.selectedPlayerIds) {
          const selectedPlayers = app.localPlayers.filter((p: any) => 
            app.selectedPlayerIds.has(p.id?.toString())
          );
          
          // Separate by team
          const localTeam1 = selectedPlayers.filter((p: any) => p.team === 1);
          const localTeam2 = selectedPlayers.filter((p: any) => p.team === 2);
          
          // Add local team 1 players AFTER host
          localTeam1.forEach((p: any) => {
            team1Players.push({
              userId: p.userId,
              username: p.username,
              id: p.id,
              team: 1,
              paddleIndex: team1Players.length // Assign sequential paddle index
            });
          });
          
          // Add team 2 players
          localTeam2.forEach((p: any) => {
            team2Players.push({
              userId: p.userId,
              username: p.username,
              id: p.id,
              team: 2,
              paddleIndex: team2Players.length // Assign sequential paddle index
            });
          });
          
          console.log('🕹️ [ARCADE] Team 1 players:', team1Players.map((p, i) => `${i}: ${p.username}`));
          console.log('🕹️ [ARCADE] Team 2 players:', team2Players.map((p, i) => `${i}: ${p.username}`));
        }
        
        // Check if AI player is selected
        const aiCard = document.getElementById('ai-player-card');
        if (aiCard && aiCard.classList.contains('active') && app.selectedPlayerIds && app.selectedPlayerIds.has('ai-player')) {
          // Determine AI team from DOM position
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
            console.log('🕹️ [ARCADE] AI added to Team 2 at index', aiPlayer.paddleIndex);
          } else {
            team1Players.push(aiPlayer);
            console.log('🕹️ [ARCADE] AI added to Team 1 at index', aiPlayer.paddleIndex);
          }
        }
        
        // Ensure at least 1 player per team (defaults)
        const team1Count = Math.max(1, team1Players.length);
        const team2Count = Math.max(1, team2Players.length);

        // Get all game settings from app
        const gameSettings = app?.gameSettings || this.gameSettings;
        
        // Determine AI difficulty based on minimum player level
        // For now, use the configured difficulty, but could be enhanced to check player stats
        const aiDifficulty = gameSettings.aiDifficulty || 'medium';

        // Send arcade match request with complete player information
        if (this.websocket) {
          const arcadeRequest: any = {
            type: 'userConnect',
            userId: user.userId,
            username: user.username,
            gameMode: gameSettings.gameMode || 'arcade', // Use actual game mode (could be 'tournament')
            // Game settings
            aiDifficulty: aiDifficulty,
            ballSpeed: gameSettings.ballSpeed || 'medium',
            paddleSpeed: gameSettings.paddleSpeed || 'medium',
            powerupsEnabled: gameSettings.powerupsEnabled || false,
            accelerateOnHit: gameSettings.accelerateOnHit || false,
            scoreToWin: gameSettings.scoreToWin || 5,
            // Team player counts
            team1PlayerCount: team1Count,
            team2PlayerCount: team2Count,
            // Detailed player information for each team
            team1Players: team1Players.map((p, index) => ({
              userId: p.userId,
              username: p.username,
              paddleIndex: index, // 0, 1, or 2
              isBot: p.userId === 0 // Mark AI players
            })),
            team2Players: team2Players.map((p, index) => ({
              userId: p.userId,
              username: p.username,
              paddleIndex: index, // 0, 1, or 2
              isBot: p.userId === 0 // Mark AI players
            }))
          };
          
          // Add tournament information if this is a tournament match
          if (gameSettings.gameMode === 'tournament' && app && app.currentTournamentMatch) {
            // CRITICAL FIX: Always send player1 as the game's player1, regardless of who initiated
            // This ensures game winner IDs match tournament player IDs correctly
            arcadeRequest.userId = app.currentTournamentMatch.player1Id;
            arcadeRequest.username = app.currentTournamentMatch.player1Name;
            arcadeRequest.tournamentId = app.currentTournamentMatch.tournamentId;
            arcadeRequest.tournamentMatchId = app.currentTournamentMatch.matchId;
            arcadeRequest.player2Id = app.currentTournamentMatch.player2Id;
            arcadeRequest.player2Name = app.currentTournamentMatch.player2Name;
            console.log('🏆 [TOURNAMENT] Fixed player mapping for game creation:', {
              gamePlayer1: arcadeRequest.userId, // Always tournament player1
              gamePlayer2: arcadeRequest.player2Id, // Always tournament player2
              tournamentId: arcadeRequest.tournamentId,
              matchId: arcadeRequest.tournamentMatchId,
              currentUser: user.userId
            });
          }
          
          console.log('🕹️ [ARCADE] Sending match request with full player info:', arcadeRequest);
          console.log('🕹️ [ARCADE] Team 1 (LEFT SIDE):', arcadeRequest.team1Players);
          console.log('🕹️ [ARCADE] Team 2 (RIGHT SIDE):', arcadeRequest.team2Players);
          this.websocket.send(JSON.stringify(arcadeRequest));
        }
        resolve();
      };

      // Attach the message handler
      if (this.websocket && this.boundHandleGameMessage) {
        this.websocket.onmessage = this.boundHandleGameMessage;
      }

      this.websocket.onclose = () => {
        console.log('🕹️ [ARCADE] Game server connection closed');
        this.resetFindMatch();
        this.isPlaying = false;
        if (this.inputInterval) {
          clearInterval(this.inputInterval);
          this.inputInterval = null;
        }
      };

      this.websocket.onerror = (error) => {
        console.error('🕹️ [ARCADE] WebSocket error:', error);
        reject(error);
      };
    });
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
    
    // Clean up any campaign modals
    this.cleanupCampaignModals();
    
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
    
    // Clear key monitor interval
    if (this.keyMonitorInterval) {
      console.log(`🛑 [GM#${this.instanceId}] Clearing key monitor interval`);
      clearInterval(this.keyMonitorInterval);
      this.keyMonitorInterval = null;
    }
    
    // Reset game state
    this.gameState = null;
    
    // Clear all key states
    this.keys = {};
    
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

  private updateArcadeUI(): void {
    // Show arcade mode controls hint
    const app = (window as any).app;
    if (!app || !app.localPlayers || !app.selectedPlayerIds) return;
    
    // Get SELECTED players only (highlighted in party list)
    const selectedPlayers = app.localPlayers.filter((p: any) => 
      app.selectedPlayerIds.has(p.id?.toString())
    );
    
    const team1Players = selectedPlayers.filter((p: any) => p.team === 1);
    const team2Players = selectedPlayers.filter((p: any) => p.team === 2);
    
    // Create or update controls display
    let controlsDisplay = document.getElementById('arcade-controls-display');
    if (!controlsDisplay) {
      controlsDisplay = document.createElement('div');
      controlsDisplay.id = 'arcade-controls-display';
      controlsDisplay.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: #77e6ff;
        padding: 15px 30px;
        border-radius: 10px;
        font-size: 14px;
        font-family: 'Orbitron', sans-serif;
        z-index: 100;
        border: 1px solid #77e6ff;
        box-shadow: 0 0 20px rgba(119, 230, 255, 0.3);
      `;
      document.body.appendChild(controlsDisplay);
    }
    
    const team1KeyHints = ['Q/A', 'W/S', 'E/D'];
    const team2KeyHints = ['U/J', 'I/K', 'O/L'];
    
    let team1Text = `<span style="color: #77e6ff;">TEAM 1:</span> `;
    team1Players.forEach((player: any, idx: number) => {
      if (idx < 3) {
        team1Text += `${player.username} (${team1KeyHints[idx]}) `;
      }
    });
    if (team1Players.length > 0) {
      team1Text += `<span style="color: #aaa; font-size: 12px;">or ↑/↓</span>`;
    }
    
    let team2Text = `<span style="color: #e94560;">TEAM 2:</span> `;
    team2Players.forEach((player: any, idx: number) => {
      if (idx < 3) {
        team2Text += `${player.username} (${team2KeyHints[idx]}) `;
      }
    });
    
    controlsDisplay.innerHTML = `
      <div style="display: flex; gap: 30px; align-items: center;">
        <div>${team1Text}</div>
        <div style="color: #fff;">|</div>
        <div>${team2Text}</div>
      </div>
    `;
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

      // Update campaign level in backend database
      try {
        const authManager = (window as any).authManager;
        const user = authManager?.getCurrentUser();
        const headers = authManager?.getAuthHeaders ? authManager.getAuthHeaders() : {};
        if (user && user.userId) {
          const url = `/api/user/game/update-stats/${user.userId}`;
          const body = { campaign_level: this.currentCampaignLevel };
          console.log('🎯 [CAMPAIGN] Sending POST to:', url, 'with body:', body);
          console.log('🎯 [CAMPAIGN] Using headers:', headers);
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body)
          }).then(async res => {
            if (!res.ok) {
              const errorText = await res.text();
              console.error('❌ [CAMPAIGN] Failed to update campaign level on server. Status:', res.status, 'Response:', errorText);
            } else {
              const responseData = await res.json();
              console.log('✅ [CAMPAIGN] Campaign level', this.currentCampaignLevel, 'synced to database. Response:', responseData);
            }
          }).catch(err => {
            console.error('❌ [CAMPAIGN] Error syncing campaign level:', err);
          });
        } else {
          console.warn('⚠️ [CAMPAIGN] Cannot sync - user or userId not available:', { user, hasUserId: !!user?.userId });
        }
      } catch (err) {
        console.error('❌ [CAMPAIGN] Exception while syncing campaign level to server:', err);
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
        // Check if still on game screen before starting next level
        const app = (window as any).app;
        const currentScreen = app?.currentScreen;
        
        if (currentScreen !== 'game') {
          console.log('🎯 [CAMPAIGN] User not on game screen. Canceling next level start.');
          if (message.parentNode) {
            message.parentNode.removeChild(message);
          }
          return;
        }
        
        if (message.parentNode) {
          message.parentNode.removeChild(message);
        }
        this.restartCampaignLevel();
      });
    }
  }
  
  // Clean up all game modals (called when navigating away from game screen)
  public cleanupCampaignModals(): void {
    const modalIds = ['level-up-message', 'campaign-complete-message', 'retry-message', 'arcade-result-message', 'arcade-controls-display'];
    modalIds.forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        // Remove from DOM (this also removes all event listeners)
        modal.remove();
        console.log(`� [GAME] Removed modal: ${id}`);
      }
    });
    
    // Also query for any orphaned modals with these styles (in case ID was changed)
    const orphanedModals = document.querySelectorAll('[style*="z-index: 10000"]');
    orphanedModals.forEach((modal) => {
      const element = modal as HTMLElement;
      // Check if it's a game modal by checking content
      if (element.textContent?.includes('LEVEL UP') || 
          element.textContent?.includes('CAMPAIGN COMPLETE') || 
          element.textContent?.includes('TRY AGAIN') ||
          element.textContent?.includes('VICTORY') ||
          element.textContent?.includes('DEFEAT')) {
        element.remove();
        console.log('� [GAME] Removed orphaned game modal');
      }
    });
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
    
    // GUARD: Check if still on game screen
    const app = (window as any).app;
    const currentScreen = app?.currentScreen;
    if (currentScreen !== 'game') {
      console.warn('⚠️ [CAMPAIGN] Not on game screen, cannot start campaign match');
      return;
    }
    
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

  // Handle arcade mode game end
  private handleArcadeGameEnd(gameData: any): void {
    console.log('🕹️ [ARCADE] Game ended with data:', gameData);
    
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    
    if (!user) return;
    
    // Check if player won
    const winnerId = (typeof gameData.winner === 'number') ? gameData.winner : gameData.winnerId;
    const playerWon = winnerId === user.userId;
    
    // Get final scores
    const scores = gameData.scores || { player1: 0, player2: 0 };
    const finalScoreText = `${scores.player1} - ${scores.player2}`;
    
    // Show result message
    this.showArcadeResultMessage(playerWon, finalScoreText);
    
    // Reset UI after delay
    setTimeout(() => {
      this.resetFindMatch();
      
      // Close websocket
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }
      
      // Navigate back to play config
      const app = (window as any).app;
      if (app && app.router) {
        app.router.navigate('play-config');
      }
    }, 3000);
  }

  private showArcadeResultMessage(playerWon: boolean, scoreText: string): void {
    const message = document.createElement('div');
    message.id = 'arcade-result-message';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${playerWon ? 'rgba(119, 230, 255, 0.95)' : 'rgba(233, 69, 96, 0.95)'};
      color: #ffffff;
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      z-index: 10000;
      border: 3px solid ${playerWon ? '#77e6ff' : '#ff6b8a'};
      box-shadow: 0 0 40px ${playerWon ? 'rgba(119, 230, 255, 0.6)' : 'rgba(233, 69, 96, 0.6)'};
      min-width: 400px;
    `;
    message.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">
        ${playerWon ? '🎉' : '😔'}
      </div>
      <div style="color: #ffffff; margin-bottom: 15px;">
        ${playerWon ? 'VICTORY!' : 'DEFEAT'}
      </div>
      <div style="font-size: 24px; margin-top: 10px; color: rgba(255, 255, 255, 0.9);">
        Final Score: ${scoreText}
      </div>
      <div style="font-size: 16px; margin-top: 20px; color: rgba(255, 255, 255, 0.8);">
        ${playerWon ? 'Well played! 🏆' : 'Better luck next time!'}
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

  private handleTournamentGameEnd(gameData: any): void {
    console.log('🏆 [TOURNAMENT] ========== GAME END HANDLER ==========');
    console.log('🏆 [TOURNAMENT] Game ended with data:', gameData);
    
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    
    if (!user) {
      console.error('🏆 [TOURNAMENT] No user logged in');
      return;
    }
    
    const app = (window as any).app;
    const tournamentMatch = app?.currentTournamentMatch;
    
    if (!tournamentMatch) {
      console.error('🏆 [TOURNAMENT] No tournament match data found');
      return;
    }
    
    console.log('🏆 [TOURNAMENT] Tournament match data:', {
      matchId: tournamentMatch.matchId,
      player1Id: tournamentMatch.player1Id,
      player2Id: tournamentMatch.player2Id,
      player1Name: tournamentMatch.player1Name,
      player2Name: tournamentMatch.player2Name,
      originalPlayer1Id: tournamentMatch.originalPlayer1Id,
      originalPlayer2Id: tournamentMatch.originalPlayer2Id
    });
    
    // Get the winner from game (this is based on displayed positions)
    const gameWinnerId = (typeof gameData.winner === 'number') ? gameData.winner : gameData.winnerId;
    const playerWon = gameWinnerId === user.userId;
    
    // Get final scores (based on displayed positions)
    const scores = gameData.scores || { player1: 0, player2: 0 };
    const finalScoreText = `${scores.player1} - ${scores.player2}`;
    
    console.log('🏆 [TOURNAMENT] Game result:', {
      gameWinnerId,
      gameScores: scores,
      currentUserId: user.userId,
      playerWon
    });
    
    // Map back to original tournament player IDs if sides were swapped
    const originalPlayer1Id = tournamentMatch.originalPlayer1Id || tournamentMatch.player1Id;
    const originalPlayer2Id = tournamentMatch.originalPlayer2Id || tournamentMatch.player2Id;
    const werePlayersSwapped = tournamentMatch.player1Id !== originalPlayer1Id;
    
    console.log('🏆 [TOURNAMENT] Player mapping:', {
      displayedPlayer1: tournamentMatch.player1Id,
      displayedPlayer2: tournamentMatch.player2Id,
      originalPlayer1: originalPlayer1Id,
      originalPlayer2: originalPlayer2Id,
      werePlayersSwapped
    });
    
    let actualWinnerId = gameWinnerId;
    let actualPlayer1Score = scores.player1;
    let actualPlayer2Score = scores.player2;
    
    if (werePlayersSwapped) {
      // Players were swapped for display, need to map back to original IDs
      console.log('🔄 [TOURNAMENT] Players were swapped, mapping back to original IDs');
      
      // Swap the scores back to match original player order
      actualPlayer1Score = scores.player2;
      actualPlayer2Score = scores.player1;
      
      console.log('🔄 [TOURNAMENT] Swapped scores:', {
        beforeSwap: { player1: scores.player1, player2: scores.player2 },
        afterSwap: { player1: actualPlayer1Score, player2: actualPlayer2Score }
      });
      
      // CRITICAL FIX: Determine winner based on the swapped scores
      // After swapping scores, the winner is whoever has the higher score in the original player positions
      if (actualPlayer1Score > actualPlayer2Score) {
        actualWinnerId = originalPlayer1Id;
      } else {
        actualWinnerId = originalPlayer2Id;
      }
      
      console.log('🔄 [TOURNAMENT] Recalculated winner based on swapped scores:', {
        gameWinnerId: gameWinnerId,
        actualWinnerId: actualWinnerId,
        player1Score: actualPlayer1Score,
        player2Score: actualPlayer2Score
      });
    }
    
    console.log('🏆 [TOURNAMENT] Final result to record:', {
      tournamentId: tournamentMatch.tournamentId,
      matchId: tournamentMatch.matchId,
      winnerId: actualWinnerId,
      originalPlayer1Id: originalPlayer1Id,
      originalPlayer2Id: originalPlayer2Id,
      player1Score: actualPlayer1Score,
      player2Score: actualPlayer2Score
    });
    
    // Verify winner is one of the original players
    if (actualWinnerId !== originalPlayer1Id && actualWinnerId !== originalPlayer2Id) {
      console.error('🚨 [TOURNAMENT] CRITICAL ERROR: Winner ID does not match any original player!', {
        winnerId: actualWinnerId,
        originalPlayer1Id,
        originalPlayer2Id
      });
      alert('Error: Invalid winner ID. Please report this bug.');
      return;
    }
    
    // Record match result via tournament manager
    const tournamentManager = (window as any).tournamentManager;
    if (tournamentManager && tournamentManager.recordMatchResult) {
      tournamentManager.recordMatchResult(
        tournamentMatch.tournamentId,
        tournamentMatch.matchId,
        actualWinnerId,
        actualPlayer1Score,
        actualPlayer2Score
      ).then(() => {
        console.log('✅ [TOURNAMENT] Match result recorded successfully');
        
        // Clear current tournament match to prevent replay
        if (app) {
          app.currentTournamentMatch = null;
        }
        
        // Show result message
        this.showTournamentResultMessage(playerWon, finalScoreText);
        
        // Reset UI and navigate back after delay
        setTimeout(() => {
          this.resetFindMatch();
          
          // Close websocket
          if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
          }
          
          // Navigate back to play config
          if (app && app.router) {
            app.router.navigate('play-config');
          }
          
          // Show tournament bracket again
          if (tournamentManager && tournamentManager.viewTournament) {
            tournamentManager.viewTournament(tournamentMatch.tournamentId);
          }
        }, 3000);
      }).catch((error: any) => {
        console.error('🚨 [TOURNAMENT] Failed to record match result:', error);
        alert('Failed to record match result: ' + (error.message || 'Unknown error'));
      });
    } else {
      console.error('🚨 [TOURNAMENT] Tournament manager or recordMatchResult not available');
    }
    
    console.log('🏆 [TOURNAMENT] ========== END HANDLER COMPLETE ==========');
  }

  private showTournamentResultMessage(playerWon: boolean, scoreText: string): void {
    const message = document.createElement('div');
    message.id = 'tournament-result-message';
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${playerWon ? 'rgba(255, 215, 0, 0.95)' : 'rgba(233, 69, 96, 0.95)'};
      color: ${playerWon ? '#1a1a1a' : '#ffffff'};
      padding: 40px;
      border-radius: 20px;
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      z-index: 10000;
      border: 3px solid ${playerWon ? '#ffd700' : '#ff6b8a'};
      box-shadow: 0 0 40px ${playerWon ? 'rgba(255, 215, 0, 0.6)' : 'rgba(233, 69, 96, 0.6)'};
      min-width: 400px;
    `;
    message.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">
        ${playerWon ? '🏆' : '😔'}
      </div>
      <div style="margin-bottom: 15px;">
        ${playerWon ? 'MATCH WON!' : 'MATCH LOST'}
      </div>
      <div style="font-size: 24px; margin-top: 10px; opacity: 0.9;">
        Final Score: ${scoreText}
      </div>
      <div style="font-size: 16px; margin-top: 20px; opacity: 0.8;">
        ${playerWon ? 'Advancing to next round! 🚀' : 'Tournament continues...'}
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