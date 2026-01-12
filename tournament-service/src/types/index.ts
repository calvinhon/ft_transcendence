// tournament-service/src/types/index.ts
// Type definitions for tournament service

export interface Tournament {
  id: number;
  name: string;
  current_participants: number;
  status: 'open' | 'active' | 'finished' | 'full';
  created_by: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  winner_id: number | null;
}

export interface TournamentParticipant {
  id: number;
  tournament_id: number;
  user_id: number;
  joined_at: string;
  eliminated_at: string | null;
  final_rank?: number;
}

export interface TournamentMatch {
  id: number;
  tournament_id: number;
  round: number;
  match_number: number;
  player1_id: number | null;
  player2_id: number | null;
  winner_id: number | null;
  player1_score: number;
  player2_score: number;
  status: 'pending' | 'completed';
  played_at: string | null;
}

export interface CreateTournamentBody {
  name: string;
  createdBy: number;
}

export interface JoinTournamentBody {
  tournamentId: number;
  userId: number;
}

export interface MatchResultBody {
  matchId: number;
  winnerId: number;
  player1Score: number;
  player2Score: number;
}

export interface TournamentDetails {
  tournament: Tournament;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  bracket?: BracketStructure;
}

export interface BracketStructure {
  rounds: BracketRound[];
  totalRounds: number;
}

export interface BracketRound {
  round: number;
  matches: BracketMatch[];
}

export interface BracketMatch {
  id: number;
  player1: BracketPlayer | null;
  player2: BracketPlayer | null;
  winner: BracketPlayer | null;
  status: 'pending' | 'completed';
}

export interface BracketPlayer {
  id: number;
  name?: string;
  score?: number;
}

export interface MatchToCreate {
  player1: number;
  player2: number;
  round: number;
  matchNumber: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
