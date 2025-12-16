// frontend/src/managers/tournament/TournamentListManager.ts
// Handles loading and displaying tournament lists
import { logger } from '../../utils/Logger';

import { showToast } from '../../toast';
import { authManager } from '../auth';

interface Tournament {
  id: number;
  name: string;
  description?: string;
  max_participants: number;
  current_participants: number;
  status: 'open' | 'active' | 'finished' | 'full';
  created_by: number;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  winner_id?: number | null;
}

export class TournamentListManager {
  private networkManager: any;
  private dataManager: any;

  constructor(networkManager: any, dataManager: any) {
    this.networkManager = networkManager;
    this.dataManager = dataManager;
  }

  public setupEventListeners(): void {
    console.log('🏆 [ListManager] Setting up event listeners');

    // Tournament tabs
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabType = btn.getAttribute('data-tab');
        if (tabType) {
          this.switchTab(tabType);
        }
      });
    });
  }

  public async loadTournaments(): Promise<void> {
    console.log('Loading tournaments...');

    try {
      const tournaments = await this.networkManager.loadTournaments();
      this.dataManager.setCurrentTournaments(tournaments);
      this.displayAvailableTournaments();
    } catch (error) {
      logger.error('TournamentListManager', 'Error loading tournaments', error);

      const container = document.getElementById('tournaments-list');
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <p class="error">Network error loading tournaments</p>
            <p class="muted small">${error instanceof Error ? error.message : 'Unknown error'}</p>
            <button class="btn btn-primary" data-action="tournament:reload">Retry</button>
          </div>
        `;
      }
    }
  }

  private switchTab(tabType: string): void {
    // Update tab buttons
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabType);
    });

    // Update content
    switch (tabType) {
      case 'available':
        this.displayAvailableTournaments();
        break;
      case 'my-tournaments':
        this.displayMyTournaments();
        break;
    }
  }

  private displayAvailableTournaments(): void {
    const container = document.getElementById('tournaments-list');
    if (!container) return;

    const availableTournaments = this.dataManager.getCurrentTournaments().filter((t: Tournament) => t.status === 'open');

    if (availableTournaments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏆</div>
          <p class="muted">No tournaments available</p>
          <p class="muted small">Create one to get started!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = availableTournaments.map((tournament: Tournament) => `
      <div class="tournament-card">
        <div class="tournament-info">
          <h3>${this.escapeHtml(tournament.name)}</h3>
          ${tournament.description ? `<p class="tournament-description">${this.escapeHtml(tournament.description)}</p>` : ''}
          <div class="tournament-meta">
            <span class="participants">${tournament.current_participants}/${tournament.max_participants} players</span>
            <span class="status status-${tournament.status}">${tournament.status}</span>
          </div>
          <div class="tournament-details">
            <span class="created-by">Created by: User ${tournament.created_by}</span>
            <span class="created-at">Created: ${new Date(tournament.created_at).toLocaleDateString()}</span>
          </div>
          ${tournament.started_at ? `<div class="start-time">Started: ${new Date(tournament.started_at).toLocaleString()}</div>` : ''}
        </div>
        <div class="tournament-actions">
          ${tournament.status === 'open' ? `
            <button class="btn btn-primary" data-action="tournament:join" data-id="${tournament.id}">
              Join Tournament
            </button>
          ` : ''}
          <button class="btn btn-secondary" data-action="tournament:view" data-id="${tournament.id}">
            View Details
          </button>
        </div>
      </div>
    `).join('');
  }

  private displayMyTournaments(): void {
    const container = document.getElementById('tournaments-list');
    if (!container) return;

    // For now, show empty state as we need to implement user tournaments endpoint
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <p class="muted">No tournaments joined yet</p>
        <p class="muted small">Join a tournament to see it here</p>
      </div>
    `;
  }

  public async joinTournament(tournamentId: number): Promise<void> {
    console.log('Joining tournament:', tournamentId);

    const user = authManager?.getCurrentUser();
    if (!user) {
      showToast('You must be logged in to join tournaments', 'error');
      return;
    }

    try {
      await this.networkManager.joinTournament(tournamentId, (user.userId || user.id));
      showToast('Successfully joined tournament!', 'success');
      this.loadTournaments();
    } catch (error) {
      logger.error('TournamentListManager', 'Join failed', error);
      showToast('Failed to join tournament: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    }
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }
}