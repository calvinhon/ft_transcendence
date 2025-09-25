// frontend/js/match.js - Enhanced Matchmaking System

// Global test function for debugging
window.testOnlinePlayersClick = function() {
    console.log('Testing online players click...');
    const btn = document.getElementById('online-players-btn');
    console.log('Button found:', !!btn);
    if (btn) {
        btn.click();
    }
};

window.testShowOnlinePlayers = function() {
    console.log('Testing show online players directly...');
    if (window.matchManager) {
        window.matchManager.showOnlinePlayers();
    } else {
        console.log('No matchManager found');
    }
};

class MatchManager {
    constructor() {
        console.log('MatchManager: Constructor called');
        this.currentMode = 'quick';
        this.onlinePlayers = [];
        this.searchInterval = null;
        this.selectedOpponent = null;
        
        this.setupEventListeners();
        // Don't load online players immediately - wait for user interaction
        console.log('MatchManager: Constructor completed');
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
            alert('Online players button clicked!'); // Temporary test alert
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
        
        // Handle different button ID patterns
        let buttonId;
        if (mode === 'online') {
            buttonId = 'online-players-btn';
        } else {
            buttonId = `${mode}-match-btn`;
        }
        
        const targetBtn = document.getElementById(buttonId);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

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
        console.log('MatchManager: showOnlinePlayers called');
        
        // Hide mode selection and show players list
        const matchSelection = document.getElementById('match-selection');
        const onlinePlayersPanel = document.getElementById('online-players-panel');
        
        console.log('MatchManager: Found elements:', {
            matchSelection: !!matchSelection,
            onlinePlayersPanel: !!onlinePlayersPanel
        });
        
        if (matchSelection) {
            matchSelection.classList.add('hidden');
            console.log('MatchManager: Hidden match-selection');
        }
        
        if (onlinePlayersPanel) {
            onlinePlayersPanel.classList.remove('hidden');
            console.log('MatchManager: Shown online-players-panel');
        }
        
        this.loadOnlinePlayers();
    }

    async loadOnlinePlayers() {
        console.log('MatchManager: Loading online players...');
        const container = document.getElementById('online-players-list');
        if (!container) {
            console.error('MatchManager: online-players-list container not found');
            return;
        }

        container.innerHTML = '<div class="loading">Loading online players...</div>';

        try {
            const headers = window.authManager ? window.authManager.getAuthHeaders() : {};
            console.log('MatchManager: Using headers:', headers);
            
            // Get online players from user service
            const response = await fetch('/api/user/online', { headers });
            console.log('MatchManager: Response status:', response.status);

            if (response.ok) {
                const players = await response.json();
                console.log('MatchManager: Received players:', players);
                this.onlinePlayers = players;
                this.displayOnlinePlayers(players);
            } else {
                console.error('MatchManager: Failed to load players, status:', response.status);
                const errorText = await response.text();
                console.error('MatchManager: Error response:', errorText);
                container.innerHTML = `
                    <div class="empty-state">
                        <p class="muted">Unable to load online players (Status: ${response.status})</p>
                        <button class="btn btn-primary" onclick="window.matchManager.loadOnlinePlayers()">Retry</button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load online players:', error);
            container.innerHTML = `
                <div class="error-state">
                    <p class="muted">Network error loading players</p>
                    <p class="muted small">Check console for details</p>
                    <button class="btn btn-primary" onclick="window.matchManager.loadOnlinePlayers()">Retry</button>
                </div>
            `;
        }
    }

    displayOnlinePlayers(players) {
        const container = document.getElementById('online-players-list');
        const currentUser = window.authManager ? window.authManager.getCurrentUser() : null;
        
        console.log('MatchManager: Displaying players:', players);
        console.log('MatchManager: Current user:', currentUser);
        
        // Filter out current user if we have user data
        const availablePlayers = currentUser ? 
            players.filter(p => p.user_id !== currentUser.userId) : 
            players; // If no current user info, show all players

        console.log('MatchManager: Available players after filtering:', availablePlayers);

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