// App entry point and initialization
import { Router } from './router';
import { handleHostLogin, handleHostRegister } from './host-auth';
import { setupLocalPlayerRegisterModal } from './local-player';
import { AuthManager } from './auth';
import { GameManager } from './game';

console.log('🚀 [MAIN] main.ts executing...');

// GUARD: Prevent multiple initializations
if ((window as any).__appInitialized) {
  console.error('⚠️⚠️⚠️ main.ts already executed! Preventing duplicate initialization.');
  throw new Error('Application already initialized');
}
(window as any).__appInitialized = true;

// Initialize managers - SINGLETON pattern
if (!(window as any).authManager) {
  console.log('✅ [MAIN] Creating AuthManager');
  (window as any).authManager = new AuthManager();
} else {
  console.warn('⚠️ [MAIN] AuthManager already exists, skipping');
}

if (!(window as any).gameManager) {
  console.log('✅ [MAIN] Creating GameManager');
  (window as any).gameManager = new GameManager();
} else {
  console.warn('⚠️ [MAIN] GameManager already exists, skipping');
}

// ...initialize app, bind UI, etc...
import { App } from './app';

// FORCE recreation if window.app exists but is not a valid App instance
const existingApp = (window as any).app;
if (existingApp && existingApp.constructor && existingApp.constructor.name === 'App') {
  console.log('✅ [MAIN] Valid App instance already exists, skipping');
} else {
  if (existingApp) {
    console.error('⚠️⚠️⚠️ [MAIN] Invalid window.app detected!');
    console.error('Type:', typeof existingApp);
    console.error('Constructor:', existingApp?.constructor?.name);
    console.error('Replacing with valid App instance...');
  } else {
    console.log('✅ [MAIN] Creating App');
  }
  const app = new App();
  (window as any).app = app;
  setupLocalPlayerRegisterModal(app);
}

console.log('🏁 [MAIN] main.ts initialization complete');
