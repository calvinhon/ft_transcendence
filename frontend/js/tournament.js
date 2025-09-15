// frontend/js/tournament.js
class TournamentManager {
    constructor() {
        this.baseURL = '/api/tournament';
        this.currentTournaments = [];
        this.userTournaments = [];
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Create tournament button
        document.getElementById('create-tournament-btn').addEventListener('click', () => {
            document.getElementById('create-tournament-modal').classList.remove('hidden');
        });

        // Cancel tournament creation
        document.getElementById('cancel-tournament').addEventListener('click', () => {
            document.getElementById('create-tournament-modal').classList.add('hidden');
            document.getElementById('create-tournament-form').reset();
        });

        // Create tournament form
        document.getElementById('create-tournament-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTournament();
        });

        // Tournament tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabType = btn.getAttribute('data-tab');
                this.switchTab(tabType);
            });
        });
    }

    switchTab(tabType) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabType);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabType.replace('-', '-')}`);
        });

        // Load appropriate data
        if (tabType === 'available') {
            this.loadAvailableTournaments();
        } else if (tabType === 'my-tournaments') {
            this.loadUserTournaments();
        }
    }

    async createTournament() {
        const name = document.getElementById('tournament-name').value;
        const description = document.getElementById('tournament-description').value;
        const maxParticipants = document.getElementById('tournament-max-participants').value;
        const user = window.authManager.getCurrentUser();

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

            const data = await response.json();

            if (response.ok) {
                alert('Tournament created successfully!');
                document.getElementById('create-tournament-modal').classList.add('hidden');
                document.getElementById('create-tournament-form').reset();
                this.loadAvailableTournaments();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            alert('Failed to create tournament');
            console.error('Tournament creation error:', error);
        }
    }

    async loadAvailableTournaments() {
        try {
            const response = await fetch(`${this.baseURL}/list?status=open&limit=20`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const tournaments = await response.json();
                this.currentTournaments = tournaments;
                this.displayAvailableTournaments(tournaments);
            }
        } catch (error) {
            console.error('Failed to load tournaments:', error);
        }
    }

    displayAvailableTournaments(tournaments) {
        const container = document.getElementById('tournaments-list');

        if (tournaments.length === 0) {
            container.innerHTML = '<p>No tournaments available. Create one!</p>';
            return;
        }

        const tournamentsHTML = tournaments.map(tournament => `
            <div class="tournament-card">
                <h3>${tournament.name}</h3>
                <p>${tournament.description || 'No description'}</p>
                <div class="tournament-info">
                    <span class="participants">
                        ${tournament.current_participants}/${tournament.max_participants} players
                    </span>
                    <span class="status ${tournament.status}">${tournament.status.toUpperCase()}</span>
                </div>
                <div class="tournament-actions">
                    <button class="secondary-btn join-tournament-btn" 
                            data-tournament-id="${tournament.id}"
                            ${tournament.current_participants >= tournament.max_participants ? 'disabled' : ''}>
                        ${tournament.current_participants >= tournament.max_participants ? 'Full' : 'Join'}
                    </button>
                    <button class="secondary-btn view-tournament-btn" 
                            data-tournament-id="${tournament.id}">
                        View
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = tournamentsHTML;

        // Add event listeners for tournament actions
        container.querySelectorAll('.join-tournament-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tournamentId = btn.getAttribute('data-tournament-id');
                this.joinTournament(tournamentId);
            });
        });

        container.querySelectorAll('.view-tournament-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tournamentId = btn.getAttribute('data-tournament-id');
                this.viewTournament(tournamentId);
            });
        });
    }

    async joinTournament(tournamentId) {
        const user = window.authManager.getCurrentUser();

        try {
            const response = await fetch(`${this.baseURL}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...window.authManager.getAuthHeaders()
                },
                body: JSON.stringify({
                    tournamentId: parseInt(tournamentId),
                    userId: user.userId
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Successfully joined tournament!');
                this.loadAvailableTournaments();
                this.loadUserTournaments();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            alert('Failed to join tournament');
            console.error('Tournament join error:', error);
        }
    }

    async viewTournament(tournamentId) {
        try {
            const response = await fetch(`${this.baseURL}/details/${tournamentId}`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const details = await response.json();
                this.showTournamentDetails(details);
            }
        } catch (error) {
            console.error('Failed to load tournament details:', error);
        }
    }

    showTournamentDetails(details) {
        const { tournament, participants, matches } = details;
        
        // Create modal for tournament details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${tournament.name}</h3>
                <p>${tournament.description}</p>
                
                <div class="tournament-details">
                    <div class="detail-section">
                        <h4>Status</h4>
                        <span class="status ${tournament.status}">${tournament.status.toUpperCase()}</span>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Participants (${participants.length}/${tournament.max_participants})</h4>
                        <div class="participants-list">
                            ${participants.map(p => `<div class="participant">User ${p.user_id}</div>`).join('')}
                        </div>
                    </div>
                    
                    ${matches.length > 0 ? `
                        <div class="detail-section">
                            <h4>Matches</h4>
                            <div class="matches-list">
                                ${this.renderMatches(matches)}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="modal-buttons">
                    <button type="button" class="close-details-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal event
        modal.querySelector('.close-details-btn').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    renderMatches(matches) {
        const matchesByRound = matches.reduce((acc, match) => {
            if (!acc[match.round]) acc[match.round] = [];
            acc[match.round].push(match);
            return acc;
        }, {});

        return Object.keys(matchesByRound).map(round => `
            <div class="round">
                <h5>Round ${round}</h5>
                ${matchesByRound[round].map(match => `
                    <div class="match ${match.status}">
                        <span class="player">User ${match.player1_id}</span>
                        ${match.status === 'completed' ? 
                            `<span class="score">${match.player1_score} - ${match.player2_score}</span>` :
                            '<span class="vs">vs</span>'
                        }
                        <span class="player">User ${match.player2_id}</span>
                        ${match.winner_id ? `<span class="winner">Winner: User ${match.winner_id}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    async loadUserTournaments() {
        const user = window.authManager.getCurrentUser();
        
        try {
            const response = await fetch(`${this.baseURL}/user/${user.userId}`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const tournaments = await response.json();
                this.userTournaments = tournaments;
                this.displayUserTournaments(tournaments);
            }
        } catch (error) {
            console.error('Failed to load user tournaments:', error);
        }
    }

    displayUserTournaments(tournaments) {
        const container = document.getElementById('user-tournaments-list');

        if (tournaments.length === 0) {
            container.innerHTML = '<p>You haven\'t joined any tournaments yet.</p>';
            return;
        }

        const tournamentsHTML = tournaments.map(tournament => `
            <div class="tournament-card">
                <h3>${tournament.name}</h3>
                <p>${tournament.description || 'No description'}</p>
                <div class="tournament-info">
                    <span class="participants">
                        ${tournament.current_participants}/${tournament.max_participants} players
                    </span>
                    <span class="status ${tournament.status}">${tournament.status.toUpperCase()}</span>
                    ${tournament.winner_id ? `<span class="winner">Winner: User ${tournament.winner_id}</span>` : ''}
                </div>
                <div class="tournament-actions">
                    <button class="secondary-btn view-tournament-btn" 
                            data-tournament-id="${tournament.id}">
                        View Details
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = tournamentsHTML;

        // Add event listeners
        container.querySelectorAll('.view-tournament-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tournamentId = btn.getAttribute('data-tournament-id');
                this.viewTournament(tournamentId);
            });
        });
    }
}

// Global tournament manager instance
window.tournamentManager = new TournamentManager();