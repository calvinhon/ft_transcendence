// frontend/src/game-input.ts
// Game input handling

import { KeyState, GameSettings } from './game-interfaces.js';

export class GameInputHandler {
  private keys: KeyState = {};
  private lastKeyPressTime: { [key: string]: number } = {};
  private inputInterval: number | null = null;
  private keyMonitorInterval: number | null = null;

  constructor() {
    this.setupEventListeners();
    this.startKeyMonitor();
  }

  private setupEventListeners(): void {
    // Use window-level key listeners with capture phase to ensure we always get events
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleKeyDown(e);
    }, true);

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.handleKeyUp(e);
    }, true);

    // Add visibility change listener to clear keys when tab loses focus
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clearAllKeys();
      }
    });

    // Add blur listener to window to catch when window loses focus
    window.addEventListener('blur', () => {
      this.clearAllKeys();
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Only handle game controls if game canvas is focused or no input is focused
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

    if (!isInputFocused) {
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
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    // Only handle game controls if no input is focused
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

    if (!isInputFocused) {
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
      }
    }
  }

  private startKeyMonitor(): void {
    this.keyMonitorInterval = window.setInterval(() => {
      this.monitorStuckKeys();
    }, 10000); // Check every 10 seconds
  }

  private monitorStuckKeys(): void {
    const now = Date.now();
    const stuckThreshold = 10000; // 10 seconds

    for (const key in this.lastKeyPressTime) {
      if (this.keys[key] === true && now - this.lastKeyPressTime[key] > stuckThreshold) {
        console.warn(`[KEYBOARD] Stuck key detected: ${key}, clearing...`);
        this.keys[key] = false;
        delete this.lastKeyPressTime[key];
      }
    }
  }

  public clearAllKeys(): void {
    for (const key in this.keys) {
      this.keys[key] = false;
    }
    this.lastKeyPressTime = {};
  }

  public getKeys(): KeyState {
    return { ...this.keys };
  }

  public getLastKeyPressTime(): { [key: string]: number } {
    return { ...this.lastKeyPressTime };
  }

  public isKeyPressed(key: string): boolean {
    return this.keys[key.toLowerCase()] === true || this.keys[key] === true;
  }

  public getCoopInput(): 'up' | 'down' | null {
    const upPressed = this.isKeyPressed('w') || this.isKeyPressed('arrowup') || this.isKeyPressed('ArrowUp');
    const downPressed = this.isKeyPressed('s') || this.isKeyPressed('arrowdown') || this.isKeyPressed('ArrowDown');

    if (upPressed && downPressed) {
      const upTime = this.lastKeyPressTime['w'] || this.lastKeyPressTime['arrowup'] || this.lastKeyPressTime['ArrowUp'] || 0;
      const downTime = this.lastKeyPressTime['s'] || this.lastKeyPressTime['arrowdown'] || this.lastKeyPressTime['ArrowDown'] || 0;
      return downTime > upTime ? 'down' : 'up';
    } else if (upPressed) {
      return 'up';
    } else if (downPressed) {
      return 'down';
    }
    return null;
  }

  public getTournamentInput(): { player1: 'up' | 'down' | null, player2: 'up' | 'down' | null } {
    // Player 1 (left): W/S or Arrow keys
    const p1UpPressed = this.isKeyPressed('w') || this.isKeyPressed('W') || this.isKeyPressed('arrowup') || this.isKeyPressed('ArrowUp');
    const p1DownPressed = this.isKeyPressed('s') || this.isKeyPressed('S') || this.isKeyPressed('arrowdown') || this.isKeyPressed('ArrowDown');

    let player1: 'up' | 'down' | null = null;
    if (p1UpPressed && !p1DownPressed) {
      player1 = 'up';
    } else if (p1DownPressed && !p1UpPressed) {
      player1 = 'down';
    }

    // Player 2 (right): U/J keys
    const p2UpPressed = this.isKeyPressed('u') || this.isKeyPressed('U');
    const p2DownPressed = this.isKeyPressed('j') || this.isKeyPressed('J');

    let player2: 'up' | 'down' | null = null;
    if (p2UpPressed && !p2DownPressed) {
      player2 = 'up';
    } else if (p2DownPressed && !p2UpPressed) {
      player2 = 'down';
    }

    return { player1, player2 };
  }

  public destroy(): void {
    if (this.inputInterval) {
      clearInterval(this.inputInterval);
      this.inputInterval = null;
    }
    if (this.keyMonitorInterval) {
      clearInterval(this.keyMonitorInterval);
      this.keyMonitorInterval = null;
    }
    this.clearAllKeys();
  }
}