// frontend/src/managers/index.ts - Centralized exports for all managers

// App managers
export { appManager } from './app/AppManager';

// Auth managers
export { authManager } from './auth';

// Game managers
export { gameCoordinator } from './game/GameCoordinator';

// Profile managers
export { profileManager } from './profile/ProfileManager';

// Tournament managers (modular)
export { TournamentOrchestrator, TournamentCreationManager, TournamentListManager } from './tournament';

// Router managers
export { routerCoordinator, routeManager, navigationManager } from './router';

// Utility managers
export { settingsManager } from './SettingsManager';
export { playerManager } from './PlayerManager';
export { eventManager } from '../utils/EventManager';
export { logger } from '../utils/Logger';
export { dragDropManager } from '../utils/DragDropManager';

// Legacy compatibility exports mapped to modular managers
export { AuthManager } from './auth';
export { GameCoordinator as GameManager } from './game/GameCoordinator';
export { TournamentOrchestrator as TournamentManager } from './tournament';