// frontend/src/game-settings.ts
// Game settings management

import { GameSettings } from './game-interfaces.js';

export class GameSettingsManager {
  private settings: GameSettings;

  constructor(defaultSettings?: Partial<GameSettings>) {
    this.settings = {
      gameMode: 'coop',
      aiDifficulty: 'medium',
      ballSpeed: 'medium',
      paddleSpeed: 'medium',
      powerupsEnabled: false,
      accelerateOnHit: false,
      scoreToWin: 3,
      ...defaultSettings
    };
  }

  public setSettings(settings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public getBallSpeedValue(): number {
    switch (this.settings.ballSpeed) {
      case 'slow': return 3;
      case 'medium': return 4;
      case 'fast': return 7;
      default: return 4;
    }
  }

  public getPaddleSpeedValue(): number {
    switch (this.settings.paddleSpeed) {
      case 'slow': return 5;
      case 'medium': return 8;
      case 'fast': return 12;
      default: return 8;
    }
  }

  public getAIDifficulty(): 'easy' | 'medium' | 'hard' {
    return this.settings.aiDifficulty;
  }

  public isAccelerateOnHitEnabled(): boolean {
    return this.settings.accelerateOnHit;
  }

  public getScoreToWin(): number {
    return this.settings.scoreToWin;
  }

  public getGameMode(): string {
    return this.settings.gameMode;
  }

  public setGameMode(mode: 'coop' | 'arcade' | 'tournament'): void {
    this.settings.gameMode = mode;
  }

  public updateCampaignLevelSettings(level: number): void {
    // Calculate settings based on current level
    // Ball speed increases with level (starts slow, gets faster)
    let ballSpeed: 'slow' | 'medium' | 'fast';
    if (level <= 3) ballSpeed = 'slow';
    else if (level <= 6) ballSpeed = 'medium';
    else ballSpeed = 'fast';

    // Paddle speed increases with level
    let paddleSpeed: 'slow' | 'medium' | 'fast';
    if (level <= 2) paddleSpeed = 'slow';
    else if (level <= 5) paddleSpeed = 'medium';
    else paddleSpeed = 'fast';

    // AI difficulty increases with level
    let aiDifficulty: 'easy' | 'medium' | 'hard';
    if (level <= 3) aiDifficulty = 'easy';
    else if (level <= 7) aiDifficulty = 'medium';
    else aiDifficulty = 'hard';

    // Score to win increases slightly with level
    const scoreToWin = Math.min(3 + Math.floor((level - 1) / 3), 5);
    // Enable accelerate on hit from level 4
    const accelerateOnHit = level >= 4;

    // Update game settings
    const newSettings: Partial<GameSettings> = {
      gameMode: 'coop',
      aiDifficulty,
      ballSpeed,
      paddleSpeed,
      powerupsEnabled: false, // Keep powerups disabled for campaign
      accelerateOnHit,
      scoreToWin
    };

    this.setSettings(newSettings);
  }
}