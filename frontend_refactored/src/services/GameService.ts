import { App } from '../core/App';
import { GameSettings } from '../types';

export class GameService {
    private static instance: GameService;
    private ws: WebSocket | null = null;
    private gameStateCallbacks: ((state: any) => void)[] = [];
    private gameSettings: GameSettings | null = null;

    // Input State
    private keys: { [key: string]: boolean } = {};
    private inputInterval: any = null;
    private lastKeyPressTime: { [key: string]: number } = {};

    private constructor() { }

    public static getInstance(): GameService {
        if (!GameService.instance) {
            GameService.instance = new GameService();
        }
        return GameService.instance;
    }

    public async connect(settings: GameSettings, team1?: any[], team2?: any[]): Promise<void> {
        this.gameSettings = settings;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/game/ws`;

        return new Promise((resolve, reject) => {
            if (this.ws) {
                this.ws.close();
            }

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WS Connected');
                const user = App.getInstance().currentUser;
                if (user) {
                    this.ws?.send(JSON.stringify({
                        type: 'userConnect',
                        userId: user.userId,
                        username: user.username
                    }));
                }
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this.handleMessage(msg, settings, team1, team2);
                } catch (e) {
                    console.error("Failed to parse game message", e);
                }
            };

            this.ws.onclose = () => console.log('WS Closed');
            this.ws.onerror = (err) => {
                console.error('WS Error', err);
                reject(err);
            };
        });
    }

    private handleMessage(msg: any, settings: GameSettings, team1?: any[], team2?: any[]): void {
        if (msg.type === 'connectionAck') {
            this.joinGame(settings, team1, team2);
        } else if (msg.type === 'gameState') {
            this.notifyState(msg);
        } else if (msg.type === 'gameEnd') {
            this.notifyState(msg); // Pass end message to UI
            this.stopInputHandler();
        } else if (msg.type === 'gameStart') {
            this.startInputHandler();
        }
    }

    private joinGame(settings: GameSettings, team1?: any[], team2?: any[]): void {
        const user = App.getInstance().currentUser;
        if (!user || !this.ws) return;

        console.log('joining game with mode:', settings.mode);

        if (settings.mode === 'campaign') {
            // Ideally setup is passed in.
            // Using logic from legacy:
            this.ws.send(JSON.stringify({
                type: 'joinBotGame',
                userId: user.userId,
                username: user.username,
                aiDifficulty: settings.difficulty || 'medium', // Campaign level logic should vary this?
                scoreToWin: settings.scoreToWin || 5
            }));
        } else {
            // Arcade / Tournament
            const t1 = team1 || [{ userId: user.userId, username: user.username, paddleIndex: 0, isBot: false }];
            const t2 = team2 || [{ userId: 0, username: 'CPU', paddleIndex: 0, isBot: true }];

            // Tournament specific adjustments
            if (settings.mode === 'tournament') {
                // Ensure 1v1 paddle config matches legacy logic
                t1.length = 1;
                t2.length = 1;
                // Note: The backend might also enforce this, but we do it client-side too
                console.log('Enforcing 1v1 for tournament mode');
            }

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
                team1Players: t1,
                team2Players: t2,
                // Pass tournament metadata if needed (simplified for now)
            }));
        }
    }

    // ==========================================
    // Input Handling
    // ==========================================

    public handleKeyDown(key: string): void {
        this.keys[key.toLowerCase()] = true;
        this.lastKeyPressTime[key.toLowerCase()] = Date.now();
        // Also track original case if needed, but lowercase is safer
        this.keys[key] = true;
    }

    public handleKeyUp(key: string): void {
        this.keys[key.toLowerCase()] = false;
        this.keys[key] = false;
    }

    private startInputHandler(): void {
        this.stopInputHandler();
        this.inputInterval = setInterval(() => {
            if (!this.gameSettings) return;

            switch (this.gameSettings.mode) {
                case 'tournament':
                    this.handleTournamentInputs();
                    break;
                case 'arcade':
                    this.handleArcadeInputs();
                    break;
                case 'campaign':
                default:
                    this.handleCoopInputs(); // Campaign uses same as Coop (Single player vs AI)
                    break;
            }
        }, 16); // 60hz
    }

    private stopInputHandler(): void {
        if (this.inputInterval) {
            clearInterval(this.inputInterval);
            this.inputInterval = null;
        }
    }

    private handleCoopInputs(): void {
        const up = this.keys['w'] || this.keys['arrowup'];
        const down = this.keys['s'] || this.keys['arrowdown'];

        if (up && down) {
            // compare timestamps
            const upT = Math.max(this.lastKeyPressTime['w'] || 0, this.lastKeyPressTime['arrowup'] || 0);
            const downT = Math.max(this.lastKeyPressTime['s'] || 0, this.lastKeyPressTime['arrowdown'] || 0);
            this.sendMove(downT > upT ? 'down' : 'up');
        } else if (up) {
            this.sendMove('up');
        } else if (down) {
            this.sendMove('down');
        }
    }

    private handleTournamentInputs(): void {
        // Left Paddle: W/S or Arrows
        // Right Paddle: U/J

        // Left
        const lUp = this.keys['w'] || this.keys['arrowup'];
        const lDown = this.keys['s'] || this.keys['arrowdown'];

        if (lUp || lDown) {
            // Determine direction priority
            let dir: 'up' | 'down' | null = null;
            if (lUp && lDown) {
                const uT = Math.max(this.lastKeyPressTime['w'] || 0, this.lastKeyPressTime['arrowup'] || 0);
                const dT = Math.max(this.lastKeyPressTime['s'] || 0, this.lastKeyPressTime['arrowdown'] || 0);
                dir = dT > uT ? 'down' : 'up';
            } else {
                dir = lUp ? 'up' : 'down';
            }

            if (dir) {
                this.ws?.send(JSON.stringify({
                    type: 'movePaddle',
                    side: 'left',
                    paddleIndex: 0,
                    direction: dir
                }));
            }
        }

        // Right
        const rUp = this.keys['u'];
        const rDown = this.keys['j'];

        if (rUp || rDown) {
            let dir: 'up' | 'down' | null = null;
            if (rUp && rDown) {
                const uT = this.lastKeyPressTime['u'] || 0;
                const dT = this.lastKeyPressTime['j'] || 0;
                dir = dT > uT ? 'down' : 'up';
            } else {
                dir = rUp ? 'up' : 'down';
            }

            if (dir) {
                this.ws?.send(JSON.stringify({
                    type: 'movePaddle',
                    side: 'right',
                    paddleIndex: 0,
                    direction: dir
                }));
            }
        }
    }

    private handleArcadeInputs(): void {
        // Multi-paddle input logic
        // Team 1: Q/A (P1), W/S (P2), E/D (P3)
        // Team 2: U/J (P1), I/K (P2), O/L (P3)

        const check = (upKey: string, downKey: string, side: 'left' | 'right', idx: number) => {
            const up = this.keys[upKey];
            const down = this.keys[downKey];

            if (up || down) {
                let dir: 'up' | 'down' | null = null;
                if (up && down) {
                    const uT = this.lastKeyPressTime[upKey] || 0;
                    const dT = this.lastKeyPressTime[downKey] || 0;
                    dir = dT > uT ? 'down' : 'up';
                } else {
                    dir = up ? 'up' : 'down';
                }

                if (dir) {
                    this.ws?.send(JSON.stringify({
                        type: 'movePaddle',
                        side: side,
                        paddleIndex: idx,
                        direction: dir
                    }));
                }
            }
        };

        // Team 1
        check('q', 'a', 'left', 0);
        check('w', 's', 'left', 1);
        check('e', 'd', 'left', 2);

        // Team 2
        check('u', 'j', 'right', 0);
        check('i', 'k', 'right', 1);
        check('o', 'l', 'right', 2);
    }

    public sendMove(direction: 'up' | 'down'): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'movePaddle',
                direction
            }));
        }
    }

    public onGameState(cb: (state: any) => void): void {
        this.gameStateCallbacks.push(cb);
    }

    private notifyState(state: any): void {
        this.gameStateCallbacks.forEach(cb => cb(state));
    }

    public disconnect(): void {
        this.stopInputHandler();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.gameStateCallbacks = [];
    }
}
