export interface User {
    userId: number;
    username: string;
    email?: string;
    avatarUrl?: string;
    //Hoach added
    campaign_level?: number;
    campaign_mastered?: boolean; // Hoach edited
    // Hoach add ended
}

export interface GameSettings {
    mode: 'classic' | 'arcade' | 'tournament' | 'campaign';
    difficulty: 'easy' | 'medium' | 'hard';
    scoreToWin: number;
    ballSpeed?: 'slow' | 'medium' | 'fast';
    paddleSpeed?: 'slow' | 'medium' | 'fast';
    powerups?: boolean;
    accumulateOnHit?: boolean;
    campaignLevel?: number;
    tournamentId?: number;
    tournamentMatchId?: number;
    tournamentPlayer1Id?: number;
}
