import { Api } from '../core/Api';
import { App } from '../core/App';
import { GameSettings } from '../types';

export class CampaignService {
    private static instance: CampaignService;
    private currentLevel: number = 1;
    private maxLevel: number = 10;
    private isActive: boolean = false;

    private constructor() { }

    public static getInstance(): CampaignService {
        if (!CampaignService.instance) {
            CampaignService.instance = new CampaignService();
        }
        return CampaignService.instance;
    }

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

        let ballSpeed: 'slow' | 'medium' | 'fast';
        if (level <= 3) ballSpeed = 'slow';
        else if (level <= 6) ballSpeed = 'medium';
        else ballSpeed = 'fast';

        let paddleSpeed: 'slow' | 'medium' | 'fast';
        if (level <= 2) paddleSpeed = 'slow';
        else if (level <= 5) paddleSpeed = 'medium';
        else paddleSpeed = 'fast';

        let difficulty: 'easy' | 'medium' | 'hard';
        if (level <= 3) difficulty = 'easy';
        else if (level <= 7) difficulty = 'medium';
        else difficulty = 'hard';

        const scoreToWin = Math.min(3 + Math.floor((level - 1) / 3), 5);
        const accumulateOnHit = level >= 4; // 'accelerateOnHit' mapped to 'accumulateOnHit'

        return {
            mode: 'campaign',
            difficulty,
            scoreToWin,
            ballSpeed,
            paddleSpeed,
            powerups: false,
            accumulateOnHit
        };
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
            const user = App.getInstance().currentUser;
            if (!user) {
                console.warn('⚠️ [CAMPAIGN] Cannot sync - user not available');
                return;
            }

            const url = `/api/user/game/update-stats/${user.userId}`;
            const body = { campaign_level: this.currentLevel };

            await Api.post(url, body);
            console.log('✅ [CAMPAIGN] Level synced to database');
        } catch (error) {
            console.error('Campaign sync error', error);
        }
    }
}
