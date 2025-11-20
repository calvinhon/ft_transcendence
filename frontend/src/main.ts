// App entry point and initialization
import { Router } from './router';
import { setupLocalPlayerRegisterModal } from './local-player';
import { AuthManager } from './auth';
import { GameManager } from './game';
import { ProfileManager } from './profile';
import { TournamentManager } from './tournament';
import { LocalPlayerModalManager } from './local-player-modal-manager';
import './add-player-modal';

// GUARD: Prevent multiple initializations
if ((window as any).__appInitialized) {
  console.error('⚠️⚠️⚠️ main.ts already executed! Preventing duplicate initialization.');
  throw new Error('Application already initialized');
}
(window as any).__appInitialized = true;

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 [MAIN] DOMContentLoaded fired, initializing app...');
    initializeApp();
  });
} else {
  console.log('🔧 [MAIN] DOM already loaded, initializing app immediately...');
  initializeApp();
}

function initializeApp() {
  console.log('🔧 [MAIN] Starting app initialization...');
  
  // Initialize managers - SINGLETON pattern
  if (!(window as any).authManager) {
    (window as any).authManager = new AuthManager();
    console.log('🔧 [MAIN] AuthManager created');
  } else {
    console.warn('⚠️ [MAIN] AuthManager already exists, skipping');
  }

  if (!(window as any).gameManager) {
    (window as any).gameManager = new GameManager();
    console.log('🔧 [MAIN] GameManager created');
  } else {
    console.warn('⚠️ [MAIN] GameManager already exists, skipping');
  }

  if (!(window as any).profileManager) {
    (window as any).profileManager = new ProfileManager();
    console.log('🔧 [MAIN] ProfileManager created');
  } else {
    console.warn('⚠️ [MAIN] ProfileManager already exists, skipping');
  }

  if (!(window as any).tournamentManager) {
    (window as any).tournamentManager = new TournamentManager();
    console.log('🔧 [MAIN] TournamentManager created');
  } else {
    console.warn('⚠️ [MAIN] TournamentManager already exists, skipping');
  }

  if (!(window as any).localPlayerModalManager) {
    (window as any).localPlayerModalManager = new LocalPlayerModalManager();
    console.log('🔧 [MAIN] LocalPlayerModalManager created');
  } else {
    console.warn('⚠️ [MAIN] LocalPlayerModalManager already exists, skipping');
  }

  // ...initialize app, bind UI, etc...
  import('./app').then(({ App }) => {
    console.log('🔧 [MAIN] App module loaded, creating App instance...');
    // FORCE recreation if window.app exists but is not a valid App instance
    const existingApp = (window as any).app;
    if (existingApp && 
        existingApp.constructor && 
        existingApp.constructor.name === 'App' && 
        typeof existingApp.showScreen === 'function') {
      // Valid App instance already exists, skipping
      console.log('🔧 [MAIN] Valid App instance already exists, skipping creation');
    } else {
      if (existingApp && existingApp.constructor && existingApp.constructor.name !== 'HTMLDivElement') {
        console.error('⚠️⚠️⚠️ [MAIN] Invalid window.app detected!');
        console.error('Type:', typeof existingApp);
        console.error('Constructor:', existingApp?.constructor?.name);
        console.error('Replacing with valid App instance...');
      }
      const app = new App();
      (window as any).app = app;
      setupLocalPlayerRegisterModal(app);
      console.log('🔧 [MAIN] App instance created and stored in window.app');
    }
  }).catch(error => {
    console.error('Failed to load App:', error);
  });
}
