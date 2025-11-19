// frontend/src/match.ts
// Refactored Match - Main export file

export { MatchManager } from './match-manager';
export { MatchDataManager } from './match-data-manager';
export { MatchUIManager } from './match-ui-manager';
export { MatchSearchManager } from './match-search';

// Backward compatibility exports
export function showOnlinePlayers() {
  const manager = (window as any).matchManager;
  if (manager) {
    manager.showOnlinePlayers();
  }
}

// Global test functions for debugging
(window as any).testOnlinePlayersClick = function() {
  console.log('Testing online players click...');
  const btn = document.getElementById('online-players-btn');
  console.log('Button found:', !!btn);
  if (btn) {
    btn.click();
  }
};

(window as any).testShowOnlinePlayers = function() {
  console.log('Testing show online players directly...');
  const matchManager = (window as any).matchManager;
  if (matchManager) {
    matchManager.showOnlinePlayers();
  } else {
    console.log('No matchManager found');
  }
};

// Initialize the match manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new MatchManager();
});