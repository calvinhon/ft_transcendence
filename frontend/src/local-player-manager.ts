// frontend/src/local-player-manager.ts
// Main local player manager - orchestrates all local player modules

import { LocalPlayerModalManager } from './local-player-modal-manager';
import { LocalPlayerAuth } from './local-player-auth';
import { LocalPlayerStorage } from './local-player-storage';
import { LocalPlayer } from './types';

export class LocalPlayerManager {
  public modalManager: LocalPlayerModalManager;
  public auth: LocalPlayerAuth;
  public storage: LocalPlayerStorage;

  constructor() {
    console.log('🔧 [LocalPlayerManager] Initializing...');

    this.modalManager = new LocalPlayerModalManager();
    this.auth = new LocalPlayerAuth();
    this.storage = new LocalPlayerStorage();

    // Migrate any legacy data
    this.storage.migrateLegacyData();

    // Make globally available
    (window as any).localPlayerManager = this;

    console.log('✅ [LocalPlayerManager] Initialized');
  }

  // Modal management
  public showLoginModal(): void {
    this.modalManager.showLoginModal();
  }

  public hideLoginModal(): void {
    this.modalManager.hideLoginModal();
  }

  public showRegisterModal(): void {
    this.modalManager.showRegisterModal();
  }

  public hideRegisterModal(): void {
    this.modalManager.hideRegisterModal();
  }

  // Authentication
  public async registerAndHighlightLocalPlayer(
    app: any,
    username: string,
    email: string,
    password: string
  ): Promise<void> {
    return this.auth.registerAndHighlightLocalPlayer(app, username, email, password);
  }

  public async registerLocalPlayer(
    username: string,
    email: string,
    password: string
  ): Promise<any> {
    return this.auth.registerLocalPlayer(username, email, password);
  }

  public addLocalPlayerToList(
    localPlayers: LocalPlayer[],
    user: any,
    token: string
  ): LocalPlayer[] {
    return this.auth.addLocalPlayerToList(localPlayers, user, token);
  }

  // Storage management
  public loadLocalPlayers(): LocalPlayer[] {
    return this.storage.loadLocalPlayers();
  }

  public saveLocalPlayers(players: LocalPlayer[]): void {
    this.storage.saveLocalPlayers(players);
  }

  public addLocalPlayer(player: LocalPlayer): LocalPlayer[] {
    return this.storage.addLocalPlayer(player);
  }

  public removeLocalPlayer(playerId: string): LocalPlayer[] {
    return this.storage.removeLocalPlayer(playerId);
  }

  public updateLocalPlayer(playerId: string, updates: Partial<LocalPlayer>): LocalPlayer[] {
    return this.storage.updateLocalPlayer(playerId, updates);
  }

  public getLocalPlayer(playerId: string): LocalPlayer | undefined {
    return this.storage.getLocalPlayer(playerId);
  }

  public getLocalPlayersByEmail(email: string): LocalPlayer[] {
    return this.storage.getLocalPlayersByEmail(email);
  }

  public clearAllLocalPlayers(): void {
    this.storage.clearAllLocalPlayers();
  }

  public exportLocalPlayers(): string {
    return this.storage.exportLocalPlayers();
  }

  public importLocalPlayers(jsonData: string): { success: boolean; error?: string } {
    return this.storage.importLocalPlayers(jsonData);
  }

  public getStorageStats(): {
    totalPlayers: number;
    storageSize: number;
    lastModified?: Date;
  } {
    return this.storage.getStorageStats();
  }

  // Validation helpers
  public validateRegistrationData(
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ): { valid: boolean; errors: string[] } {
    return this.auth.validateRegistrationData(username, email, password, confirmPassword);
  }

  public validateLoginData(email: string, password: string): { valid: boolean; errors: string[] } {
    return this.auth.validateLoginData(email, password);
  }

  // Setup functions for backward compatibility
  public setupLocalPlayerLoginModal(app: any): void {
    // This is now handled automatically in the modal manager
    console.log('🔧 [LocalPlayerManager] setupLocalPlayerLoginModal called (handled by modal manager)');
  }

  public setupLocalPlayerRegisterModal(app: any): void {
    // This is now handled automatically in the modal manager
    console.log('🔧 [LocalPlayerManager] setupLocalPlayerRegisterModal called (handled by modal manager)');
  }

  public setupLocalPlayerListDelegation(): void {
    console.log('🔧 [LocalPlayerManager] Setting up local player list delegation...');

    // This would handle dynamic event delegation for local player lists
    // For now, it's a placeholder for any future dynamic list management
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Handle local player list actions
      if (target.matches('.local-player-item .edit-btn')) {
        const playerId = target.closest('.local-player-item')?.getAttribute('data-player-id');
        if (playerId) {
          this.handleEditLocalPlayer(playerId);
        }
      } else if (target.matches('.local-player-item .delete-btn')) {
        const playerId = target.closest('.local-player-item')?.getAttribute('data-player-id');
        if (playerId) {
          this.handleDeleteLocalPlayer(playerId);
        }
      }
    });
  }

  private handleEditLocalPlayer(playerId: string): void {
    console.log('✏️ [LocalPlayerManager] Edit local player:', playerId);
    // TODO: Implement edit functionality
    this.showToast('Edit functionality coming soon!', 'info');
  }

  private handleDeleteLocalPlayer(playerId: string): void {
    console.log('🗑️ [LocalPlayerManager] Delete local player:', playerId);

    if (confirm('Are you sure you want to remove this local player?')) {
      this.removeLocalPlayer(playerId);
      this.showToast('Local player removed', 'success');

      // Refresh any displayed lists
      const app = (window as any).app;
      if (app && app.playerManager) {
        app.playerManager.updateGamePartyDisplay();
      }
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const toast = (window as any).showToast;
    if (toast) {
      toast(message, type);
    } else {
      console.log(`Toast: ${type.toUpperCase()} - ${message}`);
    }
  }
}