import WebSocket from 'ws';
import EventEmitter from 'events';

interface GameState {
  type: 'gameState';
  ball: { x: number; y: number; dx: number; dy: number };
  paddles: {
    player1: { x: number; y: number };
    player2: { x: number; y: number };
  };
  scores: {
    player1: number;
    player2: number;
  };
  gameState: 'countdown' | 'playing' | 'finished';
  countdownValue?: number;
}

interface GameStartMessage {
  type: 'gameStarted';
  gameId: string;
  player1: { userId: number; username: string };
  player2: { userId: number; username: string };
  isBot?: boolean;
}

interface GameEndMessage {
  type: 'gameFinished';
  winner: string;
  player1Score: number;
  player2Score: number;
}

export class WebSocketGameClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private userId: number;
  private username: string;
  private token: string;
  private gameId: string | null = null;

  constructor(userId: number, username: string, token: string) {
    super();
    this.userId = userId;
    this.username = username;
    this.token = token;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Connect to game service through nginx gateway
        this.ws = new WebSocket('ws://localhost/api/game/ws', {
          headers: {
            'Cookie': `token=${this.token}`
          }
        });

        this.ws.on('open', () => {
          // Send userConnect message
          this.send({
            type: 'userConnect',
            userId: this.userId,
            username: this.username
          });
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        });

        this.ws.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', () => {
          this.emit('close');
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'connectionAck':
        this.emit('connected', message.message);
        break;
      case 'gameStart':
      case 'gameStarted':
        // Handle both message formats
        this.gameId = message.gameId?.toString() || message.gameId;
        const gameStartData = {
          type: 'gameStarted' as const,
          gameId: this.gameId,
          player1: message.players?.player1 || message.player1,
          player2: message.players?.player2 || message.player2,
          isBot: message.players?.player2?.userId === 0 || message.player2?.userId === 0
        };
        this.emit('gameStarted', gameStartData);
        break;
      case 'gameState':
        this.emit('gameState', message as GameState);
        break;
      case 'gameEnd':
      case 'gameFinished':
        // Parse the game end message
        const gameEndData = {
          type: 'gameFinished' as const,
          winner: message.winner?.toString() || message.winner,
          player1Score: message.scores?.player1 || 0,
          player2Score: message.scores?.player2 || 0
        };
        this.emit('gameFinished', gameEndData);
        break;
      case 'error':
        this.emit('error', new Error(message.message || 'Game error'));
        break;
      case 'waiting':
        this.emit('waiting', message.message);
        break;
      default:
        // Silently ignore unknown message types
        break;
    }
  }

  joinBotGame(difficulty: string = 'medium'): void {
    this.send({
      type: 'joinBotGame',
      userId: this.userId,
      username: this.username,
      gameSettings: {
        gameMode: 'arcade',
        aiDifficulty: difficulty,
        ballSpeed: 'medium',
        paddleSpeed: 'medium',
        powerupsEnabled: false,
        accelerateOnHit: false,
        scoreToWin: 5,
        team1PlayerCount: 1,
        team2PlayerCount: 1
      }
    });
  }

  joinMatchmaking(): void {
    this.send({
      type: 'joinGame',
      userId: this.userId,
      username: this.username
    });
  }

  movePaddle(direction: 'up' | 'down'): void {
    this.send({
      type: 'movePaddle',
      direction: direction
    });
  }

  sendInput(key: string, pressed: boolean): void {
    this.send({
      type: 'input',
      key: key,
      pressed: pressed
    });
  }

  pauseGame(): void {
    this.send({
      type: 'pause'
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.send({
        type: 'disconnect'
      });
      this.ws.close();
      this.ws = null;
    }
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getGameId(): string | null {
    return this.gameId;
  }
}
