export interface User {
    userId: number;
    username: string;
    email?: string;
    avatarUrl?: string;
}

export interface GameSettings {
    mode: 'arcade' | 'tournament' | 'campaign';
    difficulty: 'easy' | 'medium' | 'hard';
    scoreToWin: number;
    ballSpeed?: 'slow' | 'medium' | 'fast';
    paddleSpeed?: 'slow' | 'medium' | 'fast';
    powerups?: boolean;
    accumulateOnHit?: boolean;
    campaignLevel?: number;
}
