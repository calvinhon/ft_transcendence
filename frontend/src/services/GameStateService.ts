import { User } from "../types";

export interface GameSetup {
    mode: 'classic' | 'arcade' | 'tournament' | 'campaign';
    settings: {
        ballSpeed: 'slow' | 'medium' | 'fast';
        paddleSpeed: 'slow' | 'medium' | 'fast';
        powerups: boolean;
        accumulateOnHit: boolean;
        difficulty: string;
        scoreToWin: number;
    };
    team1: User[];
    team2: User[];
    tournamentPlayers?: User[]; // For tournament mode
}

export class GameStateService {
    private static instance: GameStateService;
    private readonly STORAGE_KEY = 'pong_game_setup';

    // In-memory cache
    private currentSetup: GameSetup | null = null;

    private constructor() {
        this.loadFromStorage();
    }

    public static getInstance(): GameStateService {
        if (!GameStateService.instance) {
            GameStateService.instance = new GameStateService();
        }
        return GameStateService.instance;
    }

    public setSetup(setup: GameSetup): void {
        this.currentSetup = setup;
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(setup));
    }

    public getSetup(): GameSetup | null {
        if (!this.currentSetup) {
            this.loadFromStorage();
        }
        return this.currentSetup;
    }

    public clearSetup(): void {
        this.currentSetup = null;
        sessionStorage.removeItem(this.STORAGE_KEY);
    }

    private loadFromStorage(): void {
        try {
            const stored = sessionStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.currentSetup = JSON.parse(stored);
            }
        } catch (e) {
            console.error("Failed to load game setup", e);
        }
    }
}
