import { Api } from '../core/Api';
import { AuthService } from './AuthService';

// Hoach - campaign progression- backend
// Refactored to be read-only from server. Server handles all level advancement.
export class CampaignService {
    private static instance: CampaignService;
    private currentLevel: number = 1;
    private mastered: boolean = false;
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

    public getMaxLevel(): number {
        return this.MAX_LEVEL;
    }

    /**
     * Load campaign progress from server (source of truth)
     * Hoach - campaign progression- backend
     */
    public async loadLevel(): Promise<void> {
        const user = AuthService.getInstance().getCurrentUser();
        if (!user) {
            this.currentLevel = 1;
            this.mastered = false;
            return;
        }

        try {
            // Hoach - campaign progression- backend: Use dedicated campaign endpoint
            const response = await Api.get(`/api/user/campaign/${user.userId}`);
            if (response) {
                this.currentLevel = Math.max(1, Math.min(response.level || 1, this.MAX_LEVEL));
                this.mastered = response.mastered === true;
                console.log(`[CampaignService] Loaded from server: Level ${this.currentLevel}, Mastered: ${this.mastered}`);
            }
        } catch (e) {
            console.warn('[CampaignService] Failed to load from server, trying legacy endpoint:', e);
            // Fallback to profile endpoint for backwards compatibility
            try {
                const response = await Api.get(`/api/user/profile/${user.userId}`);
                if (response && typeof response.campaign_level === 'number') {
                    this.currentLevel = Math.max(1, Math.min(response.campaign_level, this.MAX_LEVEL));
                    this.mastered = response.campaign_mastered === 1 || response.campaign_mastered === true;
                    console.log(`[CampaignService] Loaded from profile: Level ${this.currentLevel}, Mastered: ${this.mastered}`);
                }
            } catch (e2) {
                console.warn('[CampaignService] Failed to load from profile:', e2);
                this.currentLevel = 1;
                this.mastered = false;
            }
        }
    }

    public getDifficultyForLevel(level: number): 'easy' | 'medium' | 'hard' {
        if (level === 1) return 'easy';
        if (level === 2) return 'medium';
        return 'hard';
    }

    /**
     * Hoach - campaign progression- backend
     * Called after a game ends to refresh state from server.
     * The actual advancement is done server-side by game-service.
     * This replaces the old advanceLevel() method.
     */
    public async refreshAfterGame(): Promise<void> {
        console.log('[CampaignService] Refreshing campaign state from server after game...');
        await this.loadLevel();
    }

    /**
     * @deprecated Use refreshAfterGame() instead. Server handles advancement.
     * Hoach - campaign progression- backend
     */
    public async advanceLevel(): Promise<void> {
        // Server handles level advancement now
        // This just refreshes state from server for backwards compatibility
        console.log('[CampaignService] advanceLevel() called - refreshing from server (server handles actual advancement)');
        await this.refreshAfterGame();
    }

    public isCompleted(): boolean {
        return this.mastered;
    }

    // Hoach - campaign progression- backend
    // REMOVED: saveLevel() - Server handles this now
    // REMOVED: setCompleted() - Server handles this now
}
