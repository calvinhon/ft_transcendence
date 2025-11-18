// Input handler for different game modes
// Handles keyboard input and sends paddle movement commands

interface KeyState {
  [key: string]: boolean;
}

interface InputHandlerCallbacks {
  sendMessage: (message: any) => void;
  getTeamPlayers: () => { team1: any[], team2: any[] };
}

export class InputHandler {
  private keys: KeyState = {};
  private lastKeyPressTime: { [key: string]: number } = {};
  private callbacks: InputHandlerCallbacks;
  private arcadeInputWarningShown: boolean = false;
  
  constructor(callbacks: InputHandlerCallbacks) {
    this.callbacks = callbacks;
    this.setupKeyboardListeners();
  }
  
  private setupKeyboardListeners(): void {
    // Key down handler
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const gameKeys = [
        'w', 's', 'q', 'a', 'e', 'd',  // Team 1 keys
        'u', 'j', 'i', 'k', 'o', 'l',  // Team 2 keys
        'arrowup', 'arrowdown', 'arrowleft', 'arrowright'  // Arrow keys
      ];
      
      if (gameKeys.includes(key)) {
        e.preventDefault();
        this.keys[key] = true;
        this.keys[e.key] = true; // Also store with original case
        this.lastKeyPressTime[key] = Date.now();
        this.lastKeyPressTime[e.key] = Date.now();
      }
    });
    
    // Key up handler
    document.addEventListener('keyup', (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      this.keys[key] = false;
      this.keys[e.key] = false;
      delete this.lastKeyPressTime[key];
      delete this.lastKeyPressTime[e.key];
    });
    
    // Clear all keys on window blur
    window.addEventListener('blur', () => {
      for (const key in this.keys) {
        this.keys[key] = false;
      }
      this.lastKeyPressTime = {};
    });
  }
  
  // Co-op/Campaign mode: Single player controls
  public handleCoopInputs(): void {
    const upPressed = this.keys['w'] || this.keys['arrowup'] || this.keys['ArrowUp'];
    const downPressed = this.keys['s'] || this.keys['arrowdown'] || this.keys['ArrowDown'];
    
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
      
      this.callbacks.sendMessage({
        type: 'movePaddle',
        direction: downTime > upTime ? 'down' : 'up'
      });
    } else if (upPressed) {
      this.callbacks.sendMessage({
        type: 'movePaddle',
        direction: 'up'
      });
    } else if (downPressed) {
      this.callbacks.sendMessage({
        type: 'movePaddle',
        direction: 'down'
      });
    }
  }
  
  // Tournament mode: Local multiplayer - two players on same keyboard
  public handleTournamentInputs(): void {
    // Player 1 (left paddle) - W/S or Arrow keys
    const p1UpPressed = this.keys['w'] || this.keys['W'] || this.keys['arrowup'] || this.keys['ArrowUp'];
    const p1DownPressed = this.keys['s'] || this.keys['S'] || this.keys['arrowdown'] || this.keys['ArrowDown'];
    
    if (p1UpPressed && p1DownPressed) {
      const upTime = Math.max(
        this.lastKeyPressTime['w'] || 0,
        this.lastKeyPressTime['W'] || 0,
        this.lastKeyPressTime['arrowup'] || 0,
        this.lastKeyPressTime['ArrowUp'] || 0
      );
      const downTime = Math.max(
        this.lastKeyPressTime['s'] || 0,
        this.lastKeyPressTime['S'] || 0,
        this.lastKeyPressTime['arrowdown'] || 0,
        this.lastKeyPressTime['ArrowDown'] || 0
      );
      
      this.callbacks.sendMessage({
        type: 'movePaddle',
        direction: downTime > upTime ? 'down' : 'up'
      });
    } else if (p1UpPressed) {
      this.callbacks.sendMessage({
        type: 'movePaddle',
        direction: 'up'
      });
    } else if (p1DownPressed) {
      this.callbacks.sendMessage({
        type: 'movePaddle',
        direction: 'down'
      });
    }
    
    // Player 2 (right paddle) - U/J keys
    const p2UpPressed = this.keys['u'] || this.keys['U'];
    const p2DownPressed = this.keys['j'] || this.keys['J'];
    
    if (p2UpPressed && p2DownPressed) {
      const upTime = this.lastKeyPressTime['u'] || this.lastKeyPressTime['U'] || 0;
      const downTime = this.lastKeyPressTime['j'] || this.lastKeyPressTime['J'] || 0;
      
      this.callbacks.sendMessage({
        type: 'movePaddle',
        playerId: 2,
        direction: downTime > upTime ? 'down' : 'up'
      });
    } else if (p2UpPressed) {
      this.callbacks.sendMessage({
        type: 'movePaddle',
        playerId: 2,
        direction: 'up'
      });
    } else if (p2DownPressed) {
      this.callbacks.sendMessage({
        type: 'movePaddle',
        playerId: 2,
        direction: 'down'
      });
    }
  }
  
  // Arcade mode: Multiple players with team-based controls
  public handleArcadeInputs(): void {
    const { team1, team2 } = this.callbacks.getTeamPlayers();
    
    if (team1.length === 0 && team2.length === 0) {
      if (!this.arcadeInputWarningShown) {
        console.error('🎮 [ARCADE-INPUT] ❌ NO PLAYERS IN EITHER TEAM!');
        this.arcadeInputWarningShown = true;
      }
      return;
    }
    
    // Team key mappings
    const team1Keys = [
      { up: 'q', down: 'a' },  // Player 1
      { up: 'w', down: 's' },  // Player 2
      { up: 'e', down: 'd' }   // Player 3
    ];
    
    const team2Keys = [
      { up: 'u', down: 'j' },  // Player 1
      { up: 'i', down: 'k' },  // Player 2
      { up: 'o', down: 'l' }   // Player 3
    ];
    
    // Handle Team 1 inputs
    let team1Direction: 'up' | 'down' | null = null;
    let team1PaddleIndex = 0;
    
    // Check Arrow keys as alternative (controls first paddle)
    const arrowUpPressed = this.keys['arrowup'] || this.keys['ArrowUp'];
    const arrowDownPressed = this.keys['arrowdown'] || this.keys['ArrowDown'];
    
    if (arrowUpPressed && !arrowDownPressed && team1.length > 0) {
      team1Direction = 'up';
      team1PaddleIndex = 0;
    } else if (arrowDownPressed && !arrowUpPressed && team1.length > 0) {
      team1Direction = 'down';
      team1PaddleIndex = 0;
    } else {
      // Check team-specific keys
      for (let i = 0; i < team1.length && i < 3; i++) {
        const keyMap = team1Keys[i];
        const upPressed = this.keys[keyMap.up] || this.keys[keyMap.up.toUpperCase()];
        const downPressed = this.keys[keyMap.down] || this.keys[keyMap.down.toUpperCase()];
        
        if (upPressed && !downPressed) {
          team1Direction = 'up';
          team1PaddleIndex = i;
          break;
        } else if (downPressed && !upPressed) {
          team1Direction = 'down';
          team1PaddleIndex = i;
          break;
        }
      }
    }
    
    if (team1Direction) {
      this.callbacks.sendMessage({
        type: 'movePaddle',
        playerId: 1, // Team 1 / Left side
        paddleIndex: team1PaddleIndex,
        direction: team1Direction
      });
    }
    
    // Handle Team 2 inputs
    let team2Direction: 'up' | 'down' | null = null;
    let team2PaddleIndex = 0;
    
    for (let i = 0; i < team2.length && i < 3; i++) {
      const keyMap = team2Keys[i];
      const upPressed = this.keys[keyMap.up] || this.keys[keyMap.up.toUpperCase()];
      const downPressed = this.keys[keyMap.down] || this.keys[keyMap.down.toUpperCase()];
      
      if (upPressed && !downPressed) {
        team2Direction = 'up';
        team2PaddleIndex = i;
        break;
      } else if (downPressed && !upPressed) {
        team2Direction = 'down';
        team2PaddleIndex = i;
        break;
      }
    }
    
    if (team2Direction) {
      this.callbacks.sendMessage({
        type: 'movePaddle',
        playerId: 2, // Team 2 / Right side
        paddleIndex: team2PaddleIndex,
        direction: team2Direction
      });
    }
  }
  
  public cleanup(): void {
    // Clear all key states
    for (const key in this.keys) {
      this.keys[key] = false;
    }
    this.lastKeyPressTime = {};
  }
}
