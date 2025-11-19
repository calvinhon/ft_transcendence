// App entry point and initialization
import { Router } from './router';
import { setupLocalPlayerRegisterModal } from './local-player';
import { AuthManager } from './auth';
import { GameManager } from './game';
import { ProfileManager } from './profile';
import { TournamentManager } from './tournament';

// GUARD: Prevent multiple initializations
if ((window as any).__appInitialized) {
  console.error('⚠️⚠️⚠️ main.ts already executed! Preventing duplicate initialization.');
  throw new Error('Application already initialized');
}
(window as any).__appInitialized = true;

// Initialize managers - SINGLETON pattern
if (!(window as any).authManager) {
  (window as any).authManager = new AuthManager();
} else {
  console.warn('⚠️ [MAIN] AuthManager already exists, skipping');
}

if (!(window as any).gameManager) {
  (window as any).gameManager = new GameManager();
} else {
  console.warn('⚠️ [MAIN] GameManager already exists, skipping');
}

if (!(window as any).profileManager) {
  (window as any).profileManager = new ProfileManager();
} else {
  console.warn('⚠️ [MAIN] ProfileManager already exists, skipping');
}

if (!(window as any).tournamentManager) {
  (window as any).tournamentManager = new TournamentManager();
} else {
  console.warn('⚠️ [MAIN] TournamentManager already exists, skipping');
}

// ...initialize app, bind UI, etc...
import { App } from './app';

// FORCE recreation if window.app exists but is not a valid App instance
const existingApp = (window as any).app;
if (existingApp && existingApp.constructor && existingApp.constructor.name === 'App') {
  // Valid App instance already exists, skipping
} else {
  if (existingApp) {
    console.error('⚠️⚠️⚠️ [MAIN] Invalid window.app detected!');
    console.error('Type:', typeof existingApp);
    console.error('Constructor:', existingApp?.constructor?.name);
    console.error('Replacing with valid App instance...');
  }
  const app = new App();
  (window as any).app = app;
  setupLocalPlayerRegisterModal(app);
}
