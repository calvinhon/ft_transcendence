import { GameSettings } from '../types';
import { logger } from '../utils/Logger';
import { settingsManager } from './SettingsManager';

export interface TournamentMatch {
  tournamentId: string;
  matchId: string;
  player1Id: number;
  player1Name: string;
  player2Id: number;
  player2Name: string;
  originalPlayer1Id?: number;
  originalPlayer2Id?: number;
}

export class GameNetworkManager {
  private websocket: WebSocket | null = null;
  private gameSettings: GameSettings;
  private boundHandleGameMessage: ((event: MessageEvent) => void) | null = null;
  private onGameStateUpdate?: (gameState: any) => void;
  private onGameEnd?: (gameData: any) => void;
  private onConnectionAck?: () => void;
  private team1Players: any[] = [];
  private team2Players: any[] = [];
  private tournamentMatch?: TournamentMatch;

  constructor(gameSettings: GameSettings) {
    this.gameSettings = gameSettings;
  }

  public setGameSettings(settings: GameSettings): void {
    this.gameSettings = settings;
  }

  public setEventHandlers(handlers: {
    onGameStateUpdate?: (gameState: any) => void;
    onGameEnd?: (gameData: any) => void;
    onConnectionAck?: () => void;
  }): void {
    this.onGameStateUpdate = handlers.onGameStateUpdate;
    this.onGameEnd = handlers.onGameEnd;
    this.onConnectionAck = handlers.onConnectionAck;
  }

  public async connectToArcadeGame(
    user: any,
    team1Players: any[],
    team2Players: any[],
    tournamentMatch?: TournamentMatch
  ): Promise<void> {
    // Store players for later use
    this.team1Players = team1Players;
    this.team2Players = team2Players;
    this.tournamentMatch = tournamentMatch;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;

    return new Promise((resolve, reject) => {
      this.closeExistingConnection();

      this.websocket = new WebSocket(wsUrl);
      this.setupMessageHandler();

      this.websocket.onopen = () => {
        console.log('🕹️ [ARCADE] Connected to game server');

        // Send user authentication
        if (this.websocket) {
          this.websocket.send(JSON.stringify({
            type: 'userConnect',
            userId: user.userId,
            username: user.username
          }));
        }
        resolve();
      };

      this.websocket.onclose = () => {
        console.log('🕹️ [ARCADE] Game server connection closed');
      };

      this.websocket.onerror = (error) => {
        logger.error('GameNetworkManager', 'WebSocket error during arcade connection', error);
        reject(error);
      };
    });
  }

  public async connectToBotGame(user: any): Promise<void> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;

    return new Promise((resolve, reject) => {
      this.closeExistingConnection();

      this.websocket = new WebSocket(wsUrl);
      this.setupMessageHandler();

      this.websocket.onopen = () => {
        console.log('🤖 Connected to game server for bot match');

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

      this.websocket.onclose = () => {
        console.log('🤖 Bot game server connection closed');
      };

      this.websocket.onerror = (error) => {
        logger.error('GameNetworkManager', 'Bot game server connection error', error);
        reject(error);
      };
    });
  }

  public async connectToCampaignGame(user: any): Promise<void> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;

    return new Promise((resolve, reject) => {
      this.closeExistingConnection();

      this.websocket = new WebSocket(wsUrl);
      this.setupMessageHandler();

      this.websocket.onopen = () => {
        console.log('🎯 [CAMPAIGN] Connected to game server for campaign match');

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

      this.websocket.onclose = () => {
        console.log('🎯 [CAMPAIGN] Campaign game server connection closed');
      };

      this.websocket.onerror = (error) => {
        logger.error('GameNetworkManager', 'Campaign game server connection error', error);
        reject(error);
      };
    });
  }

  private setupMessageHandler(): void {
    this.boundHandleGameMessage = this.handleGameMessage.bind(this);
    if (this.websocket && this.boundHandleGameMessage) {
      this.websocket.onmessage = this.boundHandleGameMessage;
    }
  }

  private handleGameMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'connectionAck':
          console.log('📡 Connection acknowledged');
          
          // Send join message based on game mode
          if (this.gameSettings.gameMode === 'coop' && this.websocket) {
            this.websocket.send(JSON.stringify({
              type: 'joinBotGame',
              aiDifficulty: this.gameSettings.aiDifficulty,
              ballSpeed: this.gameSettings.ballSpeed,
              paddleSpeed: this.gameSettings.paddleSpeed,
              powerupsEnabled: this.gameSettings.powerupsEnabled,
              accelerateOnHit: this.gameSettings.accelerateOnHit,
              scoreToWin: this.gameSettings.scoreToWin
            }));
          } else if (this.gameSettings.gameMode === 'arcade' && this.websocket) {
            this.websocket.send(JSON.stringify({
              type: 'joinGame',
              team1Players: this.team1Players,
              team2Players: this.team2Players,
              tournamentId: this.tournamentMatch?.tournamentId,
              tournamentMatchId: this.tournamentMatch?.matchId,
              gameSettings: this.gameSettings
            }));
          }
          
          this.onConnectionAck?.();
          break;

        case 'gameStart':
          console.log('🎮 Game started:', message);
          break;

        case 'gameState':
          this.onGameStateUpdate?.(message.gameState);
          break;

        case 'gameEnd':
          console.log('🏁 Game ended:', message);
          this.onGameEnd?.(message);
          break;

        case 'pause':
          console.log('⏸️ Game paused/resumed:', message.paused);
          break;

        default:
          console.log('📨 Unknown message type:', message.type, message);
      }
    } catch (error) {
      logger.error('GameNetworkManager', 'Error parsing game message', error);
    }
  }

  public sendArcadeMatchRequest(
    user: any,
    team1Players: any[],
    team2Players: any[],
    tournamentMatch?: TournamentMatch
  ): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      logger.error('GameNetworkManager', 'Cannot send arcade request: WebSocket not connected');
      return;
    }

    // Get all game settings
    const gameSettings = (settingsManager && typeof settingsManager.getSettings === 'function')
      ? settingsManager.getSettings()
      : this.gameSettings;

    // Determine team player counts
    let team1Count, team2Count;
    if (gameSettings.gameMode === 'tournament') {
      team1Count = 1;
      team2Count = 1;
      console.log('🏆 [TOURNAMENT] Forcing 1v1 paddle setup for tournament mode');
    } else {
      team1Count = Math.max(1, team1Players.length);
      team2Count = Math.max(1, team2Players.length);
    }

    // Determine AI difficulty
    const aiDifficulty = gameSettings.aiDifficulty || 'medium';

    // Send arcade match request
    const arcadeRequest: any = {
      type: 'userConnect',
      userId: user.userId,
      username: user.username,
      gameMode: gameSettings.gameMode || 'arcade',
      aiDifficulty,
      ballSpeed: gameSettings.ballSpeed || 'medium',
      paddleSpeed: gameSettings.paddleSpeed || 'medium',
      powerupsEnabled: gameSettings.powerupsEnabled || false,
      accelerateOnHit: gameSettings.accelerateOnHit || false,
      scoreToWin: gameSettings.scoreToWin || 5,
      team1PlayerCount: team1Count,
      team2PlayerCount: team2Count,
      team1Players: team1Players.map((p, index) => ({
        userId: p.userId,
        username: p.username,
        paddleIndex: index,
        isBot: p.userId === 0
      })),
      team2Players: team2Players.map((p, index) => ({
        userId: p.userId,
        username: p.username,
        paddleIndex: index,
        isBot: p.userId === 0
      }))
    };

    // Add tournament information if applicable
    if (tournamentMatch) {
      arcadeRequest.userId = tournamentMatch.player1Id;
      arcadeRequest.username = tournamentMatch.player1Name;
      arcadeRequest.tournamentId = tournamentMatch.tournamentId;
      arcadeRequest.tournamentMatchId = tournamentMatch.matchId;
      arcadeRequest.player2Id = tournamentMatch.player2Id;
      arcadeRequest.player2Name = tournamentMatch.player2Name;
      console.log('🏆 [TOURNAMENT] Fixed player mapping for game creation:', {
        gamePlayer1: arcadeRequest.userId,
        gamePlayer2: arcadeRequest.player2Id,
        tournamentId: arcadeRequest.tournamentId,
        matchId: arcadeRequest.tournamentMatchId
      });
    }

    console.log('🕹️ [ARCADE] Sending match request with full player info:', arcadeRequest);
    this.websocket.send(JSON.stringify(arcadeRequest));
  }

  public sendPauseCommand(paused: boolean): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'pause',
        paused
      }));
    }
  }

  public closeConnection(): void {
    this.closeExistingConnection();
  }

  private closeExistingConnection(): void {
    if (this.websocket) {
      try {
        this.websocket.onmessage = null;
        this.websocket.onopen = null;
        this.websocket.onclose = null;
        this.websocket.onerror = null;
        this.websocket.close();
      } catch (e) {
        console.warn('Error closing existing websocket', e);
      }
      this.websocket = null;
    }
  }

  public getWebSocket(): WebSocket | null {
    return this.websocket;
  }

  public isConnected(): boolean {
    return this.websocket !== null && this.websocket.readyState === WebSocket.OPEN;
  }

  public destroy(): void {
    this.closeExistingConnection();
    this.boundHandleGameMessage = null;
    this.onGameStateUpdate = undefined;
    this.onGameEnd = undefined;
    this.onConnectionAck = undefined;
  }
}