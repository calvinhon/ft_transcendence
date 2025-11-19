// frontend/src/tournament.ts
// Refactored Tournament - Main export file

export { TournamentManager } from './tournament-manager';
export { TournamentDataManager } from './tournament-data-manager';
export { TournamentUIManager } from './tournament-ui-manager';
export { TournamentLogic } from './tournament-logic';

// Global test functions for debugging
(window as any).testTournamentsClick = function() {
  console.log('Testing tournaments click...');
  const btn = document.getElementById('tournaments-btn');
  console.log('Tournaments button found:', !!btn);
  if (btn) {
    btn.click();
  }
};

(window as any).testShowTournaments = function() {
  console.log('Testing show tournaments directly...');
  const tournamentManager = (window as any).tournamentManager;
  if (tournamentManager) {
    tournamentManager.showTournamentSection();
  } else {
    console.log('No tournamentManager found');
  }
};

(window as any).debugTournamentElements = function() {
  console.log('=== Tournament Elements Debug ===');
  console.log('tournaments-btn:', !!document.getElementById('tournaments-btn'));
  console.log('tournaments-section:', !!document.getElementById('tournaments-section'));
  console.log('tournaments-section classes:', document.getElementById('tournaments-section')?.className);
  console.log('window.tournamentManager:', !!(window as any).tournamentManager);
  console.log('window.appManager:', !!(window as any).appManager);
};