// frontend/src/managers/tournament/index.ts
// Export all tournament managers

export { TournamentUIManager } from './TournamentUIManager';
export { TournamentBracketRenderer } from './TournamentBracketRenderer';
export { TournamentDragDropManager } from './TournamentDragDropManager';
export { TournamentNetworkManager } from './TournamentNetworkManager';
export { TournamentDataManager } from './TournamentDataManager';

// New modular managers
export { TournamentCreationManager } from './TournamentCreationManager';
export { TournamentListManager } from './TournamentListManager';
export { TournamentBracketManager } from './TournamentBracketManager';
export { TournamentMatchManager } from './TournamentMatchManager';
export { TournamentOrchestrator } from './TournamentOrchestrator';

import { TournamentOrchestrator } from './TournamentOrchestrator';

let _tournamentManagerInstance: TournamentOrchestrator | null = null;

export function getTournamentManager(): TournamentOrchestrator {
	if (typeof window !== 'undefined' && (window as any).tournamentManager) {
		return (window as any).tournamentManager as TournamentOrchestrator;
	}
	if (!_tournamentManagerInstance) {
		_tournamentManagerInstance = new TournamentOrchestrator();
		if (typeof window !== 'undefined') (window as any).tournamentManager = _tournamentManagerInstance;
	}
	return _tournamentManagerInstance;
}