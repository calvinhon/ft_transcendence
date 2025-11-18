// game-service/src/types.ts
import * as WebSocket from 'ws';

export interface GamePlayer { userId: number; username: string; socket: WebSocket; }
export interface Ball { x: number; y: number; dx: number; dy: number; }
export interface Paddle { x: number; y: number; }
export interface Paddles { player1: Paddle; player2: Paddle; team1?: Paddle[]; team2?: Paddle[]; }
export interface Scores { player1: number; player2: number; }
export interface GameSettings { gameMode: 'coop' | 'arcade' | 'tournament'; aiDifficulty: 'easy' | 'medium' | 'hard'; ballSpeed: 'slow' | 'medium' | 'fast'; paddleSpeed: 'slow' | 'medium' | 'fast'; powerupsEnabled: boolean; accelerateOnHit: boolean; scoreToWin: number; team1PlayerCount?: number; team2PlayerCount?: number; }