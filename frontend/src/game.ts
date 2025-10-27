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
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private websocket: WebSocket | null = null;
  private gameState: GameState | null = null;
  public isPlaying: boolean = false;
  public isPaused: boolean = false;
  private keys: KeyState = {};
  private chatSocket: WebSocket | null = null;
  private inputInterval: NodeJS.Timeout | null = null;
  
  // Game settings
  private gameSettings: GameSettings = {
    gameMode: 'arcade',
    aiDifficulty: 'medium',
    ballSpeed: 'medium',
    paddleSpeed: 'medium',
    powerupsEnabled: false,
    accelerateOnHit: false,
    scoreToWin: 3
  };

  constructor() {
    this.setupEventListeners();
    // Chat functionality removed
    // this.setupChat();
  }

  // Chat functionality completely disabled
  /*
  private setupChat(): void {
    // Create chat UI if not present
    let chatContainer = document.getElementById('chat-container');
    if (!chatContainer) {
      chatContainer = document.createElement('div');
      chatContainer.id = 'chat-container';
      chatContainer.style.position = 'fixed';
      chatContainer.style.right = '24px';
      chatContainer.style.bottom = '24px';
      chatContainer.style.zIndex = '1000';
      chatContainer.style.transition = 'all 0.3s ease';
      
      // Create icon-only chat button
      chatContainer.innerHTML = `
        <div id="game-chat-button" style="
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        ">
          <i class="fas fa-comments" style="font-size: 20px; color: #ffffff;"></i>
        </div>
        <div id="game-chat-content" style="
          position: absolute;
          bottom: 0;
          right: 0;
          width: 280px;
          height: 300px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          display: none;
          flex-direction: column;
          overflow: hidden;
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px 12px 0 0;
          ">
            <i class="fas fa-comments" style="color: #ffffff; font-size: 16px;"></i>
            <button id="game-chat-close" style="
              background: none;
              border: none;
              color: #ffffff;
              font-size: 14px;
              cursor: pointer;
              padding: 4px;
              border-radius: 3px;
              transition: all 0.2s ease;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div id="chat-messages" style="
            flex: 1;
            padding: 8px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
          "></div>
          <form id="chat-form" style="
            display: flex;
            padding: 8px;
            gap: 6px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.02);
            border-radius: 0 0 12px 12px;
          ">
            <input id="chat-input" type="text" placeholder="Message..." style="
              flex: 1;
              padding: 6px 8px;
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 4px;
              color: #ffffff;
              font-size: 12px;
              outline: none;
              transition: all 0.2s ease;
            " maxlength="200" />
            <button type="submit" style="
              padding: 6px 8px;
              background: linear-gradient(180deg, #e94560 0%, #c73650 100%);
              border: none;
              border-radius: 4px;
              color: #ffffff;
              font-size: 12px;
              cursor: pointer;
              transition: all 0.2s ease;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(233, 69, 96, 0.3);
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <i class="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      `;
      document.body.appendChild(chatContainer);

      // Add click handlers for expand/collapse
      const chatButton = document.getElementById('game-chat-button');
      const chatContent = document.getElementById('game-chat-content');
      const chatClose = document.getElementById('game-chat-close');

      if (chatButton && chatContent && chatClose) {
        chatButton.addEventListener('click', () => {
          chatButton.style.display = 'none';
          chatContent.style.display = 'flex';
        });

        chatClose.addEventListener('click', (e) => {
          e.stopPropagation();
          chatContent.style.display = 'none';
          chatButton.style.display = 'flex';
        });

        // Add hover effect to button
        chatButton.addEventListener('mouseenter', () => {
          chatButton.style.background = 'rgba(255, 255, 255, 0.15)';
          chatButton.style.transform = 'translateY(-2px)';
          chatButton.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
        });

        chatButton.addEventListener('mouseleave', () => {
          chatButton.style.background = 'rgba(255, 255, 255, 0.1)';
          chatButton.style.transform = 'translateY(0)';
          chatButton.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
        });
      }
    }

    // Connect to chat WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const chatUrl = `${protocol}//${window.location.host}/api/game/ws/chat`;
    this.chatSocket = new WebSocket(chatUrl);

    this.chatSocket.onopen = () => {
      console.log('Connected to chat WebSocket');
      this.authenticateChatSocket();
    };

    this.chatSocket.onmessage = (event: MessageEvent) => {
      try {
        // Try to parse as JSON first (for system messages)
        const data = JSON.parse(event.data);
        if (data.type === 'connectionAck') {
          console.log('Chat connection acknowledged:', data.message);
          return;
        }
      } catch (e) {
        // Not JSON, treat as regular chat message
      }
      
      const msg = event.data;
      this.addChatMessage(msg);
    };

    // Handle chat form submit
    const chatForm = document.getElementById('chat-form') as HTMLFormElement;
    if (chatForm) {
      chatForm.onsubmit = (e: Event) => {
        e.preventDefault();
        const input = document.getElementById('chat-input') as HTMLInputElement;
        const authManager = (window as any).authManager;
        const user = authManager?.getCurrentUser();
        const text = input.value.trim();
        if (text && this.chatSocket) {
          const chatMsg = `${user?.username || 'User'}: ${text}`;
          this.chatSocket.send(chatMsg);
          input.value = '';
        }
      };
    }

    // Add focus/blur handlers to chat input to prevent game control conflicts
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    if (chatInput) {
      chatInput.addEventListener('focus', () => {
        // Clear game keys when chat is focused
        this.keys = {};
      });
      
      chatInput.addEventListener('keydown', (e) => {
        // Prevent game controls from being triggered while typing
        e.stopPropagation();
      });
    }
  }
  */
  // End of commented chat functionality

  // Chat message functionality also disabled
  /*
  private addChatMessage(msg: string): void {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      const div = document.createElement('div');
      div.textContent = msg;
      div.style.marginBottom = '6px';
      div.style.padding = '6px 8px';
      div.style.background = 'rgba(255, 255, 255, 0.05)';
      div.style.borderRadius = '6px';
      div.style.color = '#ffffff';
      div.style.fontSize = '12px';
      div.style.lineHeight = '1.3';
      div.style.wordWrap = 'break-word';
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
  */

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Only handle game controls if game canvas is focused or no input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
      
      console.log('🎯 [KEYDOWN] Key pressed:', e.key, 'isPlaying:', this.isPlaying, 'activeElement:', activeElement?.tagName, (activeElement as HTMLElement)?.id);
      console.log('🎯 [KEYDOWN] isInputFocused:', isInputFocused);
      
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
                gameMode: 'arcade',
                aiDifficulty: 'medium',
                ballSpeed: 'medium',
                paddleSpeed: 'medium',
                powerupsEnabled: false,
                accelerateOnHit: false,
                scoreToWin: 3
              };
              
              console.log('🎮 [SETTINGS] Sending game settings to backend:', gameSettings);
              
              this.websocket.send(JSON.stringify({
                type: 'joinGame',
                userId: user.userId,
                username: user.username,
                gameSettings: gameSettings
              }));
            }
          }, 100);
        }
        resolve();
      };

      this.websocket.onmessage = (event: MessageEvent) => {
        this.handleGameMessage(event);
      };

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
        reject(error);
      };
    });
  }

  private handleGameMessage(event: MessageEvent): void {
    try {
      const message: any = JSON.parse(event.data);
      console.log('🎮 [GAME-MSG] Received message:', message);
      
      switch (message.type) {
        case 'connectionAck':
          console.log('Game connection acknowledged:', message.message);
          break;
        case 'waiting':
          console.log('Waiting for opponent:', message.message);
          break;
        case 'gameStart':
          console.log('🎮 [GAME-MSG] Game starting:', message);
          this.startGame(message);
          break;
        case 'gameState':
          console.log('🎮 [GAME-MSG] Game state update:', message);
          this.updateGameFromBackend(message);
          break;
        case 'gameEnd':
          console.log('🎮 [GAME-MSG] Game ended:', message);
          this.endGame(message);
          break;
        default:
          console.log('🎮 [GAME-MSG] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing game message:', error);
    }
  }

  private startGame(gameData: any): void {
    console.log('🎮 [START] Game starting with data:', gameData);
    this.isPlaying = true;
    
    // Update game settings if provided by server
    if (gameData.gameSettings) {
      this.setGameSettings(gameData.gameSettings);
      console.log('🎮 [START] Applied game settings from server:', gameData.gameSettings);
    }
    
    // Show game screen and hide other screens
    const app = (window as any).app;
    if (app && typeof app.showScreen === 'function') {
      app.showScreen('game');
    }
    
    // Hide waiting message and show game
    const waitingMsg = document.getElementById('waiting-message');
    const gameArea = document.getElementById('game-area');
    
    if (waitingMsg) waitingMsg.classList.add('hidden');
    if (gameArea) gameArea.classList.remove('hidden');
    
    // Initialize canvas with standard pong dimensions
    this.initCanvas({
      canvasWidth: 800,
      canvasHeight: 600,
      paddleWidth: 10,
      paddleHeight: 100,
      ballRadius: 5,
      paddleSpeed: this.getPaddleSpeedValue() // Use game settings
    });
    
    // Start input handler
    this.startInputHandler();
    
    console.log('🎮 [START] Game initialization complete, waiting for game state updates');
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

  private startInputHandler(): void {
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
    // Don't update game state if paused
    if (this.isPaused) return;
    
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

  private updateGame(gameState: GameState): void {
    this.gameState = gameState;
    this.render();
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
    
    // Calculate trail length based on speed (longer trail for faster ball)
    const trailLength = Math.floor(normalizedSpeed * 8) + 3;
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
    const rightPlayerName = 'AI Bot'; // or could be from game state
    const leftPlayerLevel = 12; // could be from user data
    const rightPlayerLevel = 15; // could be from AI difficulty
    const targetScore = 8; // could be from game settings

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

    // Center info - "First to X"
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`First to ${targetScore}`, this.canvas.width / 2, 30);

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
    this.isPlaying = false;
    
    if (this.inputInterval) {
      clearInterval(this.inputInterval);
      this.inputInterval = null;
    }
    
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

  private authenticateChatSocket(): void {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    if (!user) return;
    
    if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
      this.chatSocket.send(JSON.stringify({
        type: 'userConnect',
        userId: user.userId,
        username: user.username
      }));
    }
  }

  public onUserAuthenticated(user: User): void {
    console.log('GameManager: User authenticated:', user);
    
    // Authenticate chat socket if it exists
    if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
      console.log('Authenticating existing chat socket');
      this.chatSocket.send(JSON.stringify({
        type: 'userConnect',
        userId: user.userId,
        username: user.username
      }));
    }
    
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
    console.log('GameManager: Starting bot match');
    
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

    // Update UI to show game starting
    const waitingMsg = document.getElementById('waiting-message');
    const gameArea = document.getElementById('game-area');
    
    if (waitingMsg) waitingMsg.classList.remove('hidden');
    
    try {
      // Connect to game server for bot match
      await this.connectToBotGameServer();
    } catch (error) {
      console.error('Failed to start bot match:', error);
      if (waitingMsg) waitingMsg.classList.add('hidden');
      alert('Failed to start bot match. Please try again.');
    }
  }

  private async connectToBotGameServer(): Promise<void> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;
    
    return new Promise((resolve, reject) => {
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

        // Send authentication and request bot match
        if (this.websocket) {
          this.websocket.send(JSON.stringify({
            type: 'userConnect',
            userId: user.userId,
            username: user.username
          }));
          
          // Request bot match with game settings
          setTimeout(() => {
            if (this.websocket) {
              // Get game settings from the app
              const app = (window as any).app;
              const gameSettings = app?.gameSettings || {
                gameMode: 'arcade',
                aiDifficulty: 'easy',
                ballSpeed: 'medium',
                paddleSpeed: 'medium',
                powerupsEnabled: false,
                accelerateOnHit: false,
                scoreToWin: 5
              };
              
              console.log('🎮 [SETTINGS] Sending game settings to backend:', gameSettings);
              
              this.websocket.send(JSON.stringify({
                type: 'joinBotGame',
                userId: user.userId,
                gameSettings: gameSettings
              }));
            }
          }, 100);
        }
        resolve();
      };

      this.websocket.onmessage = (event: MessageEvent) => {
        this.handleGameMessage(event);
      };

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
    this.isPlaying = false;
    this.isPaused = false;
    
    // Close websocket connection
    if (this.websocket) {
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
    
    console.log('Game stopped');
    
    // Navigate back to play config immediately
    const app = (window as any).app;
    if (app && typeof app.showScreen === 'function') {
      app.showScreen('play-config');
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
}

// Global game manager instance
(window as any).gameManager = new GameManager();