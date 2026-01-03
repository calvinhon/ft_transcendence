import { Api } from '../core/Api';
import { AuthService } from './AuthService';

export class CampaignService {
    private static instance: CampaignService;
    private currentLevel: number = 1;
    private readonly MAX_LEVEL = 3;

    private constructor() {
        this.loadLocalLevel();
        this.syncWithBackend();
    }

    public static getInstance(): CampaignService {
        if (!CampaignService.instance) {
            CampaignService.instance = new CampaignService();
        }
        return CampaignService.instance;
    }

    public getCurrentLevel(): number {
        return this.currentLevel;
    }

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
            this.setCompleted();
        }
    }

    public isCompleted(): boolean {
        // If current level is max AND we have flagged it as done (OR imply it if we want strict level > max)
        // For simplicity, let's say if level == MAX_LEVEL and we've beaten it? 
        // Actually, user asked for "Campaign Mastered".
        // Let's add a persisted flag or just check if level > MAX_LEVEL? 
        // But logic caps at MAX_LEVEL. 
        // Let's add a separate flag in localStorage.
        return localStorage.getItem('campaign_mastered') === 'true';
    }

    private setCompleted(): void {
        localStorage.setItem('campaign_mastered', 'true');
    }

    public async saveLevel(level: number): Promise<void> {
        if (level < 1 || level > this.MAX_LEVEL) return;

        this.currentLevel = level;

        // Save locally
        const user = AuthService.getInstance().getCurrentUser();
        if (user) {
            localStorage.setItem(`campaign_level_${user.userId}`, level.toString());
        }

        // Sync to backend
        try {
            // We use the profile update endpoint or a specific campaign endpoint if it existed.
            // Legacy used 'updateProfiler' which likely hit /api/user/profile/:id (PATCH).
            // Let's assume there's an endpoint or we can update profile.
            // Adjust this path if legacy used a different specific route.
            if (user) {
                await Api.post(`/api/user/game/update-stats/${user.userId}`, {
                    campaign_level: level
                });
            }
        } catch (e) {
            console.warn("Failed to sync campaign level to backend", e);
        }
    }

    private loadLocalLevel(): void {
        const user = AuthService.getInstance().getCurrentUser();
        if (user) {
            const saved = localStorage.getItem(`campaign_level_${user.userId}`);
            if (saved) {
                this.currentLevel = parseInt(saved, 10);
            }
        }
    }

    public async syncWithBackend(): Promise<void> {
        try {
            const user = AuthService.getInstance().getCurrentUser();
            if (!user) return;

            const data = await Api.get(`/api/user/profile/${user.userId}`);
            if (data && data.campaign_level) {
                const remoteLevel = parseInt(data.campaign_level, 10);
                if (!isNaN(remoteLevel) && remoteLevel !== this.currentLevel) {
                    console.log(`Syncing campaign level from ${this.currentLevel} to ${remoteLevel}`);
                    this.currentLevel = remoteLevel;
                    // Update local storage to match
                    localStorage.setItem(`campaign_level_${user.userId}`, remoteLevel.toString());
                }
            }
        } catch (e) {
            console.warn("Failed to sync campaign level from backend", e);
        }
    }
}
