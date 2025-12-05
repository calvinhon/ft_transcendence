// frontend/src/managers/tournament/index.ts
// Export all tournament managers

export { TournamentUIManager } from './tournament-ui-manager';
export { TournamentBracketRenderer } from './tournament-bracket-renderer';
export { TournamentDragDropManager } from './tournament-drag-drop-manager';
export { TournamentNetworkManager } from './tournament-network-manager';
export { TournamentDataManager } from './tournament-data-manager';

// New modular managers
export { TournamentCreationManager } from './tournament-creation-manager';
export { TournamentListManager } from './tournament-list-manager';
export { TournamentBracketManager } from './tournament-bracket-manager';
export { TournamentMatchManager } from './tournament-match-manager';
export { TournamentOrchestrator } from './tournament-orchestrator';

import { TournamentOrchestrator } from './tournament-orchestrator';

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