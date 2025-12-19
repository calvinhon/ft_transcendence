// game-service/src/routes/modules/types.ts
export interface OnlineUserData {
  username: string;
  sockets: Set<any>; // WebSocket
  lastSeen: Date;
}

export interface GamePlayer {
  userId: number;
  username: string;
  socket: any; // WebSocket
}

export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  frozen?: boolean; // Optional: freeze ball movement during countdown
}

export interface Paddle {
  x: number;
  y: number;
}

export interface Paddles {
  player1: Paddle;
  player2: Paddle;
  team1?: Paddle[]; // Multiple paddles for arcade mode
  team2?: Paddle[]; // Multiple paddles for arcade mode
}

export interface Scores {
  player1: number;
  player2: number;
}

export interface GameState {
  type: 'gameState';
  ball: Ball;
  paddles: Paddles;
  scores: Scores;
  gameState: 'countdown' | 'playing' | 'finished';
  countdownValue?: number; // Only present when gameState is 'countdown'
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface GameSettings {
  gameMode: 'campaign' | 'arcade' | 'tournament';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  ballSpeed: 'slow' | 'medium' | 'fast';
  paddleSpeed: 'slow' | 'medium' | 'fast';
  powerupsEnabled: boolean;
  accelerateOnHit: boolean;
  scoreToWin: number;
  team1PlayerCount?: number; // Number of players on team 1
  team2PlayerCount?: number; // Number of players on team 2
  team1Players?: any[]; // Player data for team 1
  team2Players?: any[]; // Player data for team 2
}

export interface JoinGameMessage extends WebSocketMessage {
  type: 'joinGame' | 'joinBotGame';
  userId: number;
  username: string;
  gameSettings?: GameSettings;
  team1Players?: any[];
  team2Players?: any[];
  player2Id?: number;
  player2Name?: string;
  tournamentId?: number;
  tournamentMatchId?: number;
}

export interface MovePaddleMessage extends WebSocketMessage {
  type: 'movePaddle';
  direction: 'up' | 'down';
  playerId?: number; // For campaign mode - actual database player ID
  paddleIndex?: number; // Index of paddle in team (0, 1, 2)
  side?: 'left' | 'right'; // For tournament/arcade - position-based control
}

export interface InputMessage extends WebSocketMessage {
  type: 'input';
  key: string;
  pressed: boolean;
}

export interface GameRecord {
  id: number;
  player1_id: number;
  player2_id: number;
  player1_score: number;
  player2_score: number;
  status: 'active' | 'finished';
  started_at: string;
  finished_at?: string;
  winner_id?: number;
  player1_name?: string;
  player2_name?: string;
  winner_name?: string;
  game_mode?: string;
  team1_players?: string;
  team2_players?: string;
  tournament_id?: number;
  tournament_match_id?: number;
}

export interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface OnlineUser {
  user_id: number | string;
  username: string;
  display_name: string;
  status: 'online';
  last_seen: string;
  is_bot: boolean;
}