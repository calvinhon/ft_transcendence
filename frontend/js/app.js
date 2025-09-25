// frontend/js/app.js - Unified Application Controller
class TranscendenceApp {
    constructor() {
        this.currentSection = 'play';
        this.init();
    }

    async init() {
        // Get form elements
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.loginScreen = document.getElementById('login-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.userDisplay = document.getElementById('user-display');
        this.logoutBtn = document.getElementById('logout-btn');

        // Check authentication first
        await this.checkExistingLogin();
        
        // Setup all event listeners
        this.setupEventListeners();
        
        // Start periodic auth check
        this.startAuthCheck();
    }

    setupEventListeners() {
        // Authentication form listeners
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        this.registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Logout button
        this.logoutBtn.addEventListener('click', () => {
            this.handleLogout();
        });

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.id.replace('-btn', '');
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

        console.log('Attempting login:', { username });
        
        try {
            const result = await window.authManager.login(username, password);
            console.log('Login result:', result);
            console.log('Current user after login attempt:', window.authManager.getCurrentUser());
            
            if (result.success) {
                // Login successful - switch to game screen
                console.log('Login successful, user data:', result.data);
                this.showGameScreen();
                this.loginForm.reset();
            } else {
                console.log('Login failed:', result.error);
                // Ensure no user is set on failed login
                window.authManager.currentUser = null;
                localStorage.removeItem('token');
                alert('Login failed: ' + result.error);
                // Stay on login screen - do NOT call showGameScreen
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: Network error');
        }
    }

    async handleRegister() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        
        // Basic validation
        if (!username || !email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        if (password.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }
        
        console.log('Attempting registration:', { username, email });
        
        try {
            const result = await window.authManager.register(username, email, password);
            
            if (result.success) {
                // Registration successful - switch to game screen
                this.showGameScreen();
                this.registerForm.reset();
                console.log('Registration successful');
            } else {
                alert('Registration failed: ' + result.error);
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed: Network error');
        }
    }

    handleLogout() {
        window.authManager.logout();
        this.showLoginScreen();
    }

    // Check if user is already logged in (page refresh)
    async checkExistingLogin() {
        const isValid = await window.authManager.verifyToken();
        if (isValid) {
            const user = window.authManager.getCurrentUser();
            if (user) {
                this.showGameScreen();
            }
        }
    }
    
    // Periodic authentication check (every 5 minutes when on game page)
    startAuthCheck() {
        setInterval(async () => {
            if (this.gameScreen.classList.contains('active')) {
                console.log('Running periodic auth check...');
                const isValid = await window.authManager.verifyToken();
                if (!isValid) {
                    console.log('Authentication expired, redirecting to login');
                    alert('Your session has expired. Please log in again.');
                    this.showLoginScreen();
                }
            }
        }, 300000); // Check every 5 minutes instead of 30 seconds
    }

    showLoginScreen() {
        this.gameScreen.classList.remove('active');
        this.loginScreen.classList.add('active');
        this.userDisplay.textContent = 'Welcome!';
        
        // Clear forms
        this.loginForm.reset();
        this.registerForm.reset();
    }

    showGameScreen() {
        console.log('showGameScreen called');
        
        // Verify authentication before showing game screen
        const user = window.authManager.getCurrentUser();
        const token = localStorage.getItem('token');
        
        console.log('showGameScreen validation - user:', user, 'token exists:', !!token);
        
        if (!user || !user.userId || !token) {
            console.error('showGameScreen: Invalid authentication, redirecting to login');
            this.showLoginScreen();
            return;
        }
        
        console.log('showGameScreen: Validation passed, showing game screen');
        this.loginScreen.classList.remove('active');
        this.gameScreen.classList.add('active');
        
        // Update user display
        this.userDisplay.textContent = `Welcome, ${user.username}!`;
        
        // Initialize online tracking connection
        this.establishOnlineTracking(user);
        
        // Initialize managers
        if (!window.matchManager) {
            window.matchManager = new MatchManager();
        }
        if (!window.tournamentManager) {
            console.log('AppManager: Creating new TournamentManager');
            window.tournamentManager = new TournamentManager();
            console.log('AppManager: TournamentManager created:', !!window.tournamentManager);
        } else {
            console.log('AppManager: TournamentManager already exists');
        }
        if (!window.profileManager) {
            window.profileManager = new ProfileManager();
        }
        if (!window.leaderboardManager) {
            window.leaderboardManager = new LeaderboardManager();
        }
        
        // Load initial data
        this.showSection('play');
        this.loadUserProfile();
    }

    showSection(sectionName) {
        console.log('AppManager: showSection called with:', sectionName);
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `${sectionName}-btn`);
        });

        // Update sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.toggle('active', section.id === `${sectionName}-section`);
        });

        this.currentSection = sectionName;
        console.log('AppManager: Section updated, current section:', this.currentSection);

        // Load section-specific data
        switch (sectionName) {
            case 'play':
                // Play section doesn't need game stats/history - those are for profile
                // Game functionality is handled by GameManager and MatchManager
                break;
            case 'tournaments':
                console.log('AppManager: Tournaments section, tournamentManager exists:', !!window.tournamentManager);
                if (window.tournamentManager) {
                    console.log('AppManager: Calling tournamentManager.loadTournaments()');
                    window.tournamentManager.loadTournaments();
                } else {
                    console.error('AppManager: tournamentManager not found!');
                }
                break;
            case 'profile':
                const user = window.authManager.getCurrentUser();
                if (user && window.gameManager) {
                    window.gameManager.loadGameHistory(user.userId);
                    window.gameManager.loadGameStats(user.userId);
                }
                this.loadUserProfile();
                break;
                break;
            case 'leaderboard':
                if (window.leaderboardManager) {
                    window.leaderboardManager.loadLeaderboard('wins');
                }
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
        const avatar = document.getElementById('profile-avatar');
        if (avatar) {
            avatar.textContent = (profile.display_name || user.username).charAt(0).toUpperCase();
        }
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
        
        if (!container) {
            console.log('Friends list container not found - feature not implemented yet');
            return;
        }
        
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
        
        if (!container) {
            console.log('Achievements list container not found - feature not implemented yet');
            return;
        }
        
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

    establishOnlineTracking(user) {
        // Don't establish duplicate connections
        if (this.onlineTrackingSocket) {
            return;
        }
        
        console.log('Establishing online tracking connection for user:', user);
        
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/game/ws/chat`;
            
            this.onlineTrackingSocket = new WebSocket(wsUrl);
            
            this.onlineTrackingSocket.onopen = () => {
                console.log('Online tracking WebSocket connected');
                // Send user authentication for online tracking
                this.onlineTrackingSocket.send(JSON.stringify({
                    type: 'userConnect',
                    userId: user.userId,
                    username: user.username
                }));
            };
            
            this.onlineTrackingSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'connectionAck') {
                        console.log('Online tracking acknowledged:', data.message);
                    }
                } catch (e) {
                    // Not JSON, ignore
                }
            };
            
            this.onlineTrackingSocket.onclose = () => {
                console.log('Online tracking WebSocket disconnected');
                this.onlineTrackingSocket = null;
            };
            
            this.onlineTrackingSocket.onerror = (error) => {
                console.error('Online tracking WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('Failed to establish online tracking:', error);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TranscendenceApp();
});