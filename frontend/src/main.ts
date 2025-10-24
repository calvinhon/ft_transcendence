// App entry point and initialization
import { Router } from './router';
import { showElement, hideElement } from './ui';
import { handleHostLogin, handleHostRegister } from './host-auth';
import { setupLocalPlayerRegisterModal } from './local-player';

// ...initialize app, bind UI, etc...
import { App } from './app';
const app = new App();
setupLocalPlayerRegisterModal(app);
