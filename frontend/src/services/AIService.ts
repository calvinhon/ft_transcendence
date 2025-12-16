export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface AIProfile {
    difficulty: AIDifficulty;
    name: string;
    reactionTime: number; // ms
    errorChance: number; // 0-1
}

export const AI_PROFILES: Record<AIDifficulty, AIProfile> = {
    easy: {
        difficulty: 'easy',
        name: 'Easy Bot',
        reactionTime: 350,
        errorChance: 0.25,
    },
    medium: {
        difficulty: 'medium',
        name: 'Medium Bot',
        reactionTime: 200,
        errorChance: 0.12,
    },
    hard: {
        difficulty: 'hard',
        name: 'Hard Bot',
        reactionTime: 100,
        errorChance: 0.04,
    },
};

export class AIService {
    public static getProfile(difficulty: AIDifficulty): AIProfile {
        return AI_PROFILES[difficulty] || AI_PROFILES['medium'];
    }

    public static getNextDifficulty(current: AIDifficulty): AIDifficulty | null {
        if (current === 'easy') return 'medium';
        if (current === 'medium') return 'hard';
        return null;
    }

    /**
     * Client-side AI move prediction for rendering smoothness or offline implementation
     */
    public static getPredictedMove(
        difficulty: AIDifficulty,
        ballY: number,
        paddleY: number,
        paddleHeight: number
    ): number {
        const profile = this.getProfile(difficulty);

        // Simulate reaction delay and error
        if (Math.random() < profile.errorChance) {
            // Make a mistake
            return paddleY + (Math.random() - 0.5) * paddleHeight;
        }

        // Move towards the ball
        return ballY;
    }
}
