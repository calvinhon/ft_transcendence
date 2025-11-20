// frontend/src/game-interfaces.ts
// Game-related interfaces and types

export interface User {
  userId: number;
  username: string;
  email?: string;
}

export interface PaddlePlayer {
  y: number;
  speed: number;
  username?: string;
  userId?: number;
  color?: string;
  team?: number;
  paddleIndex?: number;
}

export interface GameState {
  leftPaddle: { y: number; speed: number };
  rightPaddle: { y: number; speed: number };
  leftPaddles?: Array<PaddlePlayer>; // Multiple paddles for team 1 with player info
  rightPaddles?: Array<PaddlePlayer>; // Multiple paddles for team 2 with player info
  ball: { x: number; y: number; vx: number; vy: number };
  leftScore: number;
  rightScore: number;
  status: string;
  gameWidth: number;
  gameHeight: number;
  paddleHeight: number;
  paddleWidth: number;
  ballRadius: number;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  ballRadius: number;
  paddleSpeed: number;
}

export interface KeyState {
  [key: string]: boolean;
}

export interface GameMessage {
  type: string;
  [key: string]: any;
}

export interface GameSettings {
  gameMode: 'coop' | 'arcade' | 'tournament';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  ballSpeed: 'slow' | 'medium' | 'fast';
  paddleSpeed: 'slow' | 'medium' | 'fast';
  powerupsEnabled: boolean;
  accelerateOnHit: boolean;
  scoreToWin: number;
  team1PlayerCount?: number;
  team2PlayerCount?: number;
}

export interface JoinGameMessage extends GameMessage {
  type: 'joinBotGame';
  userId: number;
  username: string;
  gameSettings: GameSettings;
  player2Id?: number;
  player2Name?: string;
  tournamentId?: number;
  tournamentMatchId?: number;
}

export interface MovePaddleMessage extends GameMessage {
  type: 'movePaddle';
  direction?: 'up' | 'down';
  playerId?: number;
  paddleIndex?: number;
}

export interface TournamentMatch {
  tournamentId: number;
  matchId: number;
  player1Id: number;
  player1Name: string;
  player2Id: number;
  player2Name: string;
  round: number;
  status: 'pending' | 'in_progress' | 'completed';
}