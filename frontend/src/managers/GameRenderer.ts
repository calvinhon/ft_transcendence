// frontend/src/managers/GameRenderer.ts
import { GameSettings } from '../types';

// Local renderer-specific game state interface (keeps renderer decoupled
// from the coordinator's internal GameState definition).
interface RendererPaddle {
  x: number;
  y: number;
  width: number;
  height: number;
  team?: number;
}

interface RendererPowerup {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

interface RendererParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface RendererBall {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  radius?: number;
}

interface RendererScores {
  player1?: number;
  player2?: number;
}

interface RendererPlayer {
  userId: number;
  username: string;
  team: number;
  paddleIndex: number;
}

interface RendererGameState {
  paddles?: RendererPaddle[];
  ball?: RendererBall;
  powerups?: RendererPowerup[];
  particles?: RendererParticle[];
  scores?: RendererScores;
  gameState?: 'countdown' | 'playing' | 'finished';
  countdownValue?: number;
  players?: {
    team1: RendererPlayer[];
    team2: RendererPlayer[];
  };
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: RendererGameState | null = null;
  private gameSettings: GameSettings;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement, gameSettings: GameSettings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gameSettings = gameSettings;

    // Set canvas size
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.width = container.clientWidth;
      this.canvas.height = container.clientHeight;
    }
  }

  public setGameState(gameState: RendererGameState | null): void {
    this.gameState = gameState;
  }

  public setGameSettings(settings: GameSettings): void {
    this.gameSettings = settings;
  }

  public startRendering(): void {
    if (this.animationFrameId === null) {
      this.render();
    }
  }

  public stopRendering(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private render = (): void => {
    if (!this.gameState) {
      this.renderWaitingScreen();
    } else {
      this.renderGame();
    }
    this.animationFrameId = requestAnimationFrame(this.render);
  };

  private renderWaitingScreen(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;

    // Clear canvas with cyberpunk background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(119, 230, 255, 0.1)');
    gradient.addColorStop(0.5, 'rgba(233, 69, 96, 0.1)');
    gradient.addColorStop(1, 'rgba(119, 230, 255, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw waiting text
    ctx.fillStyle = '#77e6ff';
    ctx.font = 'bold 24px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WAITING FOR GAME TO START...', canvas.width / 2, canvas.height / 2);

    // Draw animated dots
    const time = Date.now() * 0.005;
    const dots = Math.floor(time % 4);
    const dotText = '.'.repeat(dots);
    ctx.fillText(dotText, canvas.width / 2 + 200, canvas.height / 2);
  }

  private renderGame(): void {
    if (!this.gameState) return;

    const ctx = this.ctx;
    const canvas = this.canvas;

    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw game elements
    this.drawPaddles();
    this.drawBall();
    this.drawCenterLine();
    this.drawScores();
    this.drawPlayerInfo();
    this.drawArcadeControls();
    this.drawPowerups();
    this.drawParticles();

    // Draw countdown overlay if active (drawn last so it's on top)
    if (this.gameState.gameState === 'countdown' && this.gameState.countdownValue !== undefined) {
      this.drawCountdown(this.gameState.countdownValue);
    }
  }

  private drawPaddles(): void {
    if (!this.gameState?.paddles) return;

    const ctx = this.ctx;
    const canvas = this.canvas;

    // Draw paddles for all players
    this.gameState.paddles.forEach((paddle: RendererPaddle, index: number) => {
      // Determine paddle color based on team
      let paddleColor = '#77e6ff'; // Default cyan
      if (this.gameSettings.gameMode === 'arcade') {
        // Team-based coloring for arcade mode
        paddleColor = paddle.team === 1 ? '#77e6ff' : '#e94560';
      }

      // Draw paddle glow
      ctx.shadowColor = paddleColor;
      ctx.shadowBlur = 10;

      // Draw paddle
      ctx.fillStyle = paddleColor;
      ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw paddle border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
    });
  }

  private drawCountdown(countdownValue: number): void {
    const ctx = this.ctx;
    const canvas = this.canvas;

    // Draw very light semi-transparent overlay (barely visible to keep game bright)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw countdown text with subtle glow effect
    ctx.shadowColor = '#77e6ff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(119, 230, 255, 0.9)'; // Less bright cyan
    ctx.font = 'bold 60px "Courier New", monospace'; // Even smaller font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = countdownValue > 0 ? countdownValue.toString() : 'GO!';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Add "GET READY" text above countdown (smaller and less bright)
    if (countdownValue > 0) {
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.shadowBlur = 5;
      ctx.fillText('GET READY', canvas.width / 2, canvas.height / 2 - 50);
    }

    // Reset shadow
    ctx.shadowBlur = 0;
  }

  private drawBall(): void {
    if (!this.gameState?.ball) return;

    const ctx = this.ctx;
    const ball = this.gameState.ball;

    // Calculate speed for dynamic effects
    const speed = Math.sqrt((ball.vx || 0) ** 2 + (ball.vy || 0) ** 2);
    const maxSpeed = 15; // Adjust based on game's max ball speed
    const normalizedSpeed = Math.min(speed / maxSpeed, 1);

    // Calculate trail length based on speed
    const speedTrailLength = Math.floor(normalizedSpeed * 8) + 3;
    const trailLength = Math.min(speedTrailLength, 15); // Cap at 15 for performance

    const trailSpacing = normalizedSpeed * 3 + 1;

    // Dynamic ball size based on speed (slightly larger when faster)
    const dynamicRadius = (ball.radius || 5) * (1 + normalizedSpeed * 0.2);

    // Calculate direction opposite to ball movement for trail
    const angle = Math.atan2(ball.vy || 0, ball.vx || 0);
    const trailDx = -Math.cos(angle) * trailSpacing;
    const trailDy = -Math.sin(angle) * trailSpacing;

    // Draw trail particles
    for (let i = 1; i <= trailLength; i++) {
      const trailX = ball.x + (trailDx * i);
      const trailY = ball.y + (trailDy * i);

      // Calculate fade effect for trail
      const alpha = 1 - (i / trailLength);
      const trailRadius = (ball.radius || 5) * (1 - (i / trailLength) * 0.7);

      // Get dynamic colors
      const ballColors = this.getBallColors(normalizedSpeed);

      // Set trail color with fade
      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = ballColors.trail;
      ctx.shadowColor = ballColors.trail;
      ctx.shadowBlur = 8 * alpha;

      ctx.beginPath();
      ctx.arc(trailX, trailY, trailRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw main ball with enhanced glow
    const ballColors = this.getBallColors(normalizedSpeed);
    ctx.save();
    ctx.fillStyle = ballColors.main;
    ctx.shadowColor = ballColors.main;
    ctx.shadowBlur = 15 + (normalizedSpeed * 10); // Stronger glow for faster ball

    // Add outer glow ring
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, dynamicRadius + 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw main ball
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 20 + (normalizedSpeed * 15);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, dynamicRadius, 0, Math.PI * 2);
    ctx.fill();

    // Add inner highlight for 3D effect
    ctx.shadowBlur = 0;
    ctx.fillStyle = ballColors.highlight;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(ball.x - 1, ball.y - 1, dynamicRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private getBallColors(normalizedSpeed: number): { main: string; highlight: string; trail: string } {
    // Color transitions based on speed: slow (cyan) -> medium (white) -> fast (red)
    if (normalizedSpeed < 0.3) {
      // Slow speed - cyan
      return {
        main: '#77e6ff',
        highlight: '#a3f0ff',
        trail: '#77e6ff'
      };
    } else if (normalizedSpeed < 0.7) {
      // Medium speed - white/yellow
      return {
        main: '#ffffff',
        highlight: '#ffffcc',
        trail: '#ccffff'
      };
    } else {
      // High speed - red/orange
      return {
        main: '#e94560',
        highlight: '#ff6b8a',
        trail: '#ff9999'
      };
    }
  }

  private drawCenterLine(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;

    // Draw center line
    ctx.strokeStyle = '#77e6ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawScores(): void {
    if (!this.gameState?.scores) return;

    const ctx = this.ctx;
    const canvas = this.canvas;

    // Draw scores
    ctx.fillStyle = '#77e6ff';
    ctx.font = 'bold 48px Orbitron, monospace';
    ctx.textAlign = 'center';

    // Left score
    ctx.fillText(
      this.gameState.scores.player1?.toString() || '0',
      canvas.width / 4,
      80
    );

    // Right score
    ctx.fillText(
      this.gameState.scores.player2?.toString() || '0',
      (3 * canvas.width) / 4,
      80
    );

    // Draw score labels
    ctx.font = '16px Orbitron, monospace';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('PLAYER 1', canvas.width / 4, 110);
    ctx.fillText('PLAYER 2', (3 * canvas.width) / 4, 110);
  }

  private drawPowerups(): void {
    if (!this.gameState?.powerups) return;

    const ctx = this.ctx;

    this.gameState.powerups.forEach((powerup: RendererPowerup) => {
      // Draw powerup glow
      ctx.shadowColor = powerup.color || '#ffffff';
      ctx.shadowBlur = 10;

      // Draw powerup
      ctx.fillStyle = powerup.color || '#ffffff';
      ctx.fillRect(powerup.x, powerup.y, powerup.width, powerup.height);

      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw powerup border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(powerup.x, powerup.y, powerup.width, powerup.height);
    });
  }

  private drawParticles(): void {
    if (!this.gameState?.particles) return;

    const ctx = this.ctx;

    this.gameState.particles.forEach((particle: RendererParticle) => {
      ctx.globalAlpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });

    ctx.globalAlpha = 1;
  }

  private drawPlayerInfo(): void {
    if (!this.ctx || !this.canvas || !this.gameState?.scores) return;

    // Save current context
    this.ctx.save();

    // Reset any transformations and shadows
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;

    // Draw semi-transparent background for player info area
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, 80);

    // Get user information
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();

    // Check if we're in arcade mode (multiple paddles)
    const isArcadeMode = this.gameSettings.gameMode === 'arcade';

    // For campaign mode, we need to get the current campaign level
    const campaignManager = (window as any).campaignManager;
    const isCampaignMode = campaignManager?.isCampaignActive?.() || false;
    const currentCampaignLevel = campaignManager?.getCurrentLevel?.() || 1;

    // Player names and levels
    let leftPlayerName: string;
    let rightPlayerName: string;
    let leftPlayerLevel: number;
    let rightPlayerLevel: number;

    // Check tournament mode first (takes priority over arcade mode)
    const app = (window as any).app;
    const tournamentMatch = app?.currentTournamentMatch;

    if (tournamentMatch && tournamentMatch.player1Name && tournamentMatch.player2Name) {
      // Tournament mode: Use player names from match data
      leftPlayerName = tournamentMatch.player1Name;
      rightPlayerName = tournamentMatch.player2Name;
      leftPlayerLevel = 1; // Can enhance later with actual player levels
      rightPlayerLevel = 1;
    } else if (isArcadeMode) {
      // Arcade mode: Show team names (no levels needed for teams)
      leftPlayerName = 'Team 1';
      rightPlayerName = 'Team 2';
      leftPlayerLevel = 0; // Not displayed for teams
      rightPlayerLevel = 0; // Not displayed for teams
    } else {
      // Co-op/Campaign mode: Show player vs AI
      leftPlayerName = user?.username || 'Player 1';
      rightPlayerName = 'AI Bot';

      // Try to read player level from user profile
      const userLevelFromProfile = (() => {
        const maybeLevel = (user as any)?.level ?? (user as any)?.profileLevel ?? (user as any)?.profile?.level;
        if (typeof maybeLevel === 'number') return Math.max(1, Math.floor(maybeLevel));
        if (typeof maybeLevel === 'string' && !isNaN(parseInt(maybeLevel, 10))) return Math.max(1, parseInt(maybeLevel, 10));
        return null;
      })();

      leftPlayerLevel = userLevelFromProfile ?? (isCampaignMode ? currentCampaignLevel : 1);
      rightPlayerLevel = leftPlayerLevel;
    }

    // Use getter to respect current game settings and campaign adjustments
    const targetScore = this.gameSettings.scoreToWin;

    // Left player info
    this.drawPlayerInfoSection(
      50, // x position
      25, // y position
      leftPlayerName,
      leftPlayerLevel,
      this.gameState.scores.player1 || 0,
      isArcadeMode ? '👥' : '👤', // icon
      'left'
    );

    // Right player info
    this.drawPlayerInfoSection(
      this.canvas.width - 50, // x position
      25, // y position
      rightPlayerName,
      rightPlayerLevel,
      this.gameState.scores.player2 || 0,
      isArcadeMode ? '👥' : '🤖', // icon
      'right'
    );

    // Center info - "First to X" or campaign level or team matchup
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';

    // Debug: log what mode we're in
    if (isCampaignMode || isArcadeMode) {
      console.log('[RENDER-HEADER] isCampaignMode:', isCampaignMode, 'isArcadeMode:', isArcadeMode, 'gameMode:', this.gameSettings.gameMode);
    }

    if (isCampaignMode) {
      this.ctx.fillText(`Campaign Level ${currentCampaignLevel} - First to ${targetScore}`, this.canvas.width / 2, 30);
    } else if (isArcadeMode) {
      // Arcade mode - just show score target
      this.ctx.fillText(`First to ${targetScore}`, this.canvas.width / 2, 30);
    } else {
      this.ctx.fillText(`First to ${targetScore}`, this.canvas.width / 2, 30);
    }

    // Draw large scores in center-top area
    this.ctx.font = 'bold 48px Courier New, monospace';
    this.ctx.fillStyle = '#77e6ff';
    this.ctx.shadowColor = '#77e6ff';
    this.ctx.shadowBlur = 10;

    // Left score
    this.ctx.textAlign = 'center';
    this.ctx.fillText((this.gameState.scores.player1 || 0).toString(),
      this.canvas.width / 4, 130);

    // Right score
    this.ctx.fillText((this.gameState.scores.player2 || 0).toString(),
      (this.canvas.width * 3) / 4, 130);

    // Restore context
    this.ctx.restore();
  }

  private drawPlayerInfoSection(x: number, y: number, name: string, level: number, score: number, icon: string, alignment: 'left' | 'right'): void {
    if (!this.ctx) return;

    this.ctx.save();

    // Check if this is a team name (for arcade mode)
    const isTeam = name.startsWith('Team ');

    // Draw player icon
    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = '#77e6ff';

    if (alignment === 'left') {
      this.ctx.textAlign = 'left';
      this.ctx.fillText(icon, x, y);

      // Draw name
      this.ctx.font = 'bold 14px Arial';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(name, x + 30, y - 2);

      // Draw level (skip for teams in arcade mode)
      if (!isTeam) {
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillText(`Level ${level}`, x + 30, y + 15);
      }

    } else {
      this.ctx.textAlign = 'right';
      this.ctx.fillText(icon, x, y);

      // Draw name
      this.ctx.font = 'bold 14px Arial';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(name, x - 30, y - 2);

      // Draw level (skip for teams in arcade mode)
      if (!isTeam) {
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillText(`Level ${level}`, x - 30, y + 15);
      }
    }

    this.ctx.restore();
  }

  private drawArcadeControls(): void {
    if (!this.ctx || !this.canvas || this.gameSettings.gameMode !== 'arcade' || !this.gameState?.players) return;

    this.ctx.save();

    // Draw semi-transparent background at the bottom
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, this.canvas.height - 80, this.canvas.width, 80);

    // Color palette matching paddles
    const paddleColors = [
      '#77e6ff', // Cyan
      '#ff77e6', // Pink/Magenta
      '#77ff77', // Green
      '#ffff77', // Yellow
      '#ff7777'  // Red/Orange
    ];

    // Team 1 controls (left side)
    const team1Keys = [
      { label: 'Q/A', description: 'Player 1' },
      { label: 'W/S', description: 'Player 2' },
      { label: 'E/D', description: 'Player 3' }
    ];

    // Team 2 controls (right side)
    const team2Keys = [
      { label: 'U/J', description: 'Player 1' },
      { label: 'I/K', description: 'Player 2' },
      { label: 'O/L', description: 'Player 3' }
    ];

    const startY = this.canvas.height - 60;
    const lineHeight = 20;

    // Draw Team 1 controls (left side)
    this.ctx.textAlign = 'left';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('TEAM 1 CONTROLS:', 20, startY - 5);

    const team1Players = this.gameState.players.team1;
    for (let i = 0; i < Math.min(team1Players.length, 3); i++) {
      const player = team1Players[i];
      const color = paddleColors[i % paddleColors.length];
      const yPos = startY + 15 + (i * lineHeight);

      // Draw colored indicator
      this.ctx.fillStyle = color;
      this.ctx.fillRect(20, yPos - 10, 8, 12);

      // Draw player name and keys
      this.ctx.font = 'bold 11px Arial';
      this.ctx.fillStyle = color;
      this.ctx.fillText(player.username, 35, yPos);

      this.ctx.font = '11px Arial';
      this.ctx.fillStyle = '#aaaaaa';
      this.ctx.fillText(`- ${team1Keys[i].label}`, 35 + this.ctx.measureText(player.username).width + 5, yPos);
    }

    // Add arrow keys alternative for Team 1
    if (team1Players.length > 0) {
      const arrowY = startY + 15 + (Math.min(team1Players.length, 3) * lineHeight);
      this.ctx.font = '10px Arial';
      this.ctx.fillStyle = '#666666';
      this.ctx.fillText('(Arrow Keys: Player 1)', 20, arrowY);
    }

    // Draw Team 2 controls (right side)
    this.ctx.textAlign = 'right';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('TEAM 2 CONTROLS:', this.canvas.width - 20, startY - 5);

    const team2Players = this.gameState.players.team2;
    for (let i = 0; i < Math.min(team2Players.length, 3); i++) {
      const player = team2Players[i];
      const color = paddleColors[i % paddleColors.length];
      const yPos = startY + 15 + (i * lineHeight);

      // Measure text widths for right alignment
      this.ctx.font = 'bold 11px Arial';
      const nameWidth = this.ctx.measureText(player.username).width;
      this.ctx.font = '11px Arial';
      const keysText = `${team2Keys[i].label} - `;
      const keysWidth = this.ctx.measureText(keysText).width;

      // Draw colored indicator
      this.ctx.fillStyle = color;
      this.ctx.fillRect(this.canvas.width - 28, yPos - 10, 8, 12);

      // Draw keys and player name
      this.ctx.font = '11px Arial';
      this.ctx.fillStyle = '#aaaaaa';
      this.ctx.fillText(keysText, this.canvas.width - 35, yPos);

      this.ctx.font = 'bold 11px Arial';
      this.ctx.fillStyle = color;
      this.ctx.fillText(player.username, this.canvas.width - 35 - keysWidth, yPos);
    }

    this.ctx.restore();
  }

  public destroy(): void {
    this.stopRendering();
    window.removeEventListener('resize', () => this.resizeCanvas());
  }
}