// Game rendering module - handles all canvas drawing operations

interface GameState {
  leftPaddle: { y: number; speed: number };
  rightPaddle: { y: number; speed: number };
  leftPaddles?: Array<{ y: number; speed: number; username?: string; userId?: number; color?: string }>;
  rightPaddles?: Array<{ y: number; speed: number; username?: string; userId?: number; color?: string }>;
  ball: { x: number; y: number; vx: number; vy: number };
  leftScore: number;
  rightScore: number;
  status: string;
  gameWidth: number;
  gameHeight: number;
  paddleHeight: number;
  paddleWidth: number;
  ballRadius: number;
}

interface GameSettings {
  gameMode: 'coop' | 'arcade' | 'tournament';
  scoreToWin: number;
}

interface TournamentMatch {
  player1Name: string;
  player2Name: string;
}

export class GameRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  constructor(canvasId: string = 'game-canvas') {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
  }
  
  public initCanvas(width: number, height: number): void {
    if (!this.canvas || !this.ctx) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.tabIndex = 1; // Make canvas focusable
  }
  
  public render(
    gameState: GameState, 
    isPaused: boolean,
    countdownValue: number | null,
    gameSettings: GameSettings,
    isCampaignMode: boolean,
    currentCampaignLevel: number,
    tournamentMatch: TournamentMatch | null
  ): void {
    if (!this.ctx || !this.canvas || !gameState || isPaused) return;
    
    // Clear canvas
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw center line
    this.drawCenterLine();
    
    // Draw paddles
    this.drawPaddles(gameState);
    
    // Draw ball with trail
    this.drawBallWithTrail(gameState, isCampaignMode, currentCampaignLevel);
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
    
    // Draw player info header
    this.drawPlayerInfo(gameState, gameSettings, isCampaignMode, currentCampaignLevel, tournamentMatch);
    
    // Draw countdown overlay if active
    if (countdownValue !== null) {
      this.drawCountdownOverlay(countdownValue);
    }
  }
  
  private drawCenterLine(): void {
    if (!this.ctx || !this.canvas) return;
    
    this.ctx.strokeStyle = '#333';
    this.ctx.setLineDash([10, 10]);
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
  }
  
  private drawPaddles(gameState: GameState): void {
    if (!this.ctx || !this.canvas) return;
    
    const defaultColor = '#77e6ff';
    const paddleColors = ['#77e6ff', '#ff77e6', '#77ff77', '#ffff77', '#ff7777'];
    
    // Draw left side paddles
    if (gameState.leftPaddles && gameState.leftPaddles.length > 0) {
      gameState.leftPaddles.forEach((paddle, index) => {
        const color = paddle.color || paddleColors[index % paddleColors.length];
        this.ctx!.fillStyle = color;
        this.ctx!.shadowColor = color;
        this.ctx!.shadowBlur = 10;
        this.ctx!.fillRect(50, paddle.y, gameState.paddleWidth, gameState.paddleHeight);
        
        // Draw player name on paddle
        if (paddle.username) {
          this.ctx!.shadowBlur = 0;
          this.ctx!.fillStyle = color;
          this.ctx!.font = 'bold 14px "Courier New", monospace';
          this.ctx!.textAlign = 'left';
          this.ctx!.fillText(paddle.username, 65, paddle.y + gameState.paddleHeight / 2 + 5);
        }
      });
    } else {
      // Single paddle for co-op/campaign mode
      this.ctx.fillStyle = defaultColor;
      this.ctx.shadowColor = defaultColor;
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(50, gameState.leftPaddle.y, gameState.paddleWidth, gameState.paddleHeight);
    }
    
    // Draw right side paddles
    if (gameState.rightPaddles && gameState.rightPaddles.length > 0) {
      gameState.rightPaddles.forEach((paddle, index) => {
        const color = paddle.color || paddleColors[index % paddleColors.length];
        this.ctx!.fillStyle = color;
        this.ctx!.shadowColor = color;
        this.ctx!.shadowBlur = 10;
        this.ctx!.fillRect(this.canvas!.width - 60, paddle.y, gameState.paddleWidth, gameState.paddleHeight);
        
        // Draw player name on paddle
        if (paddle.username) {
          this.ctx!.shadowBlur = 0;
          this.ctx!.fillStyle = color;
          this.ctx!.font = 'bold 14px "Courier New", monospace';
          this.ctx!.textAlign = 'right';
          this.ctx!.fillText(paddle.username, this.canvas!.width - 65, paddle.y + gameState.paddleHeight / 2 + 5);
        }
      });
    } else {
      // Single paddle for co-op/campaign mode
      this.ctx.fillStyle = defaultColor;
      this.ctx.shadowColor = defaultColor;
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(this.canvas.width - 60, gameState.rightPaddle.y, gameState.paddleWidth, gameState.paddleHeight);
    }
  }
  
  private drawBallWithTrail(gameState: GameState, isCampaignMode: boolean, currentCampaignLevel: number): void {
    if (!this.ctx || !this.canvas) return;
    
    const ball = gameState.ball;
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const maxSpeed = 15;
    const normalizedSpeed = Math.min(speed / maxSpeed, 1);
    
    // Calculate trail length
    const speedTrailLength = Math.floor(normalizedSpeed * 8) + 3;
    const campaignBonus = isCampaignMode ? Math.floor(currentCampaignLevel / 2) : 0;
    const trailLength = Math.min(speedTrailLength + campaignBonus, 15);
    const trailSpacing = normalizedSpeed * 3 + 1;
    const dynamicRadius = gameState.ballRadius * (1 + normalizedSpeed * 0.2);
    
    // Calculate trail direction
    const angle = Math.atan2(ball.vy, ball.vx);
    const trailDx = -Math.cos(angle) * trailSpacing;
    const trailDy = -Math.sin(angle) * trailSpacing;
    
    // Draw trail particles
    for (let i = 1; i <= trailLength; i++) {
      const trailX = ball.x + (trailDx * i);
      const trailY = ball.y + (trailDy * i);
      const alpha = 1 - (i / trailLength);
      const trailRadius = gameState.ballRadius * (1 - (i / trailLength) * 0.7);
      
      const ballColors = this.getBallColors(normalizedSpeed);
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.6;
      this.ctx.fillStyle = ballColors.trail;
      this.ctx.shadowColor = ballColors.trail;
      this.ctx.shadowBlur = 15 * alpha;
      this.ctx.beginPath();
      this.ctx.arc(trailX, trailY, trailRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
    
    // Draw main ball
    const ballColors = this.getBallColors(normalizedSpeed);
    this.ctx.fillStyle = ballColors.main;
    this.ctx.shadowColor = ballColors.glow;
    this.ctx.shadowBlur = 20;
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, dynamicRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  private getBallColors(normalizedSpeed: number): { main: string; glow: string; trail: string } {
    if (normalizedSpeed < 0.33) {
      return { main: '#77e6ff', glow: '#77e6ff', trail: '#77e6ff' };
    } else if (normalizedSpeed < 0.66) {
      return { main: '#ffff77', glow: '#ffff00', trail: '#ffaa00' };
    } else {
      return { main: '#ff7777', glow: '#ff0000', trail: '#ff0000' };
    }
  }
  
  private drawPlayerInfo(
    gameState: GameState,
    gameSettings: GameSettings,
    isCampaignMode: boolean,
    currentCampaignLevel: number,
    tournamentMatch: TournamentMatch | null
  ): void {
    if (!this.ctx || !this.canvas) return;
    
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
    
    // Draw semi-transparent background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, 80);
    
    // Determine player names
    const isArcadeMode = (gameState.leftPaddles && gameState.leftPaddles.length > 0) ||
                         (gameState.rightPaddles && gameState.rightPaddles.length > 0);
    
    let leftPlayerName: string;
    let rightPlayerName: string;
    
    if (tournamentMatch && tournamentMatch.player1Name && tournamentMatch.player2Name) {
      leftPlayerName = tournamentMatch.player1Name;
      rightPlayerName = tournamentMatch.player2Name;
    } else if (isArcadeMode) {
      leftPlayerName = 'Team 1';
      rightPlayerName = 'Team 2';
    } else {
      leftPlayerName = 'Player';
      rightPlayerName = 'AI Bot';
    }
    
    // Draw player names
    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(leftPlayerName, 50, 30);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(rightPlayerName, this.canvas.width - 50, 30);
    
    // Draw center info
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    if (isCampaignMode) {
      this.ctx.fillText(`Campaign Level ${currentCampaignLevel} - First to ${gameSettings.scoreToWin}`, this.canvas.width / 2, 30);
    } else {
      this.ctx.fillText(`First to ${gameSettings.scoreToWin}`, this.canvas.width / 2, 30);
    }
    
    // Draw large scores
    this.ctx.font = 'bold 48px Courier New, monospace';
    this.ctx.fillStyle = '#77e6ff';
    this.ctx.shadowColor = '#77e6ff';
    this.ctx.shadowBlur = 10;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(gameState.leftScore.toString(), this.canvas.width / 4, 130);
    this.ctx.fillText(gameState.rightScore.toString(), (this.canvas.width * 3) / 4, 130);
    
    this.ctx.restore();
  }
  
  private drawCountdownOverlay(value: number): void {
    if (!this.ctx || !this.canvas) return;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.shadowColor = '#77e6ff';
    this.ctx.shadowBlur = 8;
    this.ctx.fillStyle = 'rgba(119, 230, 255, 0.9)';
    this.ctx.font = 'bold 60px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const text = value > 0 ? value.toString() : 'GO!';
    this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    
    if (value > 0) {
      this.ctx.font = 'bold 20px "Courier New", monospace';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.shadowBlur = 5;
      this.ctx.fillText('GET READY', this.canvas.width / 2, this.canvas.height / 2 - 50);
    }
    
    this.ctx.shadowBlur = 0;
  }
  
  public getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }
}
