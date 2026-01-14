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
// Hoach Added
    public async loadLevel(): Promise<void> {
        const user = AuthService.getInstance().getCurrentUser();
        if (!user) {
            this.currentLevel = 1;
            return;
        }

        try {
            // Try to load from backend first
            const response = await Api.get(`/api/user/profile/${user.userId}`);
            if (response && typeof response.campaign_level === 'number') {
                this.currentLevel = Math.max(1, Math.min(response.campaign_level, this.MAX_LEVEL + 1));
                console.log(`Campaign level loaded from database: ${this.currentLevel}`);
                return;
            }
        } catch (e) {
            console.warn('Failed to load campaign level from backend', e);
        }

        // Default to level 1 if backend load fails
        this.currentLevel = 1;
    }
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
        if (this.currentLevel <= this.MAX_LEVEL) {
            await this.saveLevel(this.currentLevel + 1);
        }
    }

    public isCompleted(): boolean {
        return this.currentLevel > this.MAX_LEVEL;
    }

    public async saveLevel(level: number): Promise<void> {
        if (level < 1 || level > this.MAX_LEVEL + 1) return;

        this.currentLevel = level;

        // Sync to backend
        const user = AuthService.getInstance().getCurrentUser();
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
}
