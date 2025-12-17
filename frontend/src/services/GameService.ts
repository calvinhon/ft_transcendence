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
    private team1: any[] = [];
    private team2: any[] = [];
    private uuid: string = Math.random().toString(36).substring(7);

    // Handshake State
    private pendingJoinPayload: any = null;

    private constructor() {
        console.log('GameService Created:', this.uuid);
    }

    public static getInstance(): GameService {
        if (!GameService.instance) {
            GameService.instance = new GameService();
        }
        return GameService.instance;
    }

    public async connect(settings: GameSettings, team1?: any[], team2?: any[]): Promise<void> {
        this.gameSettings = settings;

        // Prepare Join Payload to be sent after handshake
        const user = App.getInstance().currentUser;
        if (!user) {
            console.error('User not authenticated, cannot connect to game');
            return;
        }

        if (settings.mode === 'campaign') {
            this.pendingJoinPayload = {
                type: 'joinBotGame',
                userId: user.userId,
                username: user.username,
                aiDifficulty: settings.difficulty || 'medium',
                scoreToWin: settings.scoreToWin || 5
            };
        } else {
            // Arcade / Tournament
            const t1 = team1 || [{ userId: user.userId, username: user.username, paddleIndex: 0, isBot: false }];
            const t2 = team2 || [{ userId: 0, username: 'CPU', paddleIndex: 0, isBot: true }];

            if (settings.mode === 'tournament') {
                t1.length = 1;
                t2.length = 1;
                console.log('Enforcing 1v1 for tournament mode');
            }

            // Ensure paddleIndex is assigned for Arcade/Tournament
            t1.forEach((p: any, i: number) => p.paddleIndex = i);
            t2.forEach((p: any, i: number) => p.paddleIndex = i);

            this.team1 = t1;
            this.team2 = t2;

            this.pendingJoinPayload = {
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
            };
        }

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
                // Initiate Handshake: Send userConnect immediately
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
                    this.handleMessage(msg);
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

    private currentGameState: string = 'unknown';

    private handleMessage(msg: any): void {
        if (msg.type === 'connectionAck') {
            console.log('Connection Ack received, sending Pending Join Payload...');
            if (this.pendingJoinPayload) {
                console.log('Sending Join Game:', JSON.stringify(this.pendingJoinPayload));
                this.ws?.send(JSON.stringify(this.pendingJoinPayload));
                this.pendingJoinPayload = null;
            }
        } else if (msg.type === 'gameState') {
            this.currentGameState = msg.gameState; // Track state
            this.notifyState(msg);
        } else if (msg.type === 'gameEnd') {
            this.currentGameState = 'finished';
            this.notifyState(msg);
            this.stopInputHandler();
        } else if (msg.type === 'gameStart') {
            this.currentGameState = 'playing';
            this.startInputHandler();
        }
    }

    private stopInputHandler(): void {
        if (this.inputInterval) {
            clearInterval(this.inputInterval);
            this.inputInterval = null;
        }
    }

    public handleKeyDown(key: string): void {

        this.keys[key] = true;
        this.lastKeyPressTime[key] = Date.now();
    }

    public handleKeyUp(key: string): void {

        this.keys[key] = false;
    }

    private startInputHandler(): void {
        this.stopInputHandler();
        this.inputInterval = setInterval(() => {
            if (!this.gameSettings) return;

            // Block inputs if not in playing state (e.g. countdown)
            if (this.currentGameState !== 'playing') return;

            switch (this.gameSettings.mode) {
                case 'tournament':
                    this.handleTournamentInputs();
                    break;
                case 'arcade':
                    this.handleArcadeInputs();
                    break;
                case 'campaign':
                default:
                    this.handleCoopInputs();
                    break;
            }
        }, 16);
    }

    private handleCoopInputs(): void {
        const up = this.keys['KeyW'] || this.keys['ArrowUp'];
        const down = this.keys['KeyS'] || this.keys['ArrowDown'];

        if (up && down) {
            const upT = Math.max(this.lastKeyPressTime['KeyW'] || 0, this.lastKeyPressTime['ArrowUp'] || 0);
            const downT = Math.max(this.lastKeyPressTime['KeyS'] || 0, this.lastKeyPressTime['ArrowDown'] || 0);
            this.sendMove(downT > upT ? 'down' : 'up');
        } else if (up) {
            this.sendMove('up');
        } else if (down) {
            this.sendMove('down');
        }
    }

    private handleTournamentInputs(): void {
        // Left Side (Team 1) -> W / S
        const lUp = this.keys['KeyW'];
        const lDown = this.keys['KeyS'];

        if (lUp || lDown) {
            let dir: 'up' | 'down' | null = null;
            if (lUp && lDown) {
                const uT = this.lastKeyPressTime['KeyW'] || 0;
                const dT = this.lastKeyPressTime['KeyS'] || 0;
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

        // Right Side (Team 2) -> Arrow Keys
        const rUp = this.keys['ArrowUp'];
        const rDown = this.keys['ArrowDown'];

        if (rUp || rDown) {
            let dir: 'up' | 'down' | null = null;
            if (rUp && rDown) {
                const uT = this.lastKeyPressTime['ArrowUp'] || 0;
                const dT = this.lastKeyPressTime['ArrowDown'] || 0;
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
        const isPressed = (k: string) => !!this.keys[k];
        const t1Count = this.team1.length;
        const t2Count = this.team2.length;
        const ws = this.ws;

        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        // Helper to send move
        const sendMove = (side: 'left' | 'right', idx: number, dir: 'up' | 'down') => {
            ws.send(JSON.stringify({
                type: 'movePaddle',
                side,
                paddleIndex: idx,
                direction: dir
            }));
        };

        // --- Team 1 (Left) ---
        // Paddle 0
        let p0_up = isPressed('KeyQ');
        let p0_down = isPressed('KeyA');
        if (t1Count === 1) {
            p0_up = p0_up || isPressed('KeyW');
            p0_down = p0_down || isPressed('KeyS');
        }
        if (p0_up && !p0_down) sendMove('left', 0, 'up');
        else if (p0_down && !p0_up) sendMove('left', 0, 'down');

        // Paddle 1
        if (t1Count > 1) {
            if (isPressed('KeyW') && !isPressed('KeyS')) sendMove('left', 1, 'up');
            else if (isPressed('KeyS') && !isPressed('KeyW')) sendMove('left', 1, 'down');
        }

        // Paddle 2
        if (t1Count > 2) {
            if (isPressed('KeyE') && !isPressed('KeyD')) sendMove('left', 2, 'up');
            else if (isPressed('KeyD') && !isPressed('KeyE')) sendMove('left', 2, 'down');
        }


        // --- Team 2 (Right) ---
        // Paddle 0
        let t2p0_up = isPressed('KeyU');
        let t2p0_down = isPressed('KeyJ');
        if (t2Count === 1) {
            t2p0_up = t2p0_up || isPressed('ArrowUp') || isPressed('KeyI');
            t2p0_down = t2p0_down || isPressed('ArrowDown') || isPressed('KeyK');
        }
        if (t2p0_up && !t2p0_down) sendMove('right', 0, 'up');
        else if (t2p0_down && !t2p0_up) sendMove('right', 0, 'down');

        // Paddle 1
        if (t2Count > 1) {
            if (isPressed('KeyI') && !isPressed('KeyK')) sendMove('right', 1, 'up');
            else if (isPressed('KeyK') && !isPressed('KeyI')) sendMove('right', 1, 'down');
        }

        // Paddle 2
        if (t2Count > 2) {
            if (isPressed('KeyO') && !isPressed('KeyL')) sendMove('right', 2, 'up');
            else if (isPressed('KeyL') && !isPressed('KeyO')) sendMove('right', 2, 'down');
        }
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

    public async recordMatchResult(matchData: any): Promise<any> {
        try {

            // Fix: Use static Api class, not App instance property
            const { Api } = await import('../core/Api');
            const response = await Api.post('/api/game/save', matchData);
            return response;
        } catch (e) {
            console.error("Failed to record match result", e);
            throw e;
        }
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
