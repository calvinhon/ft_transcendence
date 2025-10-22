// shared/types.ts - Common types used across all services

// User Types
export interface User {
  userId: number;
  username: string;
  email: string;
  display_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile extends User {
  bio?: string;
  avatar_url?: string;
  wins?: number;
  losses?: number;
  total_games?: number;
  win_rate?: number;
}

// Game Types
export interface GamePlayer {
  userId: number;
  username: string;
  socket?: WebSocket;
}

export interface GameState {
  type: 'gameState';
  ball: Ball;
  paddles: Paddles;
  scores: Scores;
  gameState: 'waiting' | 'playing' | 'finished';
}

export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export interface Paddle {
  x: number;
  y: number;
}

export interface Paddles {
  player1: Paddle;
  player2: Paddle;
}

export interface Scores {
  player1: number;
  player2: number;
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
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface JoinGameMessage extends WebSocketMessage {
  type: 'joinGame' | 'joinBotGame';
  userId: number;
  username: string;
}

export interface MovePaddleMessage extends WebSocketMessage {
  type: 'movePaddle';
  direction: 'up' | 'down';
}

export interface GameStartMessage extends WebSocketMessage {
  type: 'gameStart';
  gameId: number;
  players: {
    player1: GamePlayer;
    player2: GamePlayer;
  };
}

export interface GameEndMessage extends WebSocketMessage {
  type: 'gameEnd';
  winner: number;
  scores: Scores;
  gameId?: number;
}

export interface ConnectionAckMessage extends WebSocketMessage {
  type: 'connectionAck';
  message: string;
}

// Tournament Types
export interface Tournament {
  id: number;
  name: string;
  description?: string;
  max_participants: number;
  current_participants: number;
  status: 'upcoming' | 'active' | 'finished';
  created_at: string;
  starts_at?: string;
  ends_at?: string;
  creator_id: number;
}

export interface TournamentParticipant {
  tournament_id: number;
  user_id: number;
  joined_at: string;
  eliminated_at?: string;
  final_position?: number;
}

// Authentication Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  iat?: number;
  exp?: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Chat Types
export interface ChatMessage {
  id?: number;
  user_id: number;
  username: string;
  message: string;
  timestamp: string;
  room?: string;
}

// Online User Types
export interface OnlineUser {
  user_id: number | string;
  username: string;
  display_name: string;
  status: 'online' | 'offline' | 'in-game';
  last_seen: string;
  is_bot: boolean;
}

// Game Statistics Types
export interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
}

// Blockchain Types (for tournament rankings)
export interface BlockchainTournament {
  tournamentId: number;
  name: string;
  participants: string[];
  rankings: string[];
  isFinalized: boolean;
}

// Error Types
export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

// Configuration Types
export interface DatabaseConfig {
  filename: string;
  driver?: string;
}

export interface ServiceConfig {
  port: number;
  host: string;
  cors?: {
    origin: boolean | string | string[];
  };
  jwt?: {
    secret: string;
    expiresIn: string;
  };
}

// Utility Types
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];