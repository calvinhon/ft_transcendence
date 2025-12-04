// frontend/src/managers/tournament/TournamentCreationManager.ts
// Handles tournament creation, modal management, and participant selection
import { logger } from '../../utils/Logger';

import { showToast } from '../../toast';
import { authManager } from '../auth';
import { playerService } from '../../core/playerService';

export class TournamentCreationManager {
  private networkManager: any;

  constructor(networkManager: any) {
    this.networkManager = networkManager;
  }

  public setupEventListeners(): void {
    console.log('🏆 [CreationManager] Setting up event listeners');

    // Create tournament button - opens modal
    const createBtn = document.getElementById('create-tournament-btn');
    console.log('Create tournament button found:', !!createBtn);
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this.openCreateTournamentModal();
      });
    }

    // Cancel tournament creation
    const cancelBtn = document.getElementById('cancel-tournament');
    const cancelBtn2 = document.getElementById('cancel-tournament-btn');
    [cancelBtn, cancelBtn2].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          this.closeCreateTournamentModal();
        });
      }
    });

    // Create tournament form
    const createForm = document.getElementById('create-tournament-form') as HTMLFormElement;
    if (createForm) {
      createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createTournamentWithParty();
      });
    }
  }

  public openCreateTournamentModal(): void {
    const modal = document.getElementById('create-tournament-modal');
    if (!modal) return;

    // Populate party list
    this.populatePartyList();

    // Show modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  private closeCreateTournamentModal(): void {
    const modal = document.getElementById('create-tournament-modal');
    const form = document.getElementById('create-tournament-form') as HTMLFormElement;

    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
    if (form) {
      form.reset();
    }
  }

  private populatePartyList(): void {
    const user = authManager?.getCurrentUser();

    if (!user) return;

    // Update host name
    const hostNameEl = document.getElementById('tournament-host-name');
    if (hostNameEl) {
      hostNameEl.textContent = user.username;
    }

    // Get local players from playerService
    const localPlayers = playerService.getLocalPlayers();
    const localPlayersContainer = document.getElementById('tournament-local-players-list');

    if (localPlayersContainer && localPlayers.length > 0) {
      localPlayersContainer.innerHTML = localPlayers.map((player: any) => `
        <div class="participant-item selected" data-player-id="${player.id}" data-player-type="local">
          <input type="checkbox" class="participant-checkbox" data-user-id="${player.userId}" checked />
          <span class="participant-name">${this.escapeHtml(player.username)}</span>
          <span class="participant-badge local">LOCAL</span>
        </div>
      `).join('');

      // Add event listeners to checkboxes
      localPlayersContainer.querySelectorAll('.participant-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => this.updateParticipantCount());
      });
    } else if (localPlayersContainer) {
      localPlayersContainer.innerHTML = '<div class="empty-message">No local players added</div>';
    }

    // TODO: Add online players when matchmaking is implemented
    const onlinePlayersContainer = document.getElementById('tournament-online-players-list');
    if (onlinePlayersContainer) {
      onlinePlayersContainer.innerHTML = '<div class="empty-message">No online players available</div>';
    }

    // Initialize count
    this.updateParticipantCount();
  }

  private updateParticipantCount(): void {
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

  private async createTournamentWithParty(): Promise<void> {
    const form = document.getElementById('create-tournament-form') as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const user = authManager?.getCurrentUser();

    if (!user) {
      showToast('You must be logged in to create tournaments', 'error');
      return;
    }

    // Get selected participants
    const selectedCheckboxes = document.querySelectorAll('.participant-checkbox:checked');
    const participantIds: number[] = [user.userId]; // Host is always included

    selectedCheckboxes.forEach((checkbox: any) => {
      const userId = parseInt(checkbox.getAttribute('data-user-id'));
      if (userId && !participantIds.includes(userId)) {
        participantIds.push(userId);
      }
    });

    // Validate minimum participants
    if (participantIds.length < 2) {
      showToast('Need at least 2 participants to start a tournament', 'error');
      return;
    }

    // Generate default tournament name if not provided
    let tournamentName = formData.get('tournament-name') as string;
    if (!tournamentName || tournamentName.trim() === '') {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      tournamentName = `${user.username}'s Tournament - ${dateStr} ${timeStr}`;
    }

    const tournamentData = {
      name: tournamentName,
      description: formData.get('tournament-description') as string || '',
      maxParticipants: parseInt(formData.get('max-participants') as string) || 8,
      createdBy: user.userId,
      participants: participantIds
    };

    try {
      console.log('📝 Creating tournament with data:', tournamentData);

      // Create tournament
      const createResponse = await this.networkManager.createTournament(tournamentData);

      console.log('📤 Create response status:', createResponse.status);
      const createResult = await createResponse.json();
      console.log('📦 Create response body:', createResult);

      if (!createResponse.ok) {
        throw new Error(createResult.error || createResult.message || 'Failed to create tournament');
      }

      const tournamentId = createResult.data.id;
      console.log('✅ Tournament created:', tournamentId);

      // Add all participants to tournament
      console.log('👥 Adding participants:', participantIds);
      for (const userId of participantIds) {
        await this.networkManager.joinTournament(tournamentId, userId);
      }

      // Start tournament automatically
      console.log('🚀 Starting tournament...');
      await this.networkManager.startTournament(tournamentId);

      // Close modal and show success
      this.closeCreateTournamentModal();
      showToast(`Tournament created with ${participantIds.length} players!`, 'success');

      // Return tournament ID for further processing
      return tournamentId;

    } catch (error) {
      logger.error('TournamentCreationManager', 'Create tournament error', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast('Failed to create tournament: ' + errorMessage, 'error');
      throw error;
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