// frontend/src/game-network.ts
// Game networking and WebSocket handling

import { GameMessage, GameSettings, TournamentMatch } from './game-interfaces.js';
import { WebSocketClient } from './game/WebSocketClient.js';

export class GameNetworkHandler {
  private wsClient: WebSocketClient | null = null;
  private websocket: WebSocket | null = null;
  private boundHandleGameMessage: ((event: MessageEvent) => void) | null = null;
  private onMessageCallback: ((data: any) => void) | null = null;

  constructor(onMessageCallback?: (data: any) => void) {
    this.onMessageCallback = onMessageCallback || null;
  }

  public async connectToGameServer(): Promise<void> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/game/ws`;

    return new Promise((resolve, reject) => {
      // Close any existing websocket clients
      if (this.wsClient) {
        this.wsClient.close();
        this.wsClient = null;
      }

      // Also close old websocket for backward compatibility
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

      // Create new WebSocketClient
      this.wsClient = new WebSocketClient({
        onOpen: () => {
          console.log('Connected to game server');
          resolve();
        },

        onMessage: (data: any) => {
          // Route to callback if provided
          if (this.onMessageCallback) {
            this.onMessageCallback(data);
          }
        },

        onClose: () => {
          console.log('Game server connection closed');
        },

        onError: (error) => {
          console.error('Game server connection error:', error);
          reject(error);
        }
      });

      // Connect to server
      this.wsClient.connect(wsUrl);

      // Keep reference to old websocket for backward compatibility
      this.websocket = this.wsClient.getWebSocket();
    });
  }

  public sendMessage(message: GameMessage): void {
    if (this.wsClient?.isConnected()) {
      this.wsClient.send(message);
    } else if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      // Fallback to old websocket if wsClient not ready
      this.websocket.send(JSON.stringify(message));
    }
  }

  public authenticate(userId: number, username: string): void {
    this.sendMessage({
      type: 'userConnect',
      userId,
      username
    });
  }

  public joinBotGame(userId: number, username: string, gameSettings: GameSettings, tournamentMatch?: TournamentMatch): void {
    const message: any = {
      type: 'joinBotGame',
      userId,
      username,
      gameSettings
    };

    // Add tournament player info for local multiplayer
    if (tournamentMatch) {
      message.player2Id = tournamentMatch.player2Id;
      message.player2Name = tournamentMatch.player2Name;
      message.tournamentId = tournamentMatch.tournamentId;
      message.tournamentMatchId = tournamentMatch.matchId;
    }

    this.sendMessage(message);
  }

  public movePaddle(direction: 'up' | 'down', playerId?: number, paddleIndex?: number): void {
    const message: any = {
      type: 'movePaddle',
      direction
    };

    if (playerId !== undefined) {
      message.playerId = playerId;
    }

    if (paddleIndex !== undefined) {
      message.paddleIndex = paddleIndex;
    }

    this.sendMessage(message);
  }

  public pauseGame(paused: boolean): void {
    this.sendMessage({
      type: 'pause',
      paused
    });
  }

  public isConnected(): boolean {
    return this.wsClient?.isConnected() ||
           (this.websocket?.readyState === WebSocket.OPEN);
  }

  public disconnect(): void {
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }

    if (this.websocket) {
      try {
        this.websocket.onmessage = null as any;
        this.websocket.onopen = null as any;
        this.websocket.onclose = null as any;
        this.websocket.onerror = null as any;
        this.websocket.close();
      } catch (e) {
        console.warn('Error closing websocket in disconnect', e);
      }
      this.websocket = null;
    }
  }
}