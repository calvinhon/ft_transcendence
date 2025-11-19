// frontend/src/app-game-manager.ts
// Game management functionality for the App

export interface GameSettings {
  gameMode: 'coop' | 'tournament' | 'arcade';
  difficulty: 'easy' | 'medium' | 'hard';
  soundEnabled: boolean;
  musicEnabled: boolean;
  maxPlayers: number;
  timeLimit?: number;
  scoreLimit?: number;
}

export class AppGameManager {
  public gameSettings: GameSettings = {
    gameMode: 'coop',
    difficulty: 'medium',
    soundEnabled: true,
    musicEnabled: true,
    maxPlayers: 4
  };

  constructor() {
    this.loadGameSettings();
  }

  private loadGameSettings(): void {
    const stored = localStorage.getItem('gameSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.gameSettings = { ...this.gameSettings, ...parsed };
      } catch (e) {
        console.error('Failed to parse game settings:', e);
      }
    }
  }

  private saveGameSettings(): void {
    localStorage.setItem('gameSettings', JSON.stringify(this.gameSettings));
  }

  public updateGameSettings(updates: Partial<GameSettings>): void {
    this.gameSettings = { ...this.gameSettings, ...updates };
    this.saveGameSettings();
  }

  public setGameMode(mode: 'coop' | 'tournament' | 'arcade'): void {
    this.gameSettings.gameMode = mode;
    this.saveGameSettings();
  }

  public setDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    this.gameSettings.difficulty = difficulty;
    this.saveGameSettings();
  }

  public toggleSound(): void {
    this.gameSettings.soundEnabled = !this.gameSettings.soundEnabled;
    this.saveGameSettings();
  }

  public toggleMusic(): void {
    this.gameSettings.musicEnabled = !this.gameSettings.musicEnabled;
    this.saveGameSettings();
  }

  public startCoopGame(): void {
    // Initialize coop game
    console.log('Starting coop game with settings:', this.gameSettings);
    // TODO: Navigate to game screen and initialize game
  }

  public startTournament(): void {
    // Initialize tournament
    console.log('Starting tournament with settings:', this.gameSettings);
    // TODO: Navigate to tournament screen
  }

  public startArcadeGame(): void {
    // Initialize arcade game
    console.log('Starting arcade game with settings:', this.gameSettings);
    // TODO: Navigate to arcade game screen
  }

  public getDifficultyMultiplier(): number {
    switch (this.gameSettings.difficulty) {
      case 'easy': return 0.8;
      case 'medium': return 1.0;
      case 'hard': return 1.2;
      default: return 1.0;
    }
  }

  public validateGameSettings(): boolean {
    // Validate current settings
    if (!this.gameSettings.gameMode) {
      console.error('Game mode not set');
      return false;
    }

    if (!['easy', 'medium', 'hard'].includes(this.gameSettings.difficulty)) {
      console.error('Invalid difficulty setting');
      return false;
    }

    if (this.gameSettings.maxPlayers < 1 || this.gameSettings.maxPlayers > 8) {
      console.error('Invalid max players setting');
      return false;
    }

    return true;
  }

  public resetToDefaults(): void {
    this.gameSettings = {
      gameMode: 'coop',
      difficulty: 'medium',
      soundEnabled: true,
      musicEnabled: true,
      maxPlayers: 4
    };
    this.saveGameSettings();
  }

  public exportSettings(): string {
    return JSON.stringify(this.gameSettings, null, 2);
  }

  public importSettings(settingsJson: string): boolean {
    try {
      const imported = JSON.parse(settingsJson);
      // Validate imported settings
      if (typeof imported === 'object' && imported !== null) {
        this.gameSettings = { ...this.gameSettings, ...imported };
        this.saveGameSettings();
        return true;
      }
    } catch (e) {
      console.error('Failed to import settings:', e);
    }
    return false;
  }
}