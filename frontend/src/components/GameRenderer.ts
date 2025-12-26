

// Backend uses fixed 800x600 canvas. We scale to actual canvas size.
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Backend doesn't send dimensions, use fixed Pong defaults
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 6;

export class GameRenderer {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;

    // Cached grid for performance
    private gridCanvas: HTMLCanvasElement | null = null;

    // Visuals
    private ballHistory: { x: number, y: number }[] = [];
    private paddleHistory: Map<string, { x: number, y: number }[]> = new Map();

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    public resize(): void {
        const parent = this.canvas.parentElement;
        if (parent) {
            this.canvas.width = parent.clientWidth;
            this.canvas.height = parent.clientHeight;
            this.gridCanvas = null; // Force grid rebuild
        }
    }

    // Scale from game coordinates (800x600) to actual canvas size
    private scaleX(val: number): number {
        return (val / GAME_WIDTH) * this.canvas.width;
    }

    private scaleY(val: number): number {
        return (val / GAME_HEIGHT) * this.canvas.height;
    }

    public render(gameState: any, gameMode: string = 'campaign'): void {
        if (!this.ctx || !this.canvas) return;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        // Clear and Draw Background
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        // Draw Grid
        this.drawGrid(width, height);

        if (!gameState) {
            this.drawWaiting(width, height);
            return;
        }

        // Draw Game Elements
        this.drawPaddles(gameState.paddles);
        this.drawBallTrail();
        this.drawBall(gameState.ball);
        this.drawScores(gameState.scores, width);
        this.drawCenterLine(height);
        this.drawBorder(width, height);

        // Arcade Controls
        if (gameMode === 'arcade') {
            this.drawArcadeControls(width, height);
        }

        // Draw Countdown if active
        if (gameState.countdownValue !== undefined && gameState.gameState === 'countdown') {
            this.drawCountdown(gameState.countdownValue, width, height);
        }

        // Game over is now handled by GamePage overlay, not canvas
        // if (gameState.gameState === 'finished') {
        //     this.drawGameOver(gameState, width, height);
        // }
    }

    private drawBorder(w: number, h: number): void {
        const ctx = this.ctx;
        ctx.strokeStyle = '#77e6ff';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#77e6ff';
        ctx.shadowBlur = 20; // Increased glow
        ctx.strokeRect(0, 0, w, h);
        ctx.shadowBlur = 0;
    }

    private drawCenterLine(h: number): void {
        const ctx = this.ctx;
        const w = this.canvas.width;

        ctx.strokeStyle = 'rgba(119, 230, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    private drawGrid(w: number, h: number): void {
        // Use cached grid if available
        if (this.gridCanvas && this.gridCanvas.width === w && this.gridCanvas.height === h) {
            this.ctx.drawImage(this.gridCanvas, 0, 0);
            return;
        }

        // Create cache
        this.gridCanvas = document.createElement('canvas');
        this.gridCanvas.width = w;
        this.gridCanvas.height = h;
        const gCtx = this.gridCanvas.getContext('2d')!;

        gCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        gCtx.lineWidth = 1;
        const cellSize = 40;

        for (let x = 0; x < w; x += cellSize) {
            gCtx.beginPath(); gCtx.moveTo(x, 0); gCtx.lineTo(x, h); gCtx.stroke();
        }
        for (let y = 0; y < h; y += cellSize) {
            gCtx.beginPath(); gCtx.moveTo(0, y); gCtx.lineTo(w, y); gCtx.stroke();
        }

        // Use the newly created cache
        this.ctx.drawImage(this.gridCanvas, 0, 0);
    }

    private drawPaddles(paddles: any): void {
        if (!paddles) return;

        const paddleWidth = this.scaleX(PADDLE_WIDTH);
        const paddleHeight = this.scaleY(PADDLE_HEIGHT);

        // Default colors
        const c1 = '#77e6ff';
        const c2 = '#ff77e6';

        // Arcade/Tournament Team Arrays
        if (paddles.team1 && paddles.team1.length > 0) {
            paddles.team1.forEach((p: any, i: number) => {
                // Cycle colors for arcade teams
                const colors = ['#77e6ff', '#77ff77', '#ffff77'];
                this.updatePaddleHistory(`t1-${i}`, p);
                this.drawPaddleTrail(`t1-${i}`, paddleWidth, paddleHeight, colors[i % colors.length]);
                this.drawSinglePaddle(p.x, p.y, paddleWidth, paddleHeight, colors[i % colors.length]);
            });
        } else if (paddles.player1) {
            this.updatePaddleHistory('p1', paddles.player1);
            this.drawPaddleTrail('p1', paddleWidth, paddleHeight, c1);
            this.drawSinglePaddle(paddles.player1.x, paddles.player1.y, paddleWidth, paddleHeight, c1);
        }

        if (paddles.team2 && paddles.team2.length > 0) {
            paddles.team2.forEach((p: any, i: number) => {
                const colors = ['#ff7777', '#ff77e6', '#aa77ff'];
                this.updatePaddleHistory(`t2-${i}`, p);
                this.drawPaddleTrail(`t2-${i}`, paddleWidth, paddleHeight, colors[i % colors.length]);
                this.drawSinglePaddle(p.x, p.y, paddleWidth, paddleHeight, colors[i % colors.length]);
            });
        } else if (paddles.player2) {
            this.updatePaddleHistory('p2', paddles.player2);
            this.drawPaddleTrail('p2', paddleWidth, paddleHeight, c2);
            this.drawSinglePaddle(paddles.player2.x, paddles.player2.y, paddleWidth, paddleHeight, c2);
        }
    }

    private updatePaddleHistory(key: string, pos: any): void {
        if (!this.paddleHistory.has(key)) {
            this.paddleHistory.set(key, []);
        }
        const history = this.paddleHistory.get(key)!;
        history.push({ x: pos.x, y: pos.y });
        if (history.length > 10) history.shift();
    }

    private drawPaddleTrail(key: string, w: number, h: number, color: string): void {
        const history = this.paddleHistory.get(key);
        if (!history || history.length === 0) return;

        const ctx = this.ctx;
        history.forEach((pos, index) => {
            const alpha = (index / history.length) * 0.3; // Lower opacity for paddle trail
            const x = this.scaleX(pos.x);
            const y = this.scaleY(pos.y);

            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.fillRect(x, y, w, h);
            ctx.globalAlpha = 1.0;
        });
    }

    private drawSinglePaddle(gameX: number, gameY: number, w: number, h: number, color: string): void {
        const ctx = this.ctx;
        const x = this.scaleX(gameX);
        const y = this.scaleY(gameY);

        ctx.shadowColor = color;
        ctx.shadowBlur = 20; // Increased glow
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);

        ctx.shadowBlur = 0;
    }

    private drawArcadeControls(w: number, h: number): void {
        const ctx = this.ctx;
        ctx.save();

        // Semi-transparent bottom bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, h - 30, w, 30);

        ctx.font = '10px "PixelCode", monospace';
        ctx.fillStyle = '#aaaaaa';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const y = h - 15;

        // Left Controls
        ctx.textAlign = 'left';
        ctx.fillText('TEAM 1: Q/A (P1) | W/S (P2) | E/D (P3)', 20, y);

        // Right Controls
        ctx.textAlign = 'right';
        ctx.fillText('TEAM 2: U/J (P1) | I/K (P2) | O/L (P3)', w - 20, y);

        ctx.restore();
    }

    private drawBall(ball: any): void {
        if (!ball) return;

        // Update History
        this.ballHistory.push({ x: ball.x, y: ball.y });
        if (this.ballHistory.length > 10) this.ballHistory.shift();

        const ctx = this.ctx;

        const x = this.scaleX(ball.x);
        const y = this.scaleY(ball.y);
        const radius = this.scaleX(BALL_RADIUS);

        const color = '#ffffff';

        ctx.shadowColor = color;
        ctx.shadowBlur = 25; // Increased glow
        ctx.fillStyle = color;

        // Square Ball for Retro Feel
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

        ctx.shadowBlur = 0;
    }

    private drawBallTrail(): void {
        if (this.ballHistory.length === 0) return;
        const ctx = this.ctx;
        const radius = this.scaleX(BALL_RADIUS);

        this.ballHistory.forEach((pos, index) => {
            const alpha = (index / this.ballHistory.length) * 0.5; // Fade out
            const x = this.scaleX(pos.x);
            const y = this.scaleY(pos.y);

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.shadowBlur = 0; // No glow for trail for performance
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        });
    }

    private drawScores(scores: any, w: number): void {
        if (!scores) return;
        const ctx = this.ctx;

        ctx.font = 'bold 48px "VCR OSD Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';

        const p1Score = scores.player1 || 0;
        const p2Score = scores.player2 || 0;

        ctx.fillText(`${p1Score} - ${p2Score}`, w / 2, 80);
    }

    private drawWaiting(w: number, h: number): void {
        const ctx = this.ctx;
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px "PixelCode", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('AWAITING SIGNAL...', w / 2, h / 2);

        // Animated dots
        const time = Date.now() * 0.002;
        const dots = Math.floor(time % 4);
        ctx.fillText('.'.repeat(dots), w / 2 + 140, h / 2);
    }

    private drawCountdown(val: number, w: number, h: number): void {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, w, h);

        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px "VCR OSD Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = val > 0 ? val.toString() : 'GO!';
        ctx.fillText(text, w / 2, h / 2);
        ctx.shadowBlur = 0;
    }

    // Game over is now handled by GamePage HTML overlay for better flexibility
    // private drawGameOver(gameState: any, w: number, h: number): void {
    //     const ctx = this.ctx;
    //     ctx.fillStyle = 'rgba(0,0,0,0.7)';
    //     ctx.fillRect(0, 0, w, h);
    //
    //     ctx.shadowColor = '#ffffff';
    //     ctx.shadowBlur = 20;
    //     ctx.fillStyle = '#ffffff';
    //     ctx.font = 'bold 60px "VCR OSD Mono", monospace';
    //     ctx.textAlign = 'center';
    //     ctx.textBaseline = 'middle';
    //
    //     const scores = gameState.scores;
    //     let winnerText = "GAME OVER";
    //     if (scores.player1 > scores.player2) winnerText = "PLAYER 1 WINS";
    //     if (scores.player2 > scores.player1) winnerText = "PLAYER 2 WINS";
    //
    //     ctx.fillText(winnerText, w / 2, h / 2);
    //
    //     ctx.font = '20px "PixelCode", monospace';
    //     ctx.fillText("PRESS EXIT TO RETURN", w / 2, h / 2 + 60);
    //
    //     ctx.shadowBlur = 0;
    // }
}
