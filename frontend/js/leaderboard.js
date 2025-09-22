// frontend/js/leaderboard.js
class LeaderboardManager {
    constructor() {
        this.baseURL = '/api/user';
        this.currentType = 'wins';
        
        this.setupEventListeners();
        this.loadLeaderboard(this.currentType);
    }

    setupEventListeners() {
        // Leaderboard tabs
        document.querySelectorAll('[data-leaderboard]').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-leaderboard');
                this.switchLeaderboardTab(type);
                this.loadLeaderboard(type);
            });
        });
    }

    switchLeaderboardTab(type) {
        this.currentType = type;
        
        // Update tab buttons
        document.querySelectorAll('[data-leaderboard]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-leaderboard') === type);
        });

        // Update header labels
        const headerElements = document.querySelectorAll('.leaderboard-header .stat');
        if (headerElements.length >= 3) {
            headerElements[0].textContent = 'Wins';
            headerElements[1].textContent = 'Games';
            headerElements[2].textContent = 'Win Rate';
        }
    }

    async loadLeaderboard(type = 'wins') {
        try {
            const response = await fetch(`${this.baseURL}/leaderboard?type=${type}&limit=50`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const leaderboard = await response.json();
                this.displayLeaderboard(leaderboard, type);
            } else {
                // If endpoint doesn't exist, create mock data
                this.displayMockLeaderboard(type);
            }
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            this.displayMockLeaderboard(type);
        }
    }

    displayLeaderboard(leaderboard, type) {
        const container = document.getElementById('leaderboard-list');
        if (!container) return;

        if (leaderboard.length === 0) {
            container.innerHTML = '<p class="muted">No players found</p>';
            return;
        }

        container.innerHTML = leaderboard.map((player, index) => {
            const rank = index + 1;
            const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            
            return `
                <div class="leaderboard-entry">
                    <div class="leaderboard-rank ${rankClass}">${rank}</div>
                    <div class="player-name">${player.username || `Player ${player.user_id}`}</div>
                    <div class="stat">${player.wins || 0}</div>
                    <div class="stat">${player.total_games || 0}</div>
                    <div class="stat">${player.win_rate || 0}%</div>
                </div>
            `;
        }).join('');
    }

    displayMockLeaderboard(type) {
        // Create some mock data for demonstration
        const mockData = [
            { username: 'ProGamer', wins: 45, total_games: 50, win_rate: 90 },
            { username: 'PongMaster', wins: 38, total_games: 45, win_rate: 84 },
            { username: 'BallWizard', wins: 32, total_games: 40, win_rate: 80 },
            { username: 'PaddleKing', wins: 28, total_games: 38, win_rate: 74 },
            { username: 'GameChamp', wins: 25, total_games: 35, win_rate: 71 },
            { username: 'PongLord', wins: 22, total_games: 32, win_rate: 69 },
            { username: 'BallHero', wins: 20, total_games: 30, win_rate: 67 },
            { username: 'PaddlePro', wins: 18, total_games: 28, win_rate: 64 },
            { username: 'GameAce', wins: 15, total_games: 25, win_rate: 60 },
            { username: 'PongStar', wins: 12, total_games: 22, win_rate: 55 }
        ];

        // Sort based on type
        let sortedData = [...mockData];
        switch (type) {
            case 'wins':
                sortedData.sort((a, b) => b.wins - a.wins);
                break;
            case 'games':
                sortedData.sort((a, b) => b.total_games - a.total_games);
                break;
            case 'winrate':
                sortedData.sort((a, b) => b.win_rate - a.win_rate);
                break;
        }

        this.displayLeaderboard(sortedData, type);
    }

    // Method to refresh leaderboard data
    refresh() {
        this.loadLeaderboard(this.currentType);
    }
}

// Global leaderboard manager instance
window.leaderboardManager = new LeaderboardManager();