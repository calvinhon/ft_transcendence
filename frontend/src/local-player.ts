// frontend/src/local-player.ts
// Refactored Local Player - Main export file

export { LocalPlayerManager } from './local-player-manager';
export { LocalPlayerModalManager } from './local-player-modal-manager';
export { LocalPlayerAuth } from './local-player-auth';
export { LocalPlayerStorage } from './local-player-storage';

// Backward compatibility exports
export function setupLocalPlayerLoginModal(app: any) {
  const manager = (window as any).localPlayerManager;
  if (manager) {
    manager.setupLocalPlayerLoginModal(app);
  }
}

export function setupLocalPlayerRegisterModal(app: any) {
  const manager = (window as any).localPlayerManager;
  if (manager) {
    manager.setupLocalPlayerRegisterModal(app);
  }
}

export async function registerAndHighlightLocalPlayer(app: any, username: string, email: string, password: string): Promise<void> {
  const manager = (window as any).localPlayerManager;
  if (manager) {
    return manager.registerAndHighlightLocalPlayer(app, username, email, password);
  }
}

export async function registerLocalPlayer(username: string, email: string, password: string, authManager: any): Promise<any> {
  const manager = (window as any).localPlayerManager;
  if (manager) {
    return manager.registerLocalPlayer(username, email, password);
  }
}

export function addLocalPlayerToList(localPlayers: any[], user: any, token: string): any[] {
  const manager = (window as any).localPlayerManager;
  if (manager) {
    return manager.addLocalPlayerToList(localPlayers, user, token);
  }
  return localPlayers;
}

export function setupLocalPlayerListDelegation() {
  const manager = (window as any).localPlayerManager;
  if (manager) {
    manager.setupLocalPlayerListDelegation();
  }
}

// Modal control functions for backward compatibility
export function showLocalPlayerLoginModal() {
  const manager = (window as any).localPlayerManager;
  if (manager) {
    manager.showLoginModal();
  }
}

export function hideLocalPlayerLoginModal() {
  const manager = (window as any).localPlayerManager;
  if (manager) {
    manager.hideLoginModal();
  }
}

export function showLocalPlayerRegisterModal() {
  const manager = (window as any).localPlayerManager;
  if (manager) {
    manager.showRegisterModal();
  }
}

export function hideLocalPlayerRegisterModal() {
  const manager = (window as any).localPlayerManager;
  if (manager) {
    manager.hideRegisterModal();
  }
}

// Initialize the local player manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new LocalPlayerManager();
});
