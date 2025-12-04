import { showToast } from './toast';
// Stub file - tournament module
// frontend/src/tournament.ts - TypeScript version of tournament manager

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

// Global test function for debugging
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
  const appManager = (window as any).appManager;
  if (appManager) {
    appManager.showSection('tournaments');
  } else {
    console.log('No appManager found');
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

export class TournamentManager {
  private baseURL: string = '/api/tournament';
  private currentTournaments: Tournament[] = [];
  private userTournaments: Tournament[] = [];
  private participantMap: { [userId: number]: string } = {};

  constructor() {
    console.log('TournamentManager constructor called');
    
    // Check if running in development mode (direct service access)
    // Use development URL only when explicitly running on a non-standard port
    if (window.location.hostname === 'localhost' && window.location.port && window.location.port !== '80') {
      // Direct service access for development
      this.baseURL = 'http://localhost:3003';
      console.log('TournamentManager: Using direct service URL for development');
    }
    
    // Wait for DOM to be ready before setting up
    if (document.readyState === 'loading') {
      console.log('DOM not ready, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded fired, setting up event listeners');
        this.setupEventListeners();
        // Load initial data
        this.loadTournaments();
      });
    } else {
      console.log('DOM already ready, setting up event listeners immediately');
      this.setupEventListeners();
      // Load initial data
      this.loadTournaments();
    }
  }

  private setupEventListeners(): void {
    console.log('Setting up tournament event listeners');
    
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

  private openCreateTournamentModal(): void {
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
    const authManager = (window as any).authManager;
    const app = (window as any).app;
    const user = authManager?.getCurrentUser();
    
    if (!user) return;

    // Update host name
    const hostNameEl = document.getElementById('tournament-host-name');
    if (hostNameEl) {
      hostNameEl.textContent = user.username;
    }

    // Get local players from app
    const localPlayers = app?.localPlayers || [];
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
    const authManager = (window as any).authManager;
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
      const createResponse = await fetch(`${this.baseURL}/tournaments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify(tournamentData)
      });

      console.log('📤 Create response status:', createResponse.status);
      const createResult = await createResponse.json();
      console.log('📦 Create response body:', createResult);

      if (!createResponse.ok) {
        throw new Error(createResult.error || createResult.message || 'Failed to create tournament');
      }

      const tournamentId = createResult.data.id;
      console.log('✅ Tournament created:', tournamentId); // Fixed property access

      // Add all participants to tournament
      console.log('👥 Adding participants:', participantIds);
      for (const userId of participantIds) {
        const joinResponse = await fetch(`${this.baseURL}/tournaments/${tournamentId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authManager.getAuthHeaders()
          },
          body: JSON.stringify({ userId })
        });
        
        if (!joinResponse.ok) {
          const joinResult = await joinResponse.json();
          console.error('❌ Failed to add participant:', userId, joinResult);
        } else {
          console.log('✅ Added participant:', userId);
        }
      }

      // Start tournament automatically
      console.log('🚀 Starting tournament...');
      const startResponse = await fetch(`${this.baseURL}/tournaments/${tournamentId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify({})
      });

      const startResult = await startResponse.json();
      console.log('📦 Start response:', startResult);

      if (!startResponse.ok) {
        throw new Error(startResult.error || startResult.message || 'Failed to start tournament');
      }

      console.log('✅ Tournament started:', startResult);

      // Close modal and show success
      this.closeCreateTournamentModal();
      showToast(`Tournament created with ${participantIds.length} players!`, 'success');

      // Load tournament details to show bracket
      this.viewTournament(tournamentId);
      
    } catch (error) {
      console.error('❌ Create tournament error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast('Failed to create tournament: ' + errorMessage, 'error');
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

  public async loadTournaments(): Promise<void> {
    console.log('Loading tournaments...');
    
    try {
      const authManager = (window as any).authManager;
      const headers = authManager ? authManager.getAuthHeaders() : {};
      
      console.log('Using headers:', headers);
      console.log('Fetching from:', this.baseURL);
      
      const response = await fetch(`${this.baseURL}/tournaments`, { headers });
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const tournaments: Tournament[] = await response.json();
        console.log('Received tournaments:', tournaments);
        this.currentTournaments = tournaments;
        this.displayAvailableTournaments();
      } else {
        console.error('Failed to load tournaments:', response.status, response.statusText);
        const errorBody = await response.text();
        console.error('Error body:', errorBody);
        
        const container = document.getElementById('tournaments-list');
        if (container) {
          container.innerHTML = `
            <div class="empty-state">
              <p class="error">Failed to load tournaments</p>
              <p class="muted small">Status: ${response.status} ${response.statusText}</p>
              <button class="btn btn-primary" onclick="window.tournamentManager.loadTournaments()">Retry</button>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
      
      const container = document.getElementById('tournaments-list');
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <p class="error">Network error loading tournaments</p>
            <p class="muted small">${error instanceof Error ? error.message : 'Unknown error'}</p>
            <button class="btn btn-primary" onclick="window.tournamentManager.loadTournaments()">Retry</button>
          </div>
        `;
      }
    }
  }

  private displayAvailableTournaments(): void {
    const container = document.getElementById('tournaments-list');
    if (!container) return;
    
    const availableTournaments = this.currentTournaments.filter(t => t.status === 'open');
    
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
            <button class="btn btn-primary" onclick="window.tournamentManager.joinTournament(${tournament.id})">
              Join Tournament
            </button>
          ` : ''}
          <button class="btn btn-secondary" onclick="window.tournamentManager.viewTournament(${tournament.id})">
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

  private async createTournament(): Promise<void> {
    const form = document.getElementById('create-tournament-form') as HTMLFormElement;
    if (!form) return;
    
    const formData = new FormData(form);
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    
    if (!user) {
  showToast('You must be logged in to create tournaments', 'error');
      return;
    }
    
    const tournamentData = {
      name: formData.get('tournament-name') as string,
      description: formData.get('tournament-description') as string || '',
      maxParticipants: parseInt(formData.get('max-participants') as string) || 8,
      createdBy: user.userId
    };

    try {
      const response = await fetch(`${this.baseURL}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify(tournamentData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Tournament created:', result);
        
        // Hide modal and reset form
        const modal = document.getElementById('create-tournament-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
        form.reset();
        
        // Reload tournaments
        this.loadTournaments();
        
  showToast('Tournament created successfully!', 'success');
      } else {
        let errorMessage = 'Unknown error';
        try {
          const result = await response.json();
          errorMessage = result.error || result.message || 'Server error';
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        console.error('Create tournament failed:', errorMessage);
  showToast('Failed to create tournament: ' + errorMessage, 'error');
      }
    } catch (error) {
      console.error('Create tournament network error:', error);
  showToast('Failed to create tournament: Network error', 'error');
    }
  }

  public async joinTournament(tournamentId: number): Promise<void> {
    console.log('Joining tournament:', tournamentId);
    
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    if (!user) {
  showToast('You must be logged in to join tournaments', 'error');
      return;
    }

    try {
      const joinURL = `${this.baseURL}/join`;
      console.log('Join URL:', joinURL);
      
      const requestData = {
        tournamentId: parseInt(tournamentId.toString()),
        userId: parseInt(user.userId.toString())
      };
      console.log('Request data:', requestData);

      const response = await fetch(joinURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('Join success:', result);
  showToast('Successfully joined tournament!', 'success');
        this.loadTournaments();
      } else {
        let errorMessage = 'Unknown error';
        try {
          const result = await response.json();
          errorMessage = result.error || result.message || 'Server error';
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        console.error('Join failed:', errorMessage);
  showToast('Failed to join tournament: ' + errorMessage, 'error');
      }
    } catch (error) {
      console.error('Join tournament network error:', error);
  showToast('Failed to join tournament: Network error - ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    }
  }

  public async viewTournament(tournamentId: number): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.baseURL}/tournaments/${tournamentId}`, {
        headers: {
          ...authManager.getAuthHeaders()
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load tournament details');
      }

      const details = await response.json();
      console.log('Tournament details (before username fetch):', details);

      // Fetch usernames for all participants
      const participantsWithNames = await Promise.all(
        details.participants.map(async (p: any) => {
          try {
            const userResponse = await fetch(`/api/auth/profile/${p.user_id}`, {
              headers: authManager.getAuthHeaders()
            });
            if (userResponse.ok) {
              const result = await userResponse.json();
              if (result.success && result.data) {
                return { ...p, username: result.data.username };
              }
            }
          } catch (err) {
            console.error(`Failed to fetch username for user ${p.user_id}:`, err);
          }
          return { ...p, username: `Player ${p.user_id}` };
        })
      );

      details.participants = participantsWithNames;
      console.log('Tournament details (after username fetch):', details);

      // Show bracket modal
      this.showBracketModal(details);
    } catch (error) {
      console.error('View tournament error:', error);
      showToast('Failed to load tournament details', 'error');
    }
  }

  private showBracketModal(details: any): void {
    const { tournament, participants, matches } = details;

    // Create player ID to name map
    this.participantMap = {};
    participants.forEach((p: any) => {
      this.participantMap[p.user_id] = p.username || `Player ${p.user_id}`;
    });

    // Create bracket modal
    const modalHTML = `
      <div id="tournament-bracket-modal" class="modal" style="display: flex;">
        <div class="modal-overlay" onclick="document.getElementById('tournament-bracket-modal').remove()"></div>
        <div class="modal-content tournament-bracket-modal" style="max-width: 1200px; width: 90%;">
          <div class="modal-header">
            <h2 class="modal-title">${this.escapeHtml(tournament.name)}</h2>
            <button type="button" class="modal-close" onclick="document.getElementById('tournament-bracket-modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="tournament-status">
              <span class="status-badge status-${tournament.status}">${tournament.status.toUpperCase()}</span>
              <span>${participants.length} players</span>
              ${tournament.winner_id ? `<span class="winner-badge">🏆 Winner: ${this.participantMap[tournament.winner_id] || 'Unknown'}</span>` : ''}
            </div>

            <div class="tournament-bracket">
              ${this.renderBracket(matches, participants, tournament)}
            </div>

            ${tournament.status === 'finished' ? `
              <div class="tournament-complete">
                <button class="btn btn-primary" onclick="window.tournamentManager.recordOnBlockchain(${tournament.id}, ${tournament.winner_id})">
                  <i class="fas fa-link"></i> Record on Blockchain
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('tournament-bracket-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Initialize drag and drop for pending matches (with slight delay to ensure DOM is ready)
    setTimeout(() => {
      this.initializeDragAndDrop();
    }, 100);
  }

  private renderBracket(matches: any[], participants: any[], tournament: any): string {
    console.log('🎯 Rendering bracket with matches:', matches);
    
    if (!matches || matches.length === 0) {
      return '<div class="empty-state"><p>No matches scheduled yet</p></div>';
    }

    // Group matches by round
    const rounds: { [key: number]: any[] } = {};
    matches.forEach(match => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });

    const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
    console.log('🎯 Rounds:', roundNumbers, 'Grouped:', rounds);
    
    return roundNumbers.map(roundNum => {
      const roundMatches = rounds[roundNum];
      const roundName = this.getRoundName(roundNum, roundNumbers.length);
      
      return `
        <div class="bracket-round">
          <h3 class="round-title">${roundName}</h3>
          <div class="round-matches">
            ${roundMatches.map(match => this.renderMatch(match, tournament)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  private getRoundName(roundNum: number, totalRounds: number): string {
    const fromEnd = totalRounds - roundNum + 1;
    if (fromEnd === 1) return 'Final';
    if (fromEnd === 2) return 'Semi-Finals';
    if (fromEnd === 3) return 'Quarter-Finals';
    return `Round ${roundNum}`;
  }

  private renderMatch(match: any, tournament: any): string {
    const player1Name = match.player1_id === 0 ? 'BYE' : (this.participantMap[match.player1_id] || `Player ${match.player1_id}`);
    const player2Name = match.player2_id === 0 ? 'BYE' : (this.participantMap[match.player2_id] || `Player ${match.player2_id}`);
    const isCompleted = match.status === 'completed';
    const isPending = match.status === 'pending' && match.player1_id && match.player2_id;
    const isBye = match.player1_id === 0 || match.player2_id === 0;

    // For pending matches, make players draggable
    const draggableAttr = isPending && tournament.status === 'active' ? 'draggable="true"' : '';
    const dragClass = isPending && tournament.status === 'active' ? 'draggable-player' : '';

    return `
      <div class="match-card ${isCompleted ? 'completed' : ''} ${isBye ? 'bye' : ''}" 
           data-match-id="${match.id}"
           data-tournament-id="${tournament.id}">
        <div class="match-header">
          <span class="match-number">Match ${match.match_number}</span>
          ${isCompleted ? '<span class="match-status-badge">✓</span>' : ''}
          ${isPending && tournament.status === 'active' ? '<span class="drag-hint">🔄 Drag to swap sides</span>' : ''}
        </div>
        <div class="match-players-container" data-match-id="${match.id}">
          <div class="match-player-slot left-slot" data-side="left">
            <div class="side-label">
              <span class="side-icon">⬅️</span>
              <span class="side-text">LEFT</span>
              <span class="side-controls">W/S or ↑/↓</span>
            </div>
            <div class="match-player ${match.winner_id === match.player1_id ? 'winner' : ''} ${dragClass}"
                 ${draggableAttr}
                 data-player-id="${match.player1_id}"
                 data-player-name="${player1Name}"
                 data-original-side="left">
              <span class="player-name">${player1Name}</span>
              ${isCompleted ? `<span class="player-score">${match.player1_score || 0}</span>` : ''}
            </div>
          </div>
          
          <div class="match-vs">VS</div>
          
          <div class="match-player-slot right-slot" data-side="right">
            <div class="side-label">
              <span class="side-icon">➡️</span>
              <span class="side-text">RIGHT</span>
              <span class="side-controls">U/J</span>
            </div>
            <div class="match-player ${match.winner_id === match.player2_id ? 'winner' : ''} ${dragClass}"
                 ${draggableAttr}
                 data-player-id="${match.player2_id}"
                 data-player-name="${player2Name}"
                 data-original-side="right">
              <span class="player-name">${player2Name}</span>
              ${isCompleted ? `<span class="player-score">${match.player2_score || 0}</span>` : ''}
            </div>
          </div>
        </div>
        ${isPending && tournament.status === 'active' ? `
          <button class="btn btn-sm btn-primary match-play-btn" 
                  onclick="window.tournamentManager.playMatchFromCard(${tournament.id}, ${match.id})">
            <i class="fas fa-play"></i> Play Match
          </button>
        ` : ''}
      </div>
    `;
  }

  public async playMatch(tournamentId: number, matchId: number, player1Id: number, player2Id: number): Promise<void> {
    console.log('Playing tournament match:', { tournamentId, matchId, player1Id, player2Id });
    
    // Close bracket modal
    const modal = document.getElementById('tournament-bracket-modal');
    if (modal) {
      modal.remove();
    }

    // Navigate to game screen with tournament mode
    const app = (window as any).app;
    const authManager = (window as any).authManager;
    const currentUser = authManager?.getCurrentUser();
    
    if (app && app.startGame && currentUser) {
      // Check if current user is player 1 or player 2
      const isPlayer1 = currentUser.userId === player1Id;
      const isPlayer2 = currentUser.userId === player2Id;
      
      if (!isPlayer1 && !isPlayer2) {
        // Spectator mode - not implemented yet
        showToast('You are not a participant in this match', 'error');
        return;
      }

      // Show side selection dialog
      const sideChoice = await this.showSideSelectionDialog(
        player1Id, 
        player2Id, 
        this.participantMap[player1Id] || `Player ${player1Id}`,
        this.participantMap[player2Id] || `Player ${player2Id}`,
        currentUser.userId
      );

      // If user cancelled, don't start the match
      if (!sideChoice) {
        return;
      }

      // Apply side swap if user chose right side
      let finalPlayer1Id = player1Id;
      let finalPlayer2Id = player2Id;
      let finalPlayer1Name = this.participantMap[player1Id] || `Player ${player1Id}`;
      let finalPlayer2Name = this.participantMap[player2Id] || `Player ${player2Id}`;

      if (sideChoice === 'swap') {
        // Swap the players
        finalPlayer1Id = player2Id;
        finalPlayer2Id = player1Id;
        finalPlayer1Name = this.participantMap[player2Id] || `Player ${player2Id}`;
        finalPlayer2Name = this.participantMap[player1Id] || `Player ${player1Id}`;
        console.log('🔄 [Tournament] Players swapped - User chose RIGHT side');
      } else {
        console.log('✅ [Tournament] Players in original order - User chose LEFT side');
      }

      // Set tournament match data with player names and IDs
      app.currentTournamentMatch = {
        tournamentId,
        matchId,
        player1Id: finalPlayer1Id,
        player2Id: finalPlayer2Id,
        player1Name: finalPlayer1Name,
        player2Name: finalPlayer2Name,
        originalPlayer1Id: player1Id, // Keep original for result recording
        originalPlayer2Id: player2Id
      };

      // Set game mode to tournament
      app.gameSettings = app.gameSettings || {};
      app.gameSettings.gameMode = 'tournament';
      
      // DON'T clear localPlayers - preserve them for faster restart
      // app.localPlayers should persist across matches
      console.log('🏆 [Tournament] Preserving localPlayers for match restart');
      
      console.log('🏆 [Tournament] Setting up players for match');
      console.log('🏆 [Tournament] Current user:', currentUser.userId);
      console.log('🏆 [Tournament] Player 1 (LEFT):', finalPlayer1Id, finalPlayer1Name);
      console.log('🏆 [Tournament] Player 2 (RIGHT):', finalPlayer2Id, finalPlayer2Name);

      // Start the game
      await app.startGame();
    } else {
      showToast('Game start failed', 'error');
    }
  }

  private initializeDragAndDrop(): void {
    const draggablePlayers = document.querySelectorAll('.draggable-player');
    const playerSlots = document.querySelectorAll('.match-player-slot');

    console.log('🎯 [DRAG-DROP] Initializing drag and drop:');
    console.log('  - Draggable players found:', draggablePlayers.length);
    console.log('  - Player slots found:', playerSlots.length);
    
    if (draggablePlayers.length === 0) {
      console.warn('⚠️ [DRAG-DROP] No draggable players found! Check if tournament is active and matches are pending.');
      return;
    }

    draggablePlayers.forEach((player, index) => {
      const playerElement = player as HTMLElement;
      console.log(`  - Player ${index}:`, {
        name: playerElement.getAttribute('data-player-name'),
        draggable: playerElement.getAttribute('draggable'),
        hasClass: playerElement.classList.contains('draggable-player')
      });

      player.addEventListener('dragstart', (e: Event) => {
        const dragEvent = e as DragEvent;
        const target = dragEvent.target as HTMLElement;
        target.classList.add('dragging');
        dragEvent.dataTransfer!.effectAllowed = 'move';
        dragEvent.dataTransfer!.setData('text/plain', target.getAttribute('data-player-id') || '');
        console.log('🎯 [DRAG-DROP] Drag started:', target.getAttribute('data-player-name'));
      });

      player.addEventListener('dragend', (e: Event) => {
        const target = e.target as HTMLElement;
        target.classList.remove('dragging');
        // Clean up all drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        console.log('🎯 [DRAG-DROP] Drag ended');
      });
    });

    playerSlots.forEach(slot => {
      slot.addEventListener('dragover', (e: Event) => {
        e.preventDefault();
        const dragEvent = e as DragEvent;
        dragEvent.dataTransfer!.dropEffect = 'move';
        const slotElement = slot as HTMLElement;
        slotElement.classList.add('drag-over');
      });

      slot.addEventListener('dragleave', (e: Event) => {
        const dragEvent = e as DragEvent;
        const slotElement = e.currentTarget as HTMLElement;
        // Only remove if we're actually leaving the slot (not entering a child)
        const rect = slotElement.getBoundingClientRect();
        const x = dragEvent.clientX;
        const y = dragEvent.clientY;
        if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
          slotElement.classList.remove('drag-over');
        }
      });

      slot.addEventListener('drop', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const dragEvent = e as DragEvent;
        
        console.log('🎯 [DRAG-DROP] Drop event triggered');
        
        // Get the target slot (could be the slot itself or a child element)
        let targetSlot = e.target as HTMLElement;
        if (!targetSlot.classList.contains('match-player-slot')) {
          targetSlot = targetSlot.closest('.match-player-slot') as HTMLElement;
        }
        
        if (!targetSlot) {
          console.warn('🎯 [DRAG-DROP] Target slot not found');
          return;
        }
        
        targetSlot.classList.remove('drag-over');

        const draggingElement = document.querySelector('.dragging') as HTMLElement;
        if (!draggingElement) {
          console.log('🎯 [DRAG-DROP] No dragging element found');
          return;
        }

        const sourceSlot = draggingElement.parentElement as HTMLElement;

        // Only allow swapping within the same match
        const sourceMatchId = sourceSlot.closest('.match-players-container')?.getAttribute('data-match-id');
        const targetMatchId = targetSlot.closest('.match-players-container')?.getAttribute('data-match-id');

        console.log('🎯 [DRAG-DROP] Drop details:', {
          sourceMatchId,
          targetMatchId,
          sourceSlot: sourceSlot.getAttribute('data-side'),
          targetSlot: targetSlot.getAttribute('data-side')
        });

        if (sourceMatchId !== targetMatchId) {
          showToast('Can only swap players within the same match', 'error');
          return;
        }

        // Don't swap if dropping on the same slot
        if (sourceSlot === targetSlot) {
          console.log('🎯 [DRAG-DROP] Same slot, no swap needed');
          return;
        }

        // Get the player in the target slot
        const targetPlayer = targetSlot.querySelector('.match-player') as HTMLElement;

        if (targetPlayer) {
          // Swap the players
          console.log('🎯 [DRAG-DROP] Swapping players:', {
            source: draggingElement.getAttribute('data-player-name'),
            target: targetPlayer.getAttribute('data-player-name')
          });
          
          sourceSlot.appendChild(targetPlayer);
          targetSlot.appendChild(draggingElement);
          
          showToast('Players swapped! Click Play Match to start.', 'success');
        }
      });
    });

    console.log('🎯 [DRAG-DROP] Initialization complete!');
  }

  public async playMatchFromCard(tournamentId: number, matchId: number): Promise<void> {
    console.log('Playing tournament match from card:', { tournamentId, matchId });
    
    // Get the current player arrangement from the card
    const matchCard = document.querySelector(`.match-card[data-match-id="${matchId}"]`) as HTMLElement;
    if (!matchCard) {
      console.error('Match card not found');
      return;
    }

    const leftPlayer = matchCard.querySelector('.left-slot .match-player') as HTMLElement;
    const rightPlayer = matchCard.querySelector('.right-slot .match-player') as HTMLElement;

    if (!leftPlayer || !rightPlayer) {
      console.error('Player elements not found');
      return;
    }

    const leftPlayerId = parseInt(leftPlayer.getAttribute('data-player-id') || '0');
    const rightPlayerId = parseInt(rightPlayer.getAttribute('data-player-id') || '0');
    const leftPlayerName = leftPlayer.getAttribute('data-player-name') || `Player ${leftPlayerId}`;
    const rightPlayerName = rightPlayer.getAttribute('data-player-name') || `Player ${rightPlayerId}`;

    // Determine original player IDs from the data attributes
    const leftOriginalSide = leftPlayer.getAttribute('data-original-side');
    const rightOriginalSide = rightPlayer.getAttribute('data-original-side');
    
    // Determine the true original player1 and player2 based on original sides
    let originalPlayer1Id: number;
    let originalPlayer2Id: number;
    
    if (leftOriginalSide === 'left') {
      // Left player is original player1
      originalPlayer1Id = leftPlayerId;
      originalPlayer2Id = rightPlayerId;
    } else {
      // Left player was originally on right (swapped)
      originalPlayer1Id = rightPlayerId;
      originalPlayer2Id = leftPlayerId;
    }

    console.log('🎮 Starting match with current arrangement:', {
      leftSide: { id: leftPlayerId, name: leftPlayerName, originalSide: leftOriginalSide },
      rightSide: { id: rightPlayerId, name: rightPlayerName, originalSide: rightOriginalSide },
      originalPlayer1Id,
      originalPlayer2Id
    });

    // Close bracket modal
    const modal = document.getElementById('tournament-bracket-modal');
    if (modal) {
      modal.remove();
    }

    // Navigate to game screen with tournament mode
    const app = (window as any).app;
    const authManager = (window as any).authManager;
    const currentUser = authManager?.getCurrentUser();
    
    if (app && app.startGame && currentUser) {
      // In local multiplayer mode, the host can play any match
      // No need to validate participation - host controls the tournament
      console.log('🎮 [Tournament] Starting match:', {
        currentUserId: currentUser.userId,
        leftPlayerId,
        rightPlayerId,
        leftPlayerName,
        rightPlayerName
      });

      // Set tournament match data
      app.currentTournamentMatch = {
        tournamentId,
        matchId,
        player1Id: leftPlayerId, // Current left player (game player1)
        player2Id: rightPlayerId, // Current right player (game player2)
        player1Name: leftPlayerName,
        player2Name: rightPlayerName,
        originalPlayer1Id, // Original tournament player1_id
        originalPlayer2Id  // Original tournament player2_id
      };

      // Set game mode to tournament
      app.gameSettings = app.gameSettings || {};
      app.gameSettings.gameMode = 'tournament';
      
      // DON'T clear localPlayers - preserve them for faster restart
      // app.localPlayers should persist across matches
      console.log('🏆 [Tournament] Preserving localPlayers for match restart');
      
      console.log('🏆 [Tournament] Setting up players for match');
      console.log('🏆 [Tournament] Current user:', currentUser.userId);
      console.log('🏆 [Tournament] Player 1 (LEFT):', leftPlayerId, leftPlayerName);
      console.log('🏆 [Tournament] Player 2 (RIGHT):', rightPlayerId, rightPlayerName);
      console.log('🏆 [Tournament] Original IDs:', { originalPlayer1Id, originalPlayer2Id });

      // Start the game
      // Start the game
      await app.startGame();
    } else {
      showToast('Game start failed', 'error');
    }
  }

  private showSideSelectionDialog(
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

  public async recordMatchResult(tournamentId: number, matchId: number, winnerId: number, player1Score: number, player2Score: number): Promise<void> {
    console.log('🏆 [RECORD] ========== RECORDING MATCH RESULT ==========');
    console.log('🏆 [RECORD] Input parameters:', {
      tournamentId,
      matchId,
      winnerId,
      player1Score,
      player2Score
    });
    
    try {
      const authManager = (window as any).authManager;
      
      const requestBody = {
        winnerId,
        player1Score,
        player2Score
      };
      
      console.log('🏆 [RECORD] Sending to backend:', requestBody);
      
      const response = await fetch(`${this.baseURL}/tournaments/${tournamentId}/matches/${matchId}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🏆 [RECORD] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('🏆 [RECORD] Failed to record match result:', errorData);
        throw new Error(errorData.error || 'Failed to record match result');
      }

      const result = await response.json();
      console.log('🏆 [RECORD] Backend response:', result);
      console.log('✅ [RECORD] Match result recorded successfully');
      showToast('Match result recorded', 'success');
      
      // Wait a moment for backend to process next round creation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload tournament to check if it's finished and show updated bracket
      const detailsResponse = await fetch(`${this.baseURL}/tournaments/${tournamentId}?_=${Date.now()}`, {
        headers: {
          ...authManager.getAuthHeaders()
        }
      });

      if (detailsResponse.ok) {
        const details = await detailsResponse.json();
        console.log('🔄 Reloaded tournament details:', details);
        
        // Show updated bracket with new match statuses
        this.showBracketModal(details);
        
        // If tournament is finished, record on blockchain
        if (details.tournament.status === 'finished' && details.tournament.winner_id) {
          showToast(`Tournament complete! Winner: ${this.participantMap[details.tournament.winner_id]}`, 'success');
          // Don't auto-record on blockchain - user can manually click button in modal
        }
      }
      
    } catch (error) {
      console.error('🏆 [TOURNAMENT] Record match result error:', error);
      showToast(`Error: ${error instanceof Error ? error.message : 'Failed to record result'}`, 'error');
      throw error;
    }
  }

  public async recordOnBlockchain(tournamentId: number, winnerId: number): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const response = await fetch(`${this.baseURL}/blockchain/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify({
          tournamentId,
          winnerId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record on blockchain');
      }

      const result = await response.json();
      console.log('Blockchain recording result:', result);
      
      showToast(`Tournament recorded on blockchain! TX: ${result.transactionHash?.substring(0, 10)}...`, 'success');
    } catch (error) {
      console.error('Blockchain recording error:', error);
      showToast('Failed to record on blockchain', 'error');
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

// Global tournament manager instance
(window as any).tournamentManager = new TournamentManager();