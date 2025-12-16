import { GameSettings } from '../types';
import { logger } from '../utils/Logger';
import { authService } from '../core/authService';

export class CampaignManager {
  private currentLevel: number = 1;
  private maxLevel: number = 10;
  private isActive: boolean = false;

  public startCampaign(): void {
    this.isActive = true;
    this.currentLevel = this.loadPlayerCampaignLevel();
    console.log(`🎯 [CAMPAIGN] Started campaign at level ${this.currentLevel}`);
  }

  public endCampaign(): void {
    this.isActive = false;
    this.currentLevel = 1;
    console.log('🎯 [CAMPAIGN] Campaign ended');
  }

  public progressToNextLevel(): void {
    if (!this.isActive) return;

    if (this.currentLevel < this.maxLevel) {
      this.currentLevel++;
      console.log(`🎯 [CAMPAIGN] Level progressed from ${this.currentLevel - 1} to ${this.currentLevel}`);
      this.savePlayerCampaignLevel(this.currentLevel);
      this.syncLevelToBackend();
    } else {
      // Campaign completed
      console.log('🎯 [CAMPAIGN] Campaign completed!');
    }
  }

  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  public isCampaignActive(): boolean {
    return this.isActive;
  }

  public getLevelSettings(): GameSettings {
    const level = this.currentLevel;

    // Calculate settings based on current level
    let ballSpeed: 'slow' | 'medium' | 'fast';
    if (level <= 3) ballSpeed = 'slow';
    else if (level <= 6) ballSpeed = 'medium';
    else ballSpeed = 'fast';

    let paddleSpeed: 'slow' | 'medium' | 'fast';
    if (level <= 2) paddleSpeed = 'slow';
    else if (level <= 5) paddleSpeed = 'medium';
    else paddleSpeed = 'fast';

    let aiDifficulty: 'easy' | 'medium' | 'hard';
    if (level <= 3) aiDifficulty = 'easy';
    else if (level <= 7) aiDifficulty = 'medium';
    else aiDifficulty = 'hard';

    const scoreToWin = Math.min(3 + Math.floor((level - 1) / 3), 5);
    const accelerateOnHit = level >= 4;

    return {
      gameMode: 'coop',
      aiDifficulty,
      ballSpeed,
      paddleSpeed,
      powerupsEnabled: false,
      accelerateOnHit,
      scoreToWin
    };
  }

  public restartCurrentLevel(): void {
    console.log(`🎯 [CAMPAIGN] Restarting level ${this.currentLevel}`);
    // Level stays the same, just restart the match
  }

  private loadPlayerCampaignLevel(): number {
    try {
      const saved = localStorage.getItem('campaignLevel');
      return saved ? parseInt(saved, 10) : 1;
    } catch (error) {
      console.warn('Failed to load campaign level from localStorage:', error);
      return 1;
    }
  }

  private savePlayerCampaignLevel(level: number): void {
    try {
      localStorage.setItem('campaignLevel', level.toString());
    } catch (error) {
      console.warn('Failed to save campaign level to localStorage:', error);
    }
  }

  private async syncLevelToBackend(): Promise<void> {
    try {
      const user = authService?.getCurrentUser?.();

      if (!user || !(user.userId || user.id)) {
        console.warn('⚠️ [CAMPAIGN] Cannot sync - user not available');
        return;
      }

      const headers = authService?.getAuthHeaders ? authService.getAuthHeaders() : {};
      const url = `/api/user/game/update-stats/${user.userId || user.id}`;
      const body = { campaign_level: this.currentLevel };

      console.log('🎯 [CAMPAIGN] Syncing level to backend:', url, body);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('CampaignManager', `Failed to sync level to server: ${response.status} ${errorText}`);
      } else {
        const responseData = await response.json();
        console.log('✅ [CAMPAIGN] Level synced to database:', responseData);
      }
    } catch (error) {
      logger.error('CampaignManager', 'Exception syncing level to server', error);
    }
  }

  public handleGameEnd(playerWon: boolean, onLevelUp: () => void, onRetry: () => void): void {
    if (!this.isActive) return;

    if (playerWon) {
      console.log('🎯 [CAMPAIGN] Player won! Progressing to next level');
      this.progressToNextLevel();

      if (this.currentLevel <= this.maxLevel) {
        onLevelUp();
      } else {
        // Campaign completed - this will be handled by UI manager
      }
    } else {
      console.log('🎯 [CAMPAIGN] Player lost. Restarting current level');
      onRetry();
    }
  }
}