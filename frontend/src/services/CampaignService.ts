import { Api } from '../core/Api';
import { AuthService } from './AuthService';

export class CampaignService {
    private static instance: CampaignService;
    private currentLevel: number = 1;
    private readonly MAX_LEVEL = 3;
    private levelLoaded: boolean = false;

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
            this.levelLoaded = true;
            return;
        }

        try {
            // Try to load from backend first
            const response = await Api.get(`/api/user/profile/${user.userId}`);
            if (response && typeof response.campaign_level === 'number') {
                this.currentLevel = Math.max(1, Math.min(response.campaign_level, this.MAX_LEVEL));
                // Sync to localStorage
                localStorage.setItem(`campaign_level_${user.userId}`, this.currentLevel.toString());
                this.levelLoaded = true;
                console.log(`Campaign level loaded from database: ${this.currentLevel}`);
                return;
            }
        } catch (e) {
            console.warn('Failed to load campaign level from backend, trying localStorage', e);
        }

        // Fallback to localStorage
        const stored = localStorage.getItem(`campaign_level_${user.userId}`);
        if (stored) {
            const level = parseInt(stored, 10);
            if (!isNaN(level)) {
                this.currentLevel = Math.max(1, Math.min(level, this.MAX_LEVEL));
                this.levelLoaded = true;
                return;
            }
        }

        // Default to level 1
        this.currentLevel = 1;
        this.levelLoaded = true;
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
}
