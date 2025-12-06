import { GameSettings } from '../types';
import { gameCoordinator } from './game/GameCoordinator';

export interface KeyState {
  [key: string]: boolean;
}

export class GameInputHandler {
  private keys: KeyState = {};
  private keyMonitorInterval: number | null = null;
  private inputInterval: number | null = null;
  private websocket: WebSocket | null = null;
  private gameSettings: GameSettings;
  private isPaused: boolean = false;

  // Control schemes for different game modes
  private controlSchemes = {
    coop: {
      up: ['ArrowUp', 'KeyW'],
      down: ['ArrowDown', 'KeyS']
    },
    arcade: {
      team1: {
        player1: { up: ['KeyQ'], down: ['KeyA'] },
        player2: { up: ['KeyW'], down: ['KeyS'] },
        player3: { up: ['KeyE'], down: ['KeyD'] }
      },
      team2: {
        player1: { up: ['KeyU'], down: ['KeyJ'] },
        player2: { up: ['KeyI'], down: ['KeyK'] },
        player3: { up: ['KeyO'], down: ['KeyL'] }
      },
      shared: { up: ['ArrowUp'], down: ['ArrowDown'] }
    }
  };

  constructor(gameSettings: GameSettings) {
    this.gameSettings = gameSettings;
    this.bindEvents();
  }

  private bindEvents(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  private unbindEvents(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // If the user is typing into an input/textarea/contentEditable element,
    // don't process or prevent default for game keys — let the browser handle text input.
    const active = document.activeElement as HTMLElement | null;
    if (active) {
      const tag = active.tagName;
      const isEditable = active.isContentEditable || active.getAttribute('contenteditable') === 'true';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) {
        // Do not intercept typing — don't set game key states or prevent default.
        return;
      }
    }

    // Prevent default for game keys to avoid page scrolling when not typing
    if (this.isGameKey(event.code)) {
      event.preventDefault();
    }

    this.keys[event.code] = true;
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    // Ignore keyup when typing in editable fields
    const active = document.activeElement as HTMLElement | null;
    if (active) {
      const tag = active.tagName;
      const isEditable = active.isContentEditable || active.getAttribute('contenteditable') === 'true';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) {
        return;
      }
    }

    this.keys[event.code] = false;
  };

  private isGameKey(keyCode: string): boolean {
    const gameKeys = [
      // Coop mode
      'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS',
      // Arcade mode
      'KeyQ', 'KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD',
      'KeyU', 'KeyJ', 'KeyI', 'KeyK', 'KeyO', 'KeyL',
      // Pause
      'Space', 'KeyP'
    ];
    return gameKeys.includes(keyCode);
  }

  public setWebSocket(websocket: WebSocket | null): void {
    this.websocket = websocket;
  }

  public setGameSettings(settings: GameSettings): void {
    this.gameSettings = settings;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public startInputHandling(): void {
    this.stopInputHandling(); // Clear any existing intervals

    // Start key monitoring for pause functionality
    this.keyMonitorInterval = window.setInterval(() => {
      this.monitorKeys();
    }, 100);

    // Start input sending to server
    this.inputInterval = window.setInterval(() => {
      this.sendInputToServer();
    }, 16); // ~60fps
  }

  public stopInputHandling(): void {
    if (this.keyMonitorInterval) {
      clearInterval(this.keyMonitorInterval);
      this.keyMonitorInterval = null;
    }

    if (this.inputInterval) {
      clearInterval(this.inputInterval);
      this.inputInterval = null;
    }

    // Clear all keys
    this.keys = {};
  }

  private monitorKeys(): void {
    // Handle pause key
    if (this.keys['Space'] || this.keys['KeyP']) {
      // Only trigger pause once per key press
      if (!this.isPaused) {
        this.handlePauseKey();
      }
    }
  }

  private handlePauseKey(): void {
    // This will be handled by the GameCoordinator singleton
    if (gameCoordinator && typeof gameCoordinator.pauseGame === 'function') {
      gameCoordinator.pauseGame();
    }
  }

  private sendInputToServer(): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN || this.isPaused) {
      return;
    }

    const inputData = this.getCurrentInput();
    if (Object.keys(inputData).length > 0) {
      this.websocket.send(JSON.stringify({
        type: 'input',
        ...inputData
      }));
    }
  }

  private getCurrentInput(): any {
    const input: any = {};

    switch (this.gameSettings.gameMode) {
      case 'coop':
        input.up = this.isKeyPressed(this.controlSchemes.coop.up);
        input.down = this.isKeyPressed(this.controlSchemes.coop.down);
        break;

      case 'arcade':
        // Team 1 inputs
        input.team1 = {
          player1: {
            up: this.keys['KeyQ'],
            down: this.keys['KeyA']
          },
          player2: {
            up: this.keys['KeyW'],
            down: this.keys['KeyS']
          },
          player3: {
            up: this.keys['KeyE'],
            down: this.keys['KeyD']
          }
        };

        // Team 2 inputs
        input.team2 = {
          player1: {
            up: this.keys['KeyU'],
            down: this.keys['KeyJ']
          },
          player2: {
            up: this.keys['KeyI'],
            down: this.keys['KeyK']
          },
          player3: {
            up: this.keys['KeyO'],
            down: this.keys['KeyL']
          }
        };

        // Shared controls (arrow keys)
        input.shared = {
          up: this.keys['ArrowUp'],
          down: this.keys['ArrowDown']
        };
        break;

      case 'tournament':
        // Tournament mode uses coop controls
        input.up = this.isKeyPressed(this.controlSchemes.coop.up);
        input.down = this.isKeyPressed(this.controlSchemes.coop.down);
        break;
    }

    return input;
  }

  private isKeyPressed(keyCodes: string[]): boolean {
    return keyCodes.some(code => this.keys[code]);
  }

  public getKeyState(): KeyState {
    return { ...this.keys };
  }

  public clearKeys(): void {
    this.keys = {};
  }

  public handleKeyboardEvent(event: KeyboardEvent, isKeyDown: boolean): void {
    if (isKeyDown) {
      this.handleKeyDown(event);
    } else {
      this.handleKeyUp(event);
    }
  }

  public destroy(): void {
    this.unbindEvents();
    this.stopInputHandling();
  }
}