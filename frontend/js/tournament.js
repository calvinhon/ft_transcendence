// frontend/js/tournament.js

// Global test function for debugging
window.testTournamentsClick = function() {
    console.log('Testing tournaments click...');
    const btn = document.getElementById('tournaments-btn');
    console.log('Tournaments button found:', !!btn);
    if (btn) {
        btn.click();
    }
};

window.testShowTournaments = function() {
    console.log('Testing show tournaments directly...');
    if (window.appManager) {
        window.appManager.showSection('tournaments');
    } else {
        console.log('No appManager found');
    }
};

window.debugTournamentElements = function() {
    console.log('=== Tournament Elements Debug ===');
    console.log('tournaments-btn:', !!document.getElementById('tournaments-btn'));
    console.log('tournaments-section:', !!document.getElementById('tournaments-section'));
    console.log('tournaments-section classes:', document.getElementById('tournaments-section')?.className);
    console.log('window.tournamentManager:', !!window.tournamentManager);
    console.log('window.appManager:', !!window.appManager);
};

class TournamentManager {
    constructor() {
        console.log('TournamentManager constructor called');
        this.baseURL = '/api/tournament';
        this.currentTournaments = [];
        this.userTournaments = [];
        
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

    async checkServiceAvailability() {
        try {
            console.log('Checking tournament service availability...');
            const response = await fetch(`${this.baseURL}/list`, {
                method: 'GET',
                headers: window.authManager.getAuthHeaders()
            });
            
            if (response.ok) {
                console.log('✅ Tournament service is available');
                return true;
            } else {
                console.log('❌ Tournament service returned error:', response.status);
                return false;
            }
        } catch (error) {
            console.log('❌ Tournament service is not accessible:', error.message);
            return false;
        }
    }

    async loadTournaments() {
        console.log('Loading tournaments...');
        
        // Check service availability first
        const serviceAvailable = await this.checkServiceAvailability();
        if (!serviceAvailable) {
            this.displayServiceUnavailable();
            return;
        }
        
        await this.loadAvailableTournaments();
        await this.loadMyTournaments();
    }

    displayServiceUnavailable() {
        const containers = [
            document.getElementById('available-tournaments-list'),
            document.getElementById('my-tournaments-list')
        ];
        
        containers.forEach(container => {
            if (container) {
                container.innerHTML = `
                    <div class="error-state">
                        <h3>🔌 Tournament Service Unavailable</h3>
                        <p class="muted">Cannot connect to tournament service</p>
                        <p class="muted small">Please make sure all services are running:</p>
                        <div style="text-align: left; margin: 1rem 0;">
                            <code style="background: #f1f1f1; padding: 0.5rem; border-radius: 4px; display: block;">
                                docker-compose up -d
                            </code>
                        </div>
                        <button class="btn btn-primary" onclick="window.tournamentManager.loadTournaments()">🔄 Retry</button>
                        <p class="muted small" style="margin-top: 1rem;">
                            Expected service URL: <strong>${this.baseURL}</strong>
                        </p>
                    </div>
                `;
            }
        });
    }

    async loadAvailableTournaments() {
        console.log('TournamentManager: loadAvailableTournaments called');
        const container = document.getElementById('available-tournaments-list');
        console.log('TournamentManager: Container found:', !!container);
        if (container) {
            container.innerHTML = '<div class="loading">Loading tournaments...</div>';
        }
        
        try {
            console.log('TournamentManager: Fetching from:', `${this.baseURL}/list`);
            const response = await fetch(`${this.baseURL}/list`, {
                headers: window.authManager.getAuthHeaders()
            });
            
            console.log('TournamentManager: Response status:', response.status);
            console.log('TournamentManager: Response ok:', response.ok);

            if (response.ok) {
                const tournaments = await response.json();
                console.log('TournamentManager: Received tournaments:', tournaments);
                console.log('TournamentManager: Number of tournaments:', tournaments.length);
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
        console.log('TournamentManager: displayAvailableTournaments called with:', tournaments);
        const container = document.getElementById('available-tournaments-list');
        console.log('TournamentManager: Display container found:', !!container);
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

        const tournamentHTML = tournaments.map(tournament => `
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
        
        console.log('TournamentManager: Generated HTML length:', tournamentHTML.length);
        console.log('TournamentManager: Setting innerHTML...');
        container.innerHTML = tournamentHTML;
        console.log('TournamentManager: HTML set successfully');
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

        console.log('Attempting to join tournament:', tournamentId);
        console.log('User:', user);
        console.log('Base URL:', this.baseURL);

        try {
            const joinURL = `${this.baseURL}/join`;
            console.log('Join URL:', joinURL);
            
            const requestData = {
                tournamentId: parseInt(tournamentId),
                userId: parseInt(user.userId)
            };
            console.log('Request data:', requestData);

            const response = await fetch(joinURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...window.authManager.getAuthHeaders()
                },
                body: JSON.stringify(requestData)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            if (response.ok) {
                const result = await response.json();
                console.log('Join success:', result);
                alert('Successfully joined tournament!');
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
                alert('Failed to join tournament: ' + errorMessage);
            }
        } catch (error) {
            console.error('Join tournament network error:', error);
            alert('Failed to join tournament: Network error - ' + error.message);
        }
    }

    async viewTournament(tournamentId) {
        alert('Tournament details view coming soon!');
    }
}

// Global tournament manager instance
window.tournamentManager = new TournamentManager();