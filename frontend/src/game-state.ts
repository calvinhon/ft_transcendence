// frontend/src/game-state.ts
// Game state management

import { GameState, GameSettings, TournamentMatch, PaddlePlayer } from './game-interfaces.js';

export class GameStateManager {
  private gameState: GameState | null = null;
  private gameSettings: GameSettings;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private isCampaignMode: boolean = false;
  private currentCampaignLevel: number = 1;
  private countdownValue: number | null = null;
  private currentTournamentMatch: TournamentMatch | null = null;

  // Team player arrays for multiplayer modes
  private team1Players: PaddlePlayer[] = [];
  private team2Players: PaddlePlayer[] = [];

  constructor(defaultSettings: GameSettings) {
    this.gameSettings = { ...defaultSettings };
  }

  // Getters
  getGameState(): GameState | null {
    return this.gameState;
  }

  getGameSettings(): GameSettings {
    return { ...this.gameSettings };
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  getIsCampaignMode(): boolean {
    return this.isCampaignMode;
  }

  getCurrentCampaignLevel(): number {
    return this.currentCampaignLevel;
  }

  getCountdownValue(): number | null {
    return this.countdownValue;
  }

  getCurrentTournamentMatch(): TournamentMatch | null {
    return this.currentTournamentMatch;
  }

  getTeam1Players(): PaddlePlayer[] {
    return [...this.team1Players];
  }

  getTeam2Players(): PaddlePlayer[] {
    return [...this.team2Players];
  }

  // Setters
  setGameState(state: GameState | null): void {
    this.gameState = state;
  }

  setGameSettings(settings: Partial<GameSettings>): void {
    this.gameSettings = { ...this.gameSettings, ...settings };
  }

  setIsPlaying(playing: boolean): void {
    this.isPlaying = playing;
  }

  setIsPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  setIsCampaignMode(campaign: boolean): void {
    this.isCampaignMode = campaign;
  }

  setCurrentCampaignLevel(level: number): void {
    this.currentCampaignLevel = level;
  }

  setCountdownValue(value: number | null): void {
    this.countdownValue = value;
  }

  setCurrentTournamentMatch(match: TournamentMatch | null): void {
    this.currentTournamentMatch = match;
  }

  setTeam1Players(players: PaddlePlayer[]): void {
    this.team1Players = [...players];
  }

  setTeam2Players(players: PaddlePlayer[]): void {
    this.team2Players = [...players];
  }

  // Utility methods
  clearTeamPlayers(): void {
    this.team1Players = [];
    this.team2Players = [];
  }

  resetGameState(): void {
    this.gameState = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.countdownValue = null;
  }
}