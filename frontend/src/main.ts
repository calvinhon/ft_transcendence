import '../css/style.css';
import '@fortawesome/fontawesome-free/css/all.css';
import { App } from './core/App';
import { BabylonWrapper } from './core/BabylonWrapper';

console.log("🚀 [MAIN] Booting System...");

const app = App.getInstance();
app.start();

// Initialize BabylonWrapper
BabylonWrapper.getInstance();

// Expose for debugging
(window as any).app = app;
