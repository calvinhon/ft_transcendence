import { Api } from '../core/Api';
import { AuthService } from './AuthService';

export class CampaignService {
    private static instance: CampaignService;
    private currentLevel: number = 1;
    private readonly MAX_LEVEL = 3;

    private constructor() {}

    public static getInstance(): CampaignService {
        if (!CampaignService.instance) {
            CampaignService.instance = new CampaignService();
        }
        return CampaignService.instance;
    }

    public getCurrentLevel(): number {
        return this.currentLevel;
    }

    //Hoach added
    public setCurrentLevel(level: number): void {
        this.currentLevel = Math.max(1, Math.min(level, this.MAX_LEVEL));
    }
    // Hoach add ended
// Hoach Added
    // Hoach edited
    public async loadLevel(): Promise<void> {
        const user = AuthService.getInstance().getCurrentUser();
        if (!user) {
            this.currentLevel = 1;
            return;
        }

        try {
            // Always load from backend - no localStorage fallback for security
            const response = await Api.get(`/api/user/profile/${user.userId}`);
            if (response && typeof response.campaign_level === 'number') {
                this.currentLevel = Math.max(1, Math.min(response.campaign_level, this.MAX_LEVEL));
                console.log(`Campaign level loaded from database: ${this.currentLevel}`);
                return;
            }
        } catch (e) {
            console.warn('Failed to load campaign level from backend', e);
        }

        // Default to level 1 if backend unavailable
        this.currentLevel = 1;
    }
    // Hoach edit ended
// Hoach add ended
    public getMaxLevel(): number {
        return this.MAX_LEVEL;
    }

    public getDifficultyForLevel(level: number): 'easy' | 'medium' | 'hard' {
        if (level === 1) return 'easy';
        if (level === 2) return 'medium';
        return 'hard';
    }

    public async advanceLevel(): Promise<void> {
        if (this.currentLevel < this.MAX_LEVEL) {
            await this.saveLevel(this.currentLevel + 1);
        } else {
            // Already maxed out
            console.log("Campaign completed!");
        }
    }

    public isCompleted(): boolean {
        // Campaign is completed when user reaches the maximum level
        return this.currentLevel >= this.MAX_LEVEL;
    }

    // Hoach edited
    public async isMastered(): Promise<boolean> {
        const user = AuthService.getInstance().getCurrentUser();
        if (!user) return false;

        try {
            // Fetch fresh profile data from server to get campaign_mastered
            const response = await Api.get(`/api/user/profile/${user.userId}`);
            return response.campaign_mastered === true || response.campaign_mastered === 1;
        } catch (e) {
            console.warn('Failed to fetch campaign_mastered status:', e);
            return false;
        }
    }
    // Hoach edit ended

    // Hoach edited
    public async saveLevel(level: number): Promise<void> {
        if (level < 1 || level > this.MAX_LEVEL) return;

        this.currentLevel = level;

        // Sync to backend only - no localStorage for security
        try {
            const user = AuthService.getInstance().getCurrentUser();
            if (user) {
                // Use the new campaign update endpoint for security
                await Api.post(`/api/user/game/update-campaign/${user.userId}`, {
                    missionId: level,
                    completed: true
                });
            }
        } catch (e) {
            console.warn("Failed to sync campaign level to backend", e);
        }
    }
    // Hoach edit ended
}
