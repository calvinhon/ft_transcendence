// frontend/src/tournament-manager.ts
// Main tournament manager - orchestrates all tournament modules

import { TournamentDataManager } from './tournament-data-manager';
import { TournamentUIManager } from './tournament-ui-manager';
import { TournamentLogic } from './tournament-logic';

export class TournamentManager {
  public dataManager: TournamentDataManager;
  public uiManager: TournamentUIManager;
  public logic: TournamentLogic;

  constructor() {
    console.log('TournamentManager constructor called');

    // Initialize all managers
    this.dataManager = new TournamentDataManager();
    this.uiManager = new TournamentUIManager();
    this.logic = new TournamentLogic();

    // Make globally available
    (window as any).tournamentManager = this;
    (window as any).tournamentDataManager = this.dataManager;

    // Initialize
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupEventListeners();
        this.loadInitialData();
      });
    } else {
      this.setupEventListeners();
      this.loadInitialData();
    }
  }

  private setupEventListeners(): void {
    // Tournament card action buttons
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.join-tournament-btn, .leave-tournament-btn, .start-tournament-btn, .delete-tournament-btn') as HTMLElement;

      if (button) {
        e.preventDefault();
        const tournamentId = parseInt(button.getAttribute('data-tournament-id') || '0');
        const action = button.className.match(/(join|leave|start|delete)-tournament-btn/)?.[1];

        if (tournamentId && action) {
          this.handleTournamentAction(action, tournamentId);
        }
      }
    });

    // Tournament navigation
    const tournamentsBtn = document.getElementById('tournaments-btn');
    if (tournamentsBtn) {
      tournamentsBtn.addEventListener('click', () => {
        this.uiManager.showTournamentSection();
      });
    }
  }

  private async loadInitialData(): Promise<void> {
    await this.dataManager.loadTournaments();

    // Load user tournaments if authenticated
    const authManager = (window as any).authManager;
    if (authManager && authManager.getCurrentUser()) {
      await this.dataManager.loadUserTournaments(authManager.getCurrentUser().userId);
    }

    // Refresh UI
    this.uiManager.refreshTournamentList();
  }

  private async handleTournamentAction(action: string, tournamentId: number): Promise<void> {
    const tournament = this.dataManager.getTournamentById(tournamentId);
    if (!tournament) {
      console.error('Tournament not found:', tournamentId);
      return;
    }

    let success = false;
    let message = '';

    switch (action) {
      case 'join':
        success = await this.dataManager.joinTournament(tournamentId);
        message = success ? 'Joined tournament successfully!' : 'Failed to join tournament';
        break;

      case 'leave':
        success = await this.dataManager.leaveTournament(tournamentId);
        message = success ? 'Left tournament successfully!' : 'Failed to leave tournament';
        break;

      case 'start':
        const validation = this.logic.validateTournamentStart(tournament);
        if (!validation.canStart) {
          this.showToast(validation.reason || 'Cannot start tournament', 'error');
          return;
        }
        success = await this.dataManager.startTournament(tournamentId);
        message = success ? 'Tournament started successfully!' : 'Failed to start tournament';
        break;

      case 'delete':
        if (confirm('Are you sure you want to delete this tournament?')) {
          success = await this.dataManager.deleteTournament(tournamentId);
          message = success ? 'Tournament deleted successfully!' : 'Failed to delete tournament';
        }
        break;
    }

    if (message) {
      this.showToast(message, success ? 'success' : 'error');
    }

    if (success) {
      // Refresh data and UI
      await this.loadInitialData();
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

  // Public API methods
  public async createTournament(data: {
    name: string;
    description?: string;
    max_participants: number;
  }): Promise<any> {
    const validation = this.logic.validateTournamentData(data);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    return await this.dataManager.createTournament(data);
  }

  public async refreshTournaments(): Promise<void> {
    await this.loadInitialData();
  }

  public getTournamentStats(tournamentId: number): any {
    const tournament = this.dataManager.getTournamentById(tournamentId);
    if (!tournament) return null;

    // This would need participant data from API
    const participants: any[] = [];
    return this.logic.getTournamentStatistics(tournament, participants);
  }

  public showTournamentSection(): void {
    this.uiManager.showTournamentSection();
  }
}