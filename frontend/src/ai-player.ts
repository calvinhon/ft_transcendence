// ai-player.ts - AI logic for co-op mode with difficulty progression

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

export function getNextAIDifficulty(current: AIDifficulty): AIDifficulty | null {
  if (current === 'easy') return 'medium';
  if (current === 'medium') return 'hard';
  return null;
}

// Example AI logic stub (to be integrated with game loop)
export function getAIMove(
  aiProfile: AIProfile,
  ballY: number,
  paddleY: number,
  paddleHeight: number
): number {
  // Simulate reaction delay and error
  if (Math.random() < aiProfile.errorChance) {
    // Make a mistake
    return paddleY + (Math.random() - 0.5) * paddleHeight;
  }
  // Move towards the ball with some delay
  return ballY;
}
