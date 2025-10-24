// Add GameSettings interface for shared use
export interface GameSettings {
  gameMode: 'coop' | 'arcade' | 'tournament';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  ballSpeed: 'slow' | 'medium' | 'fast';
  paddleSpeed: 'slow' | 'medium' | 'fast';
  powerupsEnabled: boolean;
  accelerateOnHit: boolean;
  scoreToWin?: number; // Only for arcade mode
}
// Shared interfaces/types
export interface User {
  userId: number;
  username: string;
  email?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  data?: User;
}

export interface LocalPlayer {
  id: string;
  username: string;
  isCurrentUser: boolean;
  userId: number;
  token: string;
}

export interface Route {
  path: string;
  screen: string;
  requiresAuth: boolean;
  title: string;
}
