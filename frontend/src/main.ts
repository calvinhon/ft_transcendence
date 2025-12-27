import '@fortawesome/fontawesome-free/css/all.css';
import { App } from './core/App';
import { BabylonWrapper } from './core/BabylonWrapper';
import { PresenceService } from './services/PresenceService';

// console.log("🚀 [MAIN] Booting System...");

const app = App.getInstance();
app.start()
    .then(() => {
        console.log("App started with user session");
        // Connect presence WebSocket for online status tracking
        PresenceService.getInstance().connect();
    })
    .catch(() => {
        console.log("App started without user session");
    })
    .finally(() => {
        // Initialize BabylonWrapper
        BabylonWrapper.getInstance();

        // Expose for debugging
        (window as any).app = app;
    });
