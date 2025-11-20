// frontend/src/tournament-ui-manager.ts
// Tournament UI management

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

export class TournamentUIManager {
  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Create tournament button - opens modal
    const createBtn = document.getElementById('create-tournament-btn');
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

    // Create tournament form submission
    const createForm = document.getElementById('create-tournament-form') as HTMLFormElement;
    if (createForm) {
      createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateTournament();
      });
    }

    // Tournament tabs
    const tabButtons = document.querySelectorAll('.tournament-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabType = (e.target as HTMLElement).getAttribute('data-tab');
        if (tabType) {
          this.switchTournamentTab(tabType as 'all' | 'my');
        }
      });
    });

    // Modal overlay click to close
    const modal = document.getElementById('create-tournament-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeCreateTournamentModal();
        }
      });
    }
  }

  private openCreateTournamentModal(): void {
    const modal = document.getElementById('create-tournament-modal');
    if (!modal) {
      console.error('Create tournament modal not found');
      return;
    }

    modal.style.display = 'block';
    this.populatePartyList();
  }

  private closeCreateTournamentModal(): void {
    const modal = document.getElementById('create-tournament-modal');
    if (modal) {
      modal.style.display = 'none';
    }

    const form = document.getElementById('create-tournament-form') as HTMLFormElement;
    if (form) {
      form.reset();
    }
  }

  private populatePartyList(): void {
    const partyList = document.getElementById('tournament-party-list');
    if (!partyList) return;

    const authManager = (window as any).authManager;
    if (!authManager || !authManager.getCurrentUser()) return;

    const user = authManager.getCurrentUser();
    partyList.innerHTML = `
      <div class="party-member host">
        <span class="member-name">${user.username} (Host)</span>
        <span class="member-status">Ready</span>
      </div>
    `;

    // Add local players if any
    const app = (window as any).app;
    if (app && app.playerManager) {
      const localPlayers = app.playerManager.getLocalPlayers();
      localPlayers.forEach(player => {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'party-member';
        memberDiv.innerHTML = `
          <span class="member-name">${player.username}</span>
          <span class="member-status">Local Player</span>
        `;
        partyList.appendChild(memberDiv);
      });
    }
  }

  private async handleCreateTournament(): Promise<void> {
    const nameInput = document.getElementById('tournament-name') as HTMLInputElement;
    const descInput = document.getElementById('tournament-description') as HTMLTextAreaElement;
    const maxParticipantsInput = document.getElementById('tournament-max-participants') as HTMLInputElement;

    if (!nameInput || !maxParticipantsInput) {
      console.error('Required form inputs not found');
      return;
    }

    const tournamentData = {
      name: nameInput.value.trim(),
      description: descInput?.value.trim() || '',
      max_participants: parseInt(maxParticipantsInput.value)
    };

    if (!tournamentData.name) {
      alert('Tournament name is required');
      return;
    }

    if (tournamentData.max_participants < 2 || tournamentData.max_participants > 16) {
      alert('Max participants must be between 2 and 16');
      return;
    }

    // Get data manager and create tournament
    const dataManager = (window as any).tournamentDataManager;
    if (!dataManager) {
      console.error('Tournament data manager not found');
      return;
    }

    const newTournament = await dataManager.createTournament(tournamentData);
    if (newTournament) {
      this.closeCreateTournamentModal();
      this.refreshTournamentList();
      this.showToast('Tournament created successfully!', 'success');
    } else {
      this.showToast('Failed to create tournament', 'error');
    }
  }

  private switchTournamentTab(tabType: 'all' | 'my'): void {
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tournament-tab-btn');
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-tab') === tabType) {
        btn.classList.add('active');
      }
    });

    // Update content
    const allContent = document.getElementById('all-tournaments-content');
    const myContent = document.getElementById('my-tournaments-content');

    if (allContent && myContent) {
      if (tabType === 'all') {
        allContent.style.display = 'block';
        myContent.style.display = 'none';
      } else {
        allContent.style.display = 'none';
        myContent.style.display = 'block';
      }
    }

    // Refresh the active tab
    this.refreshTournamentList();
  }

  public refreshTournamentList(): void {
    const dataManager = (window as any).tournamentDataManager;
    if (!dataManager) return;

    const activeTab = document.querySelector('.tournament-tab-btn.active')?.getAttribute('data-tab') || 'all';

    if (activeTab === 'all') {
      this.displayTournaments(dataManager.getCurrentTournaments(), 'all-tournaments-list');
    } else {
      this.displayTournaments(dataManager.getUserTournaments(), 'my-tournaments-list');
    }
  }

  private displayTournaments(tournaments: Tournament[], containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (tournaments.length === 0) {
      container.innerHTML = '<p class="no-tournaments">No tournaments found</p>';
      return;
    }

    container.innerHTML = tournaments.map(tournament => this.createTournamentCard(tournament)).join('');
    
    // Attach event handlers to dynamically created buttons
    this.attachTournamentActionHandlers(container);
  }

  private attachTournamentActionHandlers(container: HTMLElement): void {
    // Join tournament buttons
    const joinButtons = container.querySelectorAll('.join-tournament-btn');
    joinButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tournamentId = parseInt((e.target as HTMLElement).getAttribute('data-tournament-id') || '0');
        if (tournamentId) {
          this.handleJoinTournament(tournamentId);
        }
      });
    });

    // Start tournament buttons
    const startButtons = container.querySelectorAll('.start-tournament-btn');
    startButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tournamentId = parseInt((e.target as HTMLElement).getAttribute('data-tournament-id') || '0');
        if (tournamentId) {
          this.handleStartTournament(tournamentId);
        }
      });
    });

    // Leave tournament buttons
    const leaveButtons = container.querySelectorAll('.leave-tournament-btn');
    leaveButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tournamentId = parseInt((e.target as HTMLElement).getAttribute('data-tournament-id') || '0');
        if (tournamentId) {
          this.handleLeaveTournament(tournamentId);
        }
      });
    });

    // Delete tournament buttons
    const deleteButtons = container.querySelectorAll('.delete-tournament-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tournamentId = parseInt((e.target as HTMLElement).getAttribute('data-tournament-id') || '0');
        if (tournamentId) {
          this.handleDeleteTournament(tournamentId);
        }
      });
    });
  }

  private createTournamentCard(tournament: Tournament): string {
    const authManager = (window as any).authManager;
    const currentUser = authManager?.getCurrentUser();
    const dataManager = (window as any).tournamentDataManager;

    const canJoin = currentUser && dataManager?.canUserJoin(tournament, currentUser.userId);
    const canStart = currentUser && dataManager?.canUserStart(tournament, currentUser.userId);
    const canDelete = currentUser && dataManager?.canUserDelete(tournament, currentUser.userId);
    const isParticipant = currentUser && dataManager?.isUserParticipant(tournament.id, currentUser.userId);

    return `
      <div class="tournament-card" data-tournament-id="${tournament.id}">
        <div class="tournament-header">
          <h3 class="tournament-name">${tournament.name}</h3>
          <span class="tournament-status status-${tournament.status}">${tournament.status}</span>
        </div>
        <div class="tournament-info">
          <p class="tournament-description">${tournament.description || 'No description'}</p>
          <div class="tournament-details">
            <span class="participants">${tournament.current_participants}/${tournament.max_participants} players</span>
            <span class="created-date">Created: ${new Date(tournament.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="tournament-actions">
          ${canJoin ? `<button class="btn btn-primary join-tournament-btn" data-tournament-id="${tournament.id}">Join</button>` : ''}
          ${canStart ? `<button class="btn btn-success start-tournament-btn" data-tournament-id="${tournament.id}">Start</button>` : ''}
          ${isParticipant ? `<button class="btn btn-warning leave-tournament-btn" data-tournament-id="${tournament.id}">Leave</button>` : ''}
          ${canDelete ? `<button class="btn btn-danger delete-tournament-btn" data-tournament-id="${tournament.id}">Delete</button>` : ''}
        </div>
      </div>
    `;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Use the global toast function if available
    const toast = (window as any).showToast;
    if (toast) {
      toast(message, type);
    } else {
      console.log(`Toast: ${type.toUpperCase()} - ${message}`);
    }
  }

  public showTournamentSection(): void {
    const section = document.getElementById('tournaments-section');
    if (section) {
      // Hide other sections
      document.querySelectorAll('.main-section').forEach(s => {
        (s as HTMLElement).style.display = 'none';
      });
      // Show tournaments section
      section.style.display = 'block';
      // Refresh data
      this.refreshTournamentList();
    }
  }

  private async handleJoinTournament(tournamentId: number): Promise<void> {
    const dataManager = (window as any).tournamentDataManager;
    if (!dataManager) {
      console.error('Tournament data manager not found');
      return;
    }

    const success = await dataManager.joinTournament(tournamentId);
    if (success) {
      this.refreshTournamentList();
      this.showToast('Successfully joined tournament!', 'success');
    } else {
      this.showToast('Failed to join tournament', 'error');
    }
  }

  private async handleStartTournament(tournamentId: number): Promise<void> {
    const dataManager = (window as any).tournamentDataManager;
    if (!dataManager) {
      console.error('Tournament data manager not found');
      return;
    }

    const success = await dataManager.startTournament(tournamentId);
    if (success) {
      this.refreshTournamentList();
      this.showToast('Tournament started!', 'success');
    } else {
      this.showToast('Failed to start tournament', 'error');
    }
  }

  private async handleLeaveTournament(tournamentId: number): Promise<void> {
    const dataManager = (window as any).tournamentDataManager;
    if (!dataManager) {
      console.error('Tournament data manager not found');
      return;
    }

    const success = await dataManager.leaveTournament(tournamentId);
    if (success) {
      this.refreshTournamentList();
      this.showToast('Left tournament successfully', 'success');
    } else {
      this.showToast('Failed to leave tournament', 'error');
    }
  }

  private async handleDeleteTournament(tournamentId: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this tournament?')) {
      return;
    }

    const dataManager = (window as any).tournamentDataManager;
    if (!dataManager) {
      console.error('Tournament data manager not found');
      return;
    }

    const success = await dataManager.deleteTournament(tournamentId);
    if (success) {
      this.refreshTournamentList();
      this.showToast('Tournament deleted successfully', 'success');
    } else {
      this.showToast('Failed to delete tournament', 'error');
    }
  }
}