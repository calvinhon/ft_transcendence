// frontend/js/tournament.js
class TournamentManager {
    constructor() {
        console.log('TournamentManager constructor called');
        this.baseURL = '/api/tournament';
        this.currentTournaments = [];
        this.userTournaments = [];
        
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

    setupEventListeners() {
        console.log('Setting up tournament event listeners');
        // Create tournament button
        const createBtn = document.getElementById('create-tournament-btn');
        console.log('Create tournament button found:', !!createBtn);
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                document.getElementById('create-tournament-modal').classList.remove('hidden');
            });
        }

        // Cancel tournament creation
        const cancelBtn = document.getElementById('cancel-tournament');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                document.getElementById('create-tournament-modal').classList.add('hidden');
                document.getElementById('create-tournament-form').reset();
            });
        }

        // Create tournament form
        const createForm = document.getElementById('create-tournament-form');
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
                this.switchTab(tabType);
            });
        });
    }

    switchTab(tabType) {
        // Update tab buttons
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabType);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabType}-tournaments`);
        });

        // Load appropriate data
        if (tabType === 'available') {
            this.loadAvailableTournaments();
        } else if (tabType === 'my') {
            this.loadMyTournaments();
        }
    }

    async loadTournaments() {
        console.log('Loading tournaments...');
        await this.loadAvailableTournaments();
        await this.loadMyTournaments();
    }

    async loadAvailableTournaments() {
        const container = document.getElementById('available-tournaments-list');
        if (container) {
            container.innerHTML = '<div class="loading">Loading tournaments...</div>';
        }
        
        try {
            const response = await fetch(`${this.baseURL}/list`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const tournaments = await response.json();
                this.currentTournaments = tournaments;
                this.displayAvailableTournaments(tournaments);
            } else {
                this.displayAvailableTournaments([]);
                console.error('Failed to load tournaments:', response.status);
            }
        } catch (error) {
            console.error('Failed to load tournaments:', error);
            const container = document.getElementById('available-tournaments-list');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <p class="muted">Unable to load tournaments</p>
                        <p class="muted small">Please check that services are running</p>
                        <button class="btn btn-primary" onclick="window.tournamentManager.loadAvailableTournaments()">Retry</button>
                    </div>
                `;
            }
        }
    }

    async loadMyTournaments() {
        const container = document.getElementById('my-tournaments-list');
        if (container) {
            container.innerHTML = '<div class="loading">Loading your tournaments...</div>';
        }
        
        try {
            const user = window.authManager.getCurrentUser();
            if (!user) return;

            const response = await fetch(`${this.baseURL}/user/${user.userId}`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const tournaments = await response.json();
                this.userTournaments = tournaments;
                this.displayMyTournaments(tournaments);
            } else {
                this.displayMyTournaments([]);
                console.error('Failed to load user tournaments:', response.status);
            }
        } catch (error) {
            console.error('Failed to load user tournaments:', error);
            const container = document.getElementById('my-tournaments-list');
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <p class="muted">Unable to load your tournaments</p>
                        <p class="muted small">Please check that services are running</p>
                        <button class="btn btn-primary" onclick="window.tournamentManager.loadMyTournaments()">Retry</button>
                    </div>
                `;
            }
        }
    }

    displayAvailableTournaments(tournaments) {
        const container = document.getElementById('available-tournaments-list');
        if (!container) {
            console.error('Available tournaments container not found');
            return;
        }

        if (tournaments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="muted">No tournaments available</p>
                    <p class="muted small">Create a tournament to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tournaments.map(tournament => `
            <div class="tournament-card">
                <h4>${tournament.name}</h4>
                <p class="tournament-info">${tournament.description || 'No description'}</p>
                <div class="tournament-participants">
                    ${tournament.current_participants}/${tournament.max_participants} players
                </div>
                <div class="tournament-status">
                    Status: <span class="status-${tournament.status}">${tournament.status}</span>
                </div>
                <div class="tournament-actions">
                    ${tournament.status === 'open' ? 
                        `<button class="btn btn-primary" onclick="window.tournamentManager.joinTournament(${tournament.id})">Join</button>` : 
                        '<button class="btn btn-secondary" disabled>Full</button>'
                    }
                </div>
            </div>
        `).join('');
    }

    displayMyTournaments(tournaments) {
        const container = document.getElementById('my-tournaments-list');
        if (!container) {
            console.error('My tournaments container not found');
            return;
        }

        if (tournaments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="muted">You haven't joined any tournaments yet</p>
                    <p class="muted small">Join a tournament from the "Available" tab!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tournaments.map(tournament => `
            <div class="tournament-card">
                <h4>${tournament.name} ${tournament.user_role === 'creator' ? '<span class="creator-badge">👑</span>' : ''}</h4>
                <p class="tournament-info">${tournament.description || 'No description'}</p>
                <div class="tournament-participants">
                    ${tournament.current_participants}/${tournament.max_participants} players
                </div>
                <div class="tournament-status">
                    Status: <span class="status-${tournament.status}">${tournament.status}</span>
                    ${tournament.user_role ? `<span class="user-role">(${tournament.user_role})</span>` : ''}
                </div>
                <div class="tournament-actions">
                    <button class="btn btn-secondary" onclick="window.tournamentManager.viewTournament(${tournament.id})">View Details</button>
                    ${tournament.user_role === 'creator' && tournament.status === 'open' ? 
                      `<button class="btn btn-primary" onclick="window.tournamentManager.startTournament(${tournament.id})">Start Tournament</button>` : 
                      ''
                    }
                </div>
            </div>
        `).join('');
    }

    async createTournament() {
        const user = window.authManager.getCurrentUser();
        if (!user) {
            alert('You must be logged in to create a tournament');
            return;
        }

        const name = document.getElementById('tournament-name').value;
        const description = document.getElementById('tournament-description').value;
        const maxParticipants = document.getElementById('tournament-max-participants').value;

        try {
            const response = await fetch(`${this.baseURL}/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...window.authManager.getAuthHeaders()
                },
                body: JSON.stringify({
                    name,
                    description,
                    maxParticipants: parseInt(maxParticipants),
                    createdBy: user.userId
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Tournament created successfully!');
                document.getElementById('create-tournament-modal').classList.add('hidden');
                document.getElementById('create-tournament-form').reset();
                this.loadTournaments();
            } else {
                alert('Failed to create tournament: ' + result.error);
            }
        } catch (error) {
            console.error('Create tournament error:', error);
            alert('Failed to create tournament: Network error');
        }
    }

    async joinTournament(tournamentId) {
        const user = window.authManager.getCurrentUser();
        if (!user) {
            alert('You must be logged in to join a tournament');
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...window.authManager.getAuthHeaders()
                },
                body: JSON.stringify({
                    tournamentId,
                    userId: user.userId
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Successfully joined tournament!');
                this.loadTournaments();
            } else {
                alert('Failed to join tournament: ' + result.error);
            }
        } catch (error) {
            console.error('Join tournament error:', error);
            alert('Failed to join tournament: Network error');
        }
    }

    async viewTournament(tournamentId) {
        alert('Tournament details view coming soon!');
    }
}

// Global tournament manager instance
window.tournamentManager = new TournamentManager();