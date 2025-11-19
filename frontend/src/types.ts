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

// Tournament interfaces
export interface Tournament {
  id: string;
  name: string;
  status: 'waiting' | 'active' | 'completed';
  maxPlayers: number;
  currentPlayers: number;
  createdAt: string;
  settings: {
    gameMode: 'tournament';
    difficulty: 'easy' | 'medium' | 'hard';
    timeLimit?: number;
    scoreLimit?: number;
  };
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  player1: any; // Player object
  player2: any | null; // Player object or null for bye
  status: 'pending' | 'active' | 'completed';
  winner?: any; // Player object
  createdAt: string;
  completedAt?: string;
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
