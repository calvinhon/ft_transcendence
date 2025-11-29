// frontend/src/managers/tournament/TournamentUIManager.ts
// Handles all tournament UI modals, dialogs, and user interactions

import { showToast } from '../../toast';
import { authManager } from '../auth';
import { playerManager } from '../PlayerManager';

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

interface User {
  userId: number;
  username: string;
}

export class TournamentUIManager {
  private participantMap: { [userId: number]: string } = {};

  constructor() {
    console.log('🏆 [TournamentUIManager] Initialized');
  }

  // Modal management
  public openCreateTournamentModal(): void {
    const modal = document.getElementById('create-tournament-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
  }

  public closeCreateTournamentModal(): void {
    const modal = document.getElementById('create-tournament-modal');
    if (modal) {
      modal.classList.add('hidden');
    }

    // Reset form
    const form = document.getElementById('create-tournament-form') as HTMLFormElement;
    if (form) {
      form.reset();
    }
  }

  // Participant list management
  public populatePartyList(): void {
    const user = authManager?.getCurrentUser();
    if (!user) return;

    // Get local players from PlayerManager
    const localPlayers = playerManager?.getLocalPlayers() || [];

    // Update host name
    const hostNameEl = document.getElementById('tournament-host-name');
    if (hostNameEl) {
      hostNameEl.textContent = user.username;
    }

    // Populate local players list
    const localPlayersContainer = document.getElementById('tournament-local-players');
    if (localPlayersContainer && localPlayers.length > 0) {
      localPlayersContainer.innerHTML = localPlayers.map((player: any) => `
        <div class="participant-item selected" data-player-id="${player.id}" data-player-type="local">
          <input type="checkbox" class="participant-checkbox" data-user-id="${player.userId}" checked />
          <span class="participant-name">${this.escapeHtml(player.username)}</span>
          <span class="participant-badge local">LOCAL</span>
        </div>
      `).join('');
    } else if (localPlayersContainer) {
      localPlayersContainer.innerHTML = '<div class="empty-message">No local players added</div>';
    }

    // Populate online players list (placeholder for now)
    const onlinePlayersContainer = document.getElementById('tournament-online-players');
    if (onlinePlayersContainer) {
      onlinePlayersContainer.innerHTML = '<div class="empty-message">No online players available</div>';
    }

    this.updateParticipantCount();
  }

  public updateParticipantCount(): void {
    const checkboxes = document.querySelectorAll('.participant-checkbox:checked');
    const selectedCount = 1 + checkboxes.length; // +1 for host

    const countEl = document.getElementById('tournament-selected-count');
    if (countEl) {
      countEl.textContent = selectedCount.toString();
    }

    // Update max count from select
    const maxSelect = document.getElementById('max-participants') as HTMLSelectElement;
    const maxCountEl = document.getElementById('tournament-max-count');
    if (maxSelect && maxCountEl) {
      maxCountEl.textContent = maxSelect.value;
    }
  }

  // Side selection dialog
  public showSideSelectionDialog(
    player1Id: number,
    player2Id: number,
    player1Name: string,
    player2Name: string,
    currentUserId: number
  ): Promise<'keep' | 'swap' | null> {
    return new Promise((resolve) => {
      // Create modal backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
      `;

      // Determine current user's name and opponent's name
      const isCurrentPlayer1 = currentUserId === player1Id;
      const currentUserName = isCurrentPlayer1 ? player1Name : player2Name;
      const opponentName = isCurrentPlayer1 ? player2Name : player1Name;

      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 20px;
        padding: 40px;
        max-width: 600px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        color: white;
        text-align: center;
      `;

      modalContent.innerHTML = `
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 32px; margin-bottom: 10px; font-weight: bold;">
            ⚔️ Choose Your Side
          </h2>
          <p style="font-size: 18px; opacity: 0.9;">
            Select which side you want to play on
          </p>
        </div>

        <div style="display: flex; gap: 20px; margin-bottom: 30px; justify-content: center;">
          <button id="side-left-btn" class="side-choice-btn" style="
            flex: 1;
            max-width: 250px;
            padding: 30px 20px;
            background: rgba(255, 255, 255, 0.15);
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 15px;
            color: white;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
          ">
            <div style="font-size: 48px; margin-bottom: 10px;">⬅️</div>
            <div style="font-weight: bold; margin-bottom: 8px;">LEFT SIDE</div>
            <div style="font-size: 14px; opacity: 0.8; margin-bottom: 8px;">Controls: W/S or ↑/↓</div>
            <div style="font-size: 16px; font-weight: bold; color: #ffd700;">
              ${isCurrentPlayer1 ? currentUserName : opponentName}
            </div>
          </button>

          <button id="side-right-btn" class="side-choice-btn" style="
            flex: 1;
            max-width: 250px;
            padding: 30px 20px;
            background: rgba(255, 255, 255, 0.15);
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 15px;
            color: white;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
          ">
            <div style="font-size: 48px; margin-bottom: 10px;">➡️</div>
            <div style="font-weight: bold; margin-bottom: 8px;">RIGHT SIDE</div>
            <div style="font-size: 14px; opacity: 0.8; margin-bottom: 8px;">Controls: U/J</div>
            <div style="font-size: 16px; font-weight: bold; color: #ffd700;">
              ${isCurrentPlayer1 ? opponentName : currentUserName}
            </div>
          </button>
        </div>

        <button id="cancel-side-btn" style="
          padding: 12px 30px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        ">
          Cancel
        </button>
      `;

      backdrop.appendChild(modalContent);
      document.body.appendChild(backdrop);

      // Add hover effects
      const leftBtn = modalContent.querySelector('#side-left-btn') as HTMLElement;
      const rightBtn = modalContent.querySelector('#side-right-btn') as HTMLElement;
      const cancelBtn = modalContent.querySelector('#cancel-side-btn') as HTMLElement;

      const addHoverEffect = (btn: HTMLElement) => {
        btn.addEventListener('mouseenter', () => {
          btn.style.background = 'rgba(255, 255, 255, 0.25)';
          btn.style.border = '3px solid rgba(255, 255, 255, 0.6)';
          btn.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'rgba(255, 255, 255, 0.15)';
          btn.style.border = '3px solid rgba(255, 255, 255, 0.3)';
          btn.style.transform = 'scale(1)';
        });
      };

      addHoverEffect(leftBtn);
      addHoverEffect(rightBtn);

      cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        cancelBtn.style.border = '2px solid rgba(255, 255, 255, 0.5)';
      });
      cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        cancelBtn.style.border = '2px solid rgba(255, 255, 255, 0.3)';
      });

      // Handle button clicks
      leftBtn.addEventListener('click', () => {
        backdrop.remove();
        // If current user is player1, keep order. If player2, swap.
        resolve(isCurrentPlayer1 ? 'keep' : 'swap');
      });

      rightBtn.addEventListener('click', () => {
        backdrop.remove();
        // If current user is player1, swap. If player2, keep order.
        resolve(isCurrentPlayer1 ? 'swap' : 'keep');
      });

      cancelBtn.addEventListener('click', () => {
        backdrop.remove();
        resolve(null);
      });

      // Allow ESC key to cancel
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          backdrop.remove();
          resolve(null);
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
  }

  // Tournament display methods
  public displayAvailableTournaments(tournaments: Tournament[]): void {
    const container = document.getElementById('tournaments-list');
    if (!container) return;

    const availableTournaments = tournaments.filter(t => t.status === 'open');

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

    container.innerHTML = availableTournaments.map(tournament => `
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

  public displayMyTournaments(): void {
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

  // Tab switching
  public switchTab(tabType: string): void {
    // Update tab buttons
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabType);
    });

    // Update content
    switch (tabType) {
      case 'available':
        // This will be handled by the main TournamentManager
        break;
      case 'my-tournaments':
        this.displayMyTournaments();
        break;
    }
  }

  // Utility methods
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

  // Set participant map for bracket rendering
  public setParticipantMap(participantMap: { [userId: number]: string }): void {
    this.participantMap = participantMap;
  }

  public getParticipantMap(): { [userId: number]: string } {
    return this.participantMap;
  }
}