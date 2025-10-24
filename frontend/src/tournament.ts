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

  constructor() {
    console.log('TournamentManager constructor called');
    
    // Check if running in development mode
    if (window.location.hostname === 'localhost' && window.location.port !== '80') {
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
    // Create tournament button
    const createBtn = document.getElementById('create-tournament-btn');
    console.log('Create tournament button found:', !!createBtn);
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        const modal = document.getElementById('create-tournament-modal');
        if (modal) {
          modal.classList.remove('hidden');
        }
      });
    }

    // Cancel tournament creation
    const cancelBtn = document.getElementById('cancel-tournament');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        const modal = document.getElementById('create-tournament-modal');
        const form = document.getElementById('create-tournament-form') as HTMLFormElement;
        if (modal) {
          modal.classList.add('hidden');
        }
        if (form) {
          form.reset();
        }
      });
    }

    // Create tournament form
    const createForm = document.getElementById('create-tournament-form') as HTMLFormElement;
    if (createForm) {
      createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createTournament();
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
      
      const response = await fetch(`${this.baseURL}/list`, { headers });
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
  showToast('Tournament details view coming soon!', 'info');
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