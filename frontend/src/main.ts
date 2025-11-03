// App entry point and initialization
import { Router } from './router';
import { handleHostLogin, handleHostRegister } from './host-auth';
import { setupLocalPlayerRegisterModal } from './local-player';
import { AuthManager } from './auth';
import { GameManager } from './game';

// Initialize managers
(window as any).authManager = new AuthManager();
(window as any).gameManager = new GameManager();

// ...initialize app, bind UI, etc...
import { App } from './app';
const app = new App();
setupLocalPlayerRegisterModal(app);
