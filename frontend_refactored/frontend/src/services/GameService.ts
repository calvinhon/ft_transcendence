import { App } from '../core/App';
import { GameSettings } from '../types';

export class GameService {
    private static instance: GameService;
    private ws: WebSocket | null = null;
    private gameStateCallbacks: ((state: any) => void)[] = [];

    private constructor() { }

    public static getInstance(): GameService {
        if (!GameService.instance) {
            GameService.instance = new GameService();
        }
        return GameService.instance;
    }

    public connect(settings: GameSettings, team1?: any[], team2?: any[]): void {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.ws = new WebSocket(`${protocol}//${host}/api/game/ws`);

        this.ws.onopen = () => {
            console.log('WS Connected');
            // 1. Send user authentication first
            const user = App.getInstance().currentUser;
            if (user) {
                this.ws?.send(JSON.stringify({
                    type: 'userConnect',
                    userId: user.userId,
                    username: user.username
                }));
            }
        };

        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);

            if (msg.type === 'connectionAck') {
                // 2. Once authenticated, join the game
                this.joinGame(settings, team1, team2);
            } else if (msg.type === 'gameState') {
                this.notifyState(msg);
            }
        };

        this.ws.onclose = () => console.log('WS Closed');
    }

    private joinGame(settings: GameSettings, team1?: any[], team2?: any[]): void {
        const user = App.getInstance().currentUser;
        if (!user || !this.ws) return;

        console.log('joining game with mode:', settings.mode);

        if (settings.mode === 'campaign') {
            this.ws.send(JSON.stringify({
                type: 'joinBotGame',
                userId: user.userId,
                username: user.username,
                aiDifficulty: settings.difficulty || 'medium',
                scoreToWin: settings.scoreToWin || 5
            }));
        } else {
            // Arcade / Tournament
            // Default to 1v1 vs CPU if no teams provided
            const t1 = team1 || [{ userId: user.userId, username: user.username, paddleIndex: 0, isBot: false }];
            const t2 = team2 || [{ userId: 0, username: 'CPU', paddleIndex: 0, isBot: true }];

            this.ws.send(JSON.stringify({
                type: 'joinGame',
                userId: user.userId,
                username: user.username,
                gameSettings: {
                    gameMode: settings.mode,
                    scoreToWin: settings.scoreToWin || 5,
                    aiDifficulty: settings.difficulty || 'medium',
                    ballSpeed: settings.ballSpeed || 'medium',
                    paddleSpeed: settings.paddleSpeed || 'medium',
                    powerupsEnabled: settings.powerups || false,
                    accelerateOnHit: settings.accumulateOnHit || false,
                    team1Players: t1,
                    team2Players: t2,
                    team1PlayerCount: t1.length,
                    team2PlayerCount: t2.length
                },
                team1Players: t1, // Keep these for legacy/handler compatibility
                team2Players: t2
            }));
        }
    }

    public sendMove(direction: 'up' | 'down', playerId: number): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'movePaddle',
                direction,
                playerId: playerId
            }));
        }
    }

    public sendInput(input: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'input', ...input }));
        }
    }

    public onGameState(cb: (state: any) => void): void {
        this.gameStateCallbacks.push(cb);
    }

    private notifyState(state: any): void {
        this.gameStateCallbacks.forEach(cb => cb(state));
    }

    public disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.gameStateCallbacks = [];
    }
}
