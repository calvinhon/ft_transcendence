// frontend/js/match.js - Enhanced Matchmaking System
class MatchManager {
    constructor() {
        this.currentMode = 'quick';
        this.onlinePlayers = [];
        this.searchInterval = null;
        this.selectedOpponent = null;
        
        this.setupEventListeners();
        this.loadOnlinePlayers();
    }

    setupEventListeners() {
        console.log('MatchManager: Setting up event listeners');
        
        // Mode selection buttons
        const quickBtn = document.getElementById('quick-match-btn');
        const botBtn = document.getElementById('bot-match-btn');
        const onlineBtn = document.getElementById('online-players-btn');
        
        console.log('MatchManager: Found buttons:', {
            quick: !!quickBtn,
            bot: !!botBtn,  
            online: !!onlineBtn
        });

        quickBtn?.addEventListener('click', () => {
            console.log('MatchManager: Quick match button clicked');
            this.selectMode('quick');
        });

        botBtn?.addEventListener('click', () => {
            console.log('MatchManager: Bot match button clicked'); 
            this.selectMode('bot');
        });

        onlineBtn?.addEventListener('click', () => {
            console.log('MatchManager: Online players button clicked');
            this.selectMode('online');
        });

        // Back button
        document.getElementById('back-to-modes-btn')?.addEventListener('click', () => {
            this.showModeSelection();
        });

        // Cancel search button
        document.getElementById('cancel-search-btn')?.addEventListener('click', () => {
            this.cancelSearch();
        });
    }

    selectMode(mode) {
        console.log('MatchManager: selectMode called with:', mode);
        this.currentMode = mode;
        
        // Update active button
        document.querySelectorAll('.match-option-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${mode}-match-btn`).classList.add('active');

        // Handle different modes
        switch (mode) {
            case 'quick':
                console.log('MatchManager: Starting quick match');
                this.startQuickMatch();
                break;
            case 'bot':
                console.log('MatchManager: Starting bot match');
                this.startBotMatch();
                break;
            case 'online':
                console.log('MatchManager: Showing online players');
                this.showOnlinePlayers();
                break;
        }
    }

    startQuickMatch() {
        this.showGameStatus('Quick Match', 'Finding any available opponent...');
        // Use existing findMatch functionality from GameManager
        if (window.gameManager && typeof window.gameManager.findMatch === 'function') {
            window.gameManager.findMatch();
        } else {
            console.error('GameManager not available or findMatch method not found');
            this.showModeSelection();
        }
    }

    startBotMatch() {
        this.showGameStatus('Bot Match', 'Starting game against AI opponent...');
        // Create immediate bot match
        if (window.gameManager && typeof window.gameManager.startBotMatch === 'function') {
            console.log('Starting bot match via GameManager');
            window.gameManager.startBotMatch();
        } else {
            console.error('GameManager not available or startBotMatch method not found');
            console.log('Available GameManager methods:', window.gameManager ? Object.keys(window.gameManager) : 'GameManager not found');
            this.showModeSelection();
        }
    }

    showOnlinePlayers() {
        // Hide mode selection and show players list
        document.getElementById('match-selection').classList.add('hidden');
        document.getElementById('online-players-panel').classList.remove('hidden');
        
        this.loadOnlinePlayers();
    }

    async loadOnlinePlayers() {
        const container = document.getElementById('online-players-list');
        if (!container) return;

        container.innerHTML = '<div class="loading">Loading online players...</div>';

        try {
            // Get online players from user service
            const response = await fetch('/api/user/online', {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const players = await response.json();
                this.onlinePlayers = players;
                this.displayOnlinePlayers(players);
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <p class="muted">Unable to load online players</p>
                        <button class="btn btn-primary" onclick="window.matchManager.loadOnlinePlayers()">Retry</button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load online players:', error);
            container.innerHTML = `
                <div class="error-state">
                    <p class="muted">No online players available</p>
                    <p class="muted small">Try Quick Match or Bot Match instead</p>
                </div>
            `;
        }
    }

    displayOnlinePlayers(players) {
        const container = document.getElementById('online-players-list');
        const currentUser = window.authManager.getCurrentUser();
        
        // Filter out current user
        const availablePlayers = players.filter(p => p.user_id !== currentUser?.userId);

        if (availablePlayers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="muted">No other players online</p>
                    <p class="muted small">Try Quick Match or Bot Match instead</p>
                </div>
            `;
            return;
        }

        container.innerHTML = availablePlayers.map(player => `
            <div class="player-item">
                <div class="player-info">
                    <div class="player-status" title="Online"></div>
                    <div>
                        <div class="player-name">${player.display_name || `User ${player.user_id}`}</div>
                        <div class="player-stats">
                            ${player.wins || 0} wins • ${player.total_games || 0} games
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary challenge-btn" 
                        onclick="window.matchManager.challengePlayer(${player.user_id}, '${player.display_name || `User ${player.user_id}`}')">
                    Challenge
                </button>
            </div>
        `).join('');
    }

    challengePlayer(playerId, playerName) {
        this.selectedOpponent = { id: playerId, name: playerName };
        this.showGameStatus(
            'Challenge Match', 
            `Challenging ${playerName}... (Direct matches not implemented yet - using Quick Match)`
        );
        
        // For now, fall back to quick match
        // TODO: In future, implement direct challenge system
        setTimeout(() => {
            this.startQuickMatch();
        }, 2000);
    }

    showGameStatus(title, description) {
        // Hide other panels
        document.getElementById('match-selection').classList.add('hidden');
        document.getElementById('online-players-panel').classList.add('hidden');
        
        // Show game status
        const gameStatus = document.getElementById('game-status');
        gameStatus.classList.remove('hidden');
        
        // Update content
        document.getElementById('game-mode-title').textContent = title;
        document.getElementById('game-mode-description').textContent = description;
        document.getElementById('waiting-text').textContent = 
            title === 'Bot Match' ? 'Starting bot match...' : 'Searching for opponent...';
    }

    showModeSelection() {
        // Show mode selection panel
        document.getElementById('match-selection').classList.remove('hidden');
        document.getElementById('online-players-panel').classList.add('hidden');
        document.getElementById('game-status').classList.add('hidden');
        
        // Reset active mode
        document.querySelectorAll('.match-option-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('quick-match-btn').classList.add('active');
    }

    cancelSearch() {
        // Cancel any ongoing search
        if (window.gameManager && window.gameManager.websocket) {
            window.gameManager.websocket.close();
        }
        
        // Clear intervals
        if (this.searchInterval) {
            clearInterval(this.searchInterval);
            this.searchInterval = null;
        }
        
        // Return to mode selection
        this.showModeSelection();
    }

    // Called when game starts successfully
    onGameStart() {
        // Hide all match panels when game starts
        document.getElementById('match-selection').classList.add('hidden');
        document.getElementById('online-players-panel').classList.add('hidden');
        document.getElementById('game-status').classList.add('hidden');
    }

    // Called when game ends
    onGameEnd() {
        // Return to mode selection
        setTimeout(() => {
            this.showModeSelection();
        }, 2000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('match-selection')) {
        window.matchManager = new MatchManager();
    }
});