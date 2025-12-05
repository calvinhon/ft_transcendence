// frontend/src/managers/index.ts - Centralized exports for all managers

// App managers
export { appManager } from './app/app-manager';

// Auth managers
export { authManager } from './auth';

// Game managers
export { gameCoordinator } from './game/game-coordinator';

// Profile managers
export { profileManager } from './profile/profile-manager';

// Tournament managers (modular)
export { TournamentOrchestrator, TournamentCreationManager, TournamentListManager } from './tournament';

// Router managers
export { routerCoordinator, routeManager, navigationManager } from './router';

// Utility managers
export { settingsManager } from './settings-manager';
export { playerManager } from './player-manager';
export { eventManager } from '../utils/EventManager';
export { logger } from '../utils/Logger';
export { dragDropManager } from '../utils/DragDropManager';

// Legacy compatibility exports mapped to modular managers
export { AuthManager } from './auth';
export { GameCoordinator as GameManager } from './game/game-coordinator';
export { TournamentOrchestrator as TournamentManager } from './tournament';