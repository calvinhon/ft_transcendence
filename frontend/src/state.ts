// state.ts - Centralized app state manager
import type { User, LocalPlayer, GameSettings } from './types';


export interface AppState {
  currentUser: User | null;
  localPlayers: LocalPlayer[];
  gameSettings: GameSettings;
  coopLevel: number; // 1: easy, 2: medium, 3: hard
}

// Add co-op level tracking for host
const defaultState = {
  currentUser: null,
  localPlayers: [],
  gameSettings: {
    gameMode: 'coop',
    aiDifficulty: 'easy',
    ballSpeed: 'medium',
    paddleSpeed: 'medium',
    powerupsEnabled: false,
    accelerateOnHit: false,
    scoreToWin: 3
  },
  coopLevel: 1 // 1: easy, 2: medium, 3: hard
};

let state = { ...defaultState };

export function getCoopLevel(): number {
  return state.coopLevel || 1;
}

export function setCoopLevel(level: number) {
  state.coopLevel = level;
}

export function incrementCoopLevel() {
  if (state.coopLevel < 3) state.coopLevel++;
}
