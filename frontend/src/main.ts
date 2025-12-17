import '../css/style.css';
import '@fortawesome/fontawesome-free/css/all.css';
import { App } from './core/App';

console.log("🚀 [MAIN] Booting System...");

const app = App.getInstance();
app.start();

// Expose for debugging
(window as any).app = app;
