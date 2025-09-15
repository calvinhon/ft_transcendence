// frontend/js/app.js
class TranscendenceApp {
    constructor() {
        this.currentSection = 'play';
        this.init();
    }

    async init() {
        // Check authentication
        const isAuthenticated = await window.authManager.verifyToken();
        
        if (isAuthenticated) {
            this.showGameScreen();
        } else {
            this.showLoginScreen();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auth forms
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.id.replace('-btn', '').replace('-', '');
                this.showSection(section);
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Leaderboard tabs
        document.querySelectorAll('[data-leaderboard]').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-leaderboard');
                this.switchLeaderboardTab(type);
                this.loadLeaderboard(type);
            });
        });
    }

    async handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            alert('Please fill in all fields');
            return;
        }

        const result = await window.authManager.login(username, password);

        if (result.success) {
            this.showGameScreen();
        } else {
            alert(`Login failed: ${result.error}`);
        }
    }

    async handleRegister() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        if (!username || !email || !password) {
            alert('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        const result = await window.authManager.register(username, email, password);

        if (result.success) {
            this.showGameScreen();
        } else {
            alert(`Registration failed: ${result.error}`);
        }
    }

    handleLogout() {
        window.authManager.logout();
        this.showLoginScreen();
    }

    showLoginScreen() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('game-screen').classList.remove('active');
        
        // Clear forms
        document.getElementById('login-form').reset();
        document.getElementById('register-form').reset();
    }

    showGameScreen() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        
        // Update user display
        const user = window.authManager.getCurrentUser();
        document.getElementById('user-display').textContent = `Welcome, ${user.username}!`;
        
        // Load initial data
        this.showSection('play');
        this.loadUserProfile();
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `${sectionName}-btn`);
        });

        // Update sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.toggle('active', section.id === `${sectionName}-section`);
        });

        this.currentSection = sectionName;

        // Load section-specific data
        switch (sectionName) {
            case 'play':
                // Game section is handled by GameManager
                break;
            case 'tournaments':
                window.tournamentManager.loadAvailableTournaments();
                break;
            case 'profile':
                this.loadProfileData();
                break;
            case 'leaderboard':
                this.loadLeaderboard('wins');
                break;
        }
    }

    async loadUserProfile() {
        const user = window.authManager.getCurrentUser();
        
        try {
            const response = await fetch(`/api/user/profile/${user.userId}`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const profile = await response.json();
                this.updateUserProfile(profile);
            }
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }

    updateUserProfile(profile) {
        const user = window.authManager.getCurrentUser();
        
        // Update profile display
        document.getElementById('profile-username').textContent = user.username;
        document.getElementById('profile-email').textContent = user.email || 'Not provided';
        
        // Update avatar
        const avatar = document.getElementById('user-avatar');
        avatar.textContent = (profile.display_name || user.username).charAt(0).toUpperCase();
    }

    async loadProfileData() {
        const user = window.authManager.getCurrentUser();
        
        // Load game stats
        await window.gameManager.loadGameStats(user.userId);
        
        // Load game history
        await window.gameManager.loadGameHistory(user.userId);
        
        // Load friends
        await this.loadFriends(user.userId);
        
        // Load achievements
        await this.loadAchievements(user.userId);
    }

    async loadFriends(userId) {
        try {
            const response = await fetch(`/api/user/friends/${userId}`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const friends = await response.json();
                this.displayFriends(friends);
            }
        } catch (error) {
            console.error('Failed to load friends:', error);
        }
    }

    displayFriends(friends) {
        const container = document.getElementById('friends-list');
        
        if (friends.length === 0) {
            container.innerHTML = '<p>No friends yet. Add some friends to play with!</p>';
            return;
        }

        const friendsHTML = friends.map(friend => `
            <div class="friend-item">
                <div class="friend-avatar">${(friend.display_name || 'U').charAt(0).toUpperCase()}</div>
                <div class="friend-info">
                    <div class="friend-name">${friend.display_name || `User ${friend.friend_id}`}</div>
                    <div class="friend-status">Friends since ${new Date(friend.accepted_at).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = friendsHTML;
    }

    async loadAchievements(userId) {
        try {
            const response = await fetch(`/api/user/achievements/${userId}`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const achievements = await response.json();
                this.displayAchievements(achievements);
            }
        } catch (error) {
            console.error('Failed to load achievements:', error);
        }
    }

    displayAchievements(achievements) {
        const container = document.getElementById('achievements-list');
        
        if (achievements.length === 0) {
            container.innerHTML = '<p>No achievements unlocked yet. Keep playing to earn achievements!</p>';
            return;
        }

        const achievementsHTML = achievements.map(achievement => `
            <div class="achievement-item">
                <div class="achievement-icon">🏆</div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.achievement_name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="achievement-date">Earned ${new Date(achievement.earned_at).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = achievementsHTML;
    }

    switchLeaderboardTab(type) {
        // Update tab buttons
        document.querySelectorAll('[data-leaderboard]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-leaderboard') === type);
        });
    }

    async loadLeaderboard(type = 'wins') {
        try {
            const response = await fetch(`/api/user/leaderboard?type=${type}&limit=50`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const leaderboard = await response.json();
                this.displayLeaderboard(leaderboard, type);
            }
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        }
    }

    displayLeaderboard(leaderboard, type) {
        const container = document.getElementById('leaderboard-list');
        
        if (leaderboard.length === 0) {
            container.innerHTML = '<p>No players on the leaderboard yet.</p>';
            return;
        }

        const leaderboardHTML = leaderboard.map((player, index) => {
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'first';
            else if (rank === 2) rankClass = 'second';
            else if (rank === 3) rankClass = 'third';

            return `
                <div class="leaderboard-item">
                    <div class="rank ${rankClass}">${rank}</div>
                    <div class="user-info">
                        <div class="username">${player.display_name || `User ${player.user_id}`}</div>
                        ${player.country ? `<div class="country">${player.country}</div>` : ''}
                    </div>
                    <div class="stats">
                        <span class="wins">${player.wins} wins</span>
                        <span class="games">${player.total_games} games</span>
                        <span class="winrate">${player.winRate}% win rate</span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = leaderboardHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TranscendenceApp();
});