// frontend/js/profile.js
class ProfileManager {
    constructor() {
        this.baseURL = '/api/auth';
        this.gameURL = '/api/game';
        this.tournamentURL = '/api/tournament';
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Load profile data when profile section is shown
        document.addEventListener('DOMContentLoaded', () => {
            this.loadProfile();
        });
    }

    async loadProfile() {
        const user = window.authManager.getCurrentUser();
        if (!user) return;

        try {
            // Load user profile info
            await this.loadUserInfo(user.userId);
            
            // Load game statistics
            await this.loadGameStats(user.userId);
            
            // Load recent games
            await this.loadRecentGames(user.userId);
            
            // Load tournament count
            await this.loadTournamentCount(user.userId);
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    async loadUserInfo(userId) {
        try {
            const response = await fetch(`${this.baseURL}/profile/${userId}`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const userInfo = await response.json();
                this.displayUserInfo(userInfo);
            }
        } catch (error) {
            console.error('Failed to load user info:', error);
        }
    }

    displayUserInfo(userInfo) {
        const usernameEl = document.getElementById('profile-username');
        const emailEl = document.getElementById('profile-email');
        const joinedEl = document.getElementById('profile-joined');

        if (usernameEl) usernameEl.textContent = userInfo.username;
        if (emailEl) emailEl.textContent = userInfo.email;
        if (joinedEl) {
            const joinDate = new Date(userInfo.created_at).toLocaleDateString();
            joinedEl.textContent = `Member since: ${joinDate}`;
        }
    }

    async loadGameStats(userId) {
        try {
            const response = await fetch(`${this.gameURL}/stats/${userId}`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const stats = await response.json();
                this.displayGameStats(stats);
            }
        } catch (error) {
            console.error('Failed to load game stats:', error);
        }
    }

    displayGameStats(stats) {
        const totalGamesEl = document.getElementById('profile-total-games');
        const winsEl = document.getElementById('profile-wins');
        const winRateEl = document.getElementById('profile-win-rate');

        if (totalGamesEl) totalGamesEl.textContent = stats.totalGames || 0;
        if (winsEl) winsEl.textContent = stats.wins || 0;
        if (winRateEl) winRateEl.textContent = `${stats.winRate || 0}%`;
    }

    async loadRecentGames(userId) {
        try {
            const response = await fetch(`${this.gameURL}/history/${userId}?limit=5`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const games = await response.json();
                this.displayRecentGames(games, userId);
            }
        } catch (error) {
            console.error('Failed to load recent games:', error);
        }
    }

    displayRecentGames(games, userId) {
        const container = document.getElementById('profile-recent-games');
        if (!container) return;

        if (games.length === 0) {
            container.innerHTML = '<p class="muted">No games played yet</p>';
            return;
        }

        container.innerHTML = games.map(game => {
            const isPlayer1 = game.player1_id === userId;
            const opponentName = isPlayer1 ? (game.player2_name || 'Bot') : (game.player1_name || 'Bot');
            const userScore = isPlayer1 ? game.player1_score : game.player2_score;
            const opponentScore = isPlayer1 ? game.player2_score : game.player1_score;
            const won = game.winner_id === userId;
            
            return `
                <div class="recent-game ${won ? 'win' : 'loss'}">
                    <div class="game-info">
                        <span class="opponent">vs ${opponentName}</span>
                        <span class="date">${new Date(game.started_at).toLocaleDateString()}</span>
                    </div>
                    <div class="game-result">
                        <span class="score">${userScore} - ${opponentScore}</span>
                        <span class="result ${won ? 'win' : 'loss'}">${won ? 'WIN' : 'LOSS'}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadTournamentCount(userId) {
        try {
            const response = await fetch(`${this.tournamentURL}/user/${userId}`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const tournaments = await response.json();
                this.displayTournamentCount(tournaments.length);
            }
        } catch (error) {
            console.error('Failed to load tournament count:', error);
            this.displayTournamentCount(0);
        }
    }

    displayTournamentCount(count) {
        const tournamentsEl = document.getElementById('profile-tournaments');
        if (tournamentsEl) tournamentsEl.textContent = count;
    }

    // Method to refresh profile data
    refresh() {
        this.loadProfile();
    }
}

// Global profile manager instance
window.profileManager = new ProfileManager();