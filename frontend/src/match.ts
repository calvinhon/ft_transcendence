// Stub file - match module
// frontend/src/match.ts - TypeScript version of match manager

interface OnlinePlayer {
  user_id: number;
  username?: string;
  display_name?: string | null;
  wins?: number;
  total_games?: number;
}

interface LocalPlayer {
  user_id: string;
  username: string;
  isLocal: boolean;
  description: string;
}

interface SelectedOpponent {
  id: string | number;
  name: string;
  type: 'online' | 'local';
}

// Global test function for debugging
(window as any).testOnlinePlayersClick = function() {
  console.log('Testing online players click...');
  const btn = document.getElementById('online-players-btn');
  console.log('Button found:', !!btn);
  if (btn) {
    btn.click();
  }
};

(window as any).testShowOnlinePlayers = function() {
  console.log('Testing show online players directly...');
  const matchManager = (window as any).matchManager;
  if (matchManager) {
    matchManager.showOnlinePlayers();
  } else {
    console.log('No matchManager found');
  }
};

export class MatchManager {
  private currentMode: string = 'bot'; // Default to bot mode
  private onlinePlayers: OnlinePlayer[] = [];
  private localPlayers: LocalPlayer[] = []; // For same browser/computer players
  private searchInterval: NodeJS.Timeout | null = null;
  private selectedOpponent: SelectedOpponent | null = null;
  // Guard to prevent duplicate bot-match starts
  private isStartingBotMatch: boolean = false;
  private startBotTimeoutId: number | null = null;

  constructor() {
    console.log('MatchManager: Constructor called');
    
    this.setupEventListeners();
    console.log('MatchManager: Constructor completed');
  }

  private setupEventListeners(): void {
    console.log('MatchManager: Setting up event listeners');
    
    // Mode selection buttons
    const botBtn = document.getElementById('bot-match-btn');
    const selectOpponentsBtn = document.getElementById('select-opponents-btn');
    
    console.log('MatchManager: Found buttons:', {
      bot: !!botBtn,  
      selectOpponents: !!selectOpponentsBtn
    });

    botBtn?.addEventListener('click', () => {
      console.log('MatchManager: Bot match button clicked'); 
      this.selectMode('bot');
    });

    selectOpponentsBtn?.addEventListener('click', () => {
      console.log('MatchManager: Select opponents button clicked');
      this.selectMode('opponents');
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

  private selectMode(mode: string): void {
    console.log('MatchManager: selectMode called with:', mode);
    this.currentMode = mode;
    
    // Update active button
    document.querySelectorAll('.match-option-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Handle different button ID patterns
    let buttonId: string;
    if (mode === 'opponents') {
      buttonId = 'select-opponents-btn';
    } else {
      buttonId = `${mode}-match-btn`;
    }
    
    const targetBtn = document.getElementById(buttonId);
    if (targetBtn) {
      targetBtn.classList.add('active');
    }

    // Handle different modes
    // switch (mode) {
    //   case 'bot':
    //     console.log('MatchManager: Starting bot match');
    //     // Only trigger bot match if not already started by game.ts
    //     if (!(window as any).gameManager?.isBotMatchActive) {
    //       this.startBotMatch();
    //     }
    //     break;
    //   case 'opponents':
    //     console.log('MatchManager: Showing opponent selection');
    //     this.showOpponentSelection();
    //     break;
    // }
  }

  private showOpponentSelection(): void {
    console.log('MatchManager: showOpponentSelection called');
    
    // Hide mode selection, show opponent panel
    const matchSelection = document.getElementById('match-selection');
    const onlinePlayersPanel = document.getElementById('online-players-panel');
    
    if (matchSelection) {
      matchSelection.classList.add('hidden');
    }
    
    if (onlinePlayersPanel) {
      onlinePlayersPanel.classList.remove('hidden');
    }
    
    // Update the title and description for broader opponent selection
    const listTitle = document.querySelector('#online-players-panel h3');
    if (listTitle) {
      listTitle.textContent = 'Select Opponent';
    }
    
    const listDesc = document.querySelector('#online-players-panel p');
    if (listDesc) {
      listDesc.textContent = 'Choose from online players or local players';
    }
    
    // Load both online and local players
    this.loadAvailableOpponents();
  }

  private async loadAvailableOpponents(): Promise<void> {
    console.log('MatchManager: Loading available opponents...');
    const container = document.getElementById('online-players-list');
    if (!container) {
      console.error('MatchManager: online-players-list container not found');
      return;
    }

    container.innerHTML = '<div class="loading">Loading available opponents...</div>';

    try {
      // Load online players
      const authManager = (window as any).authManager;
      const headers = authManager ? authManager.getAuthHeaders() : {};
      const response = await fetch('/api/user/online', { headers });
      
      let onlinePlayers: OnlinePlayer[] = [];
      if (response.ok) {
        onlinePlayers = await response.json();
        console.log('MatchManager: Received online players:', onlinePlayers);
      }

      // Create local players (for same browser/computer play)
      const localPlayers = this.getLocalPlayers();
      
      // Combine and display all available opponents
      this.displayAvailableOpponents(onlinePlayers, localPlayers);
      
    } catch (error) {
      console.error('Failed to load opponents:', error);
      container.innerHTML = `
        <div class="error-state">
          <p class="muted">Network error loading opponents</p>
          <p class="muted small">Check console for details</p>
          <button class="btn btn-primary" onclick="window.matchManager.loadAvailableOpponents()">Retry</button>
        </div>
      `;
    }
  }

  private getLocalPlayers(): LocalPlayer[] {
    // Create local player options for same browser/computer play
    return [
      {
        user_id: 'local_player_1',
        username: 'Local Player 1',
        isLocal: true,
        description: 'Player using same device'
      },
      {
        user_id: 'local_player_2', 
        username: 'Local Player 2',
        isLocal: true,
        description: 'Another player on this device'
      }
    ];
  }

  private displayAvailableOpponents(onlinePlayers: OnlinePlayer[], localPlayers: LocalPlayer[]): void {
    const container = document.getElementById('online-players-list');
    if (!container) return;
    
    const authManager = (window as any).authManager;
    const currentUser = authManager ? authManager.getCurrentUser() : null;
    
    // Filter out current user from online players
    const availableOnlinePlayers = currentUser ? 
      onlinePlayers.filter(p => p.user_id !== currentUser.userId) : 
      onlinePlayers;

    console.log('MatchManager: Displaying opponents - Online:', availableOnlinePlayers.length, 'Local:', localPlayers.length);
    
    if (availableOnlinePlayers.length === 0 && localPlayers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">😔</div>
          <p class="muted">No opponents available</p>
          <button class="btn btn-primary" onclick="window.matchManager.loadAvailableOpponents()">Refresh</button>
        </div>
      `;
      return;
    }

    let html = '<div class="players-sections">';
    
    // Online Players Section
    if (availableOnlinePlayers.length > 0) {
      html += `
        <div class="player-section">
          <h3>🌐 Online Players</h3>
          <div class="players-grid">
      `;
      
      availableOnlinePlayers.forEach(player => {
        html += `
          <div class="player-card" data-player-id="${player.user_id}" data-player-type="online">
            <div class="player-info">
              <div class="player-name">${this.escapeHtml(player.username || player.display_name || `User ${player.user_id}`)}</div>
              <div class="player-status online">Online</div>
            </div>
            <button class="btn btn-primary btn-sm challenge-btn">Challenge</button>
          </div>
        `;
      });
      
      html += '</div></div>';
    }
    
    // Local Players Section
    if (localPlayers.length > 0) {
      html += `
        <div class="player-section">
          <h3>🏠 Local Players</h3>
          <div class="players-grid">
      `;
      
      localPlayers.forEach(player => {
        html += `
          <div class="player-card" data-player-id="${player.user_id}" data-player-type="local">
            <div class="player-info">
              <div class="player-name">${this.escapeHtml(player.username)}</div>
              <div class="player-status local">${player.description}</div>
            </div>
            <button class="btn btn-primary btn-sm challenge-btn">Play</button>
          </div>
        `;
      });
      
      html += '</div></div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    // Add click handlers for challenge buttons
    this.setupChallengeHandlers();
  }

  private startBotMatch(): void {
    // Prevent duplicate starts (rapid clicks / overlapping flow)
    if (this.isStartingBotMatch) {
      console.debug('MatchManager: startBotMatch already in progress, ignoring duplicate');
      return;
    }

    // Also guard if GameManager already playing or starting
    const gm = (window as any).gameManager;
    if (gm && (gm.isPlaying || (gm as any).isStartingMatch)) {
      console.debug('MatchManager: GameManager already playing/starting; ignoring bot start');
      return;
    }

    this.isStartingBotMatch = true;
    // safety timeout to clear guard if start never completes
    if (this.startBotTimeoutId) {
      clearTimeout(this.startBotTimeoutId);
    }
    this.startBotTimeoutId = window.setTimeout(() => {
      console.warn('MatchManager: startBotMatch timeout - clearing start guard');
      this.isStartingBotMatch = false;
      this.startBotTimeoutId = null;
      this.showModeSelection();
    }, 8000);

    this.showGameStatus('Bot Match', 'Starting game against AI opponent...');
    // Create immediate bot match
    if (gm && typeof gm.startBotMatch === 'function') {
      console.log('Starting bot match via GameManager');
      try {
        gm.startBotMatch();
      } catch (err) {
        console.error('MatchManager: startBotMatch threw', err);
        this.isStartingBotMatch = false;
        if (this.startBotTimeoutId) { clearTimeout(this.startBotTimeoutId); this.startBotTimeoutId = null; }
        this.showModeSelection();
      }
    } else {
      console.error('GameManager not available or startBotMatch method not found');
      console.log('Available GameManager methods:', gm ? Object.keys(gm) : 'GameManager not found');
      this.isStartingBotMatch = false;
      if (this.startBotTimeoutId) { clearTimeout(this.startBotTimeoutId); this.startBotTimeoutId = null; }
      this.showModeSelection();
    }
  }

  public showOnlinePlayers(): void {
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

  private async loadOnlinePlayers(): Promise<void> {
    console.log('MatchManager: Loading online players...');
    const container = document.getElementById('online-players-list');
    if (!container) {
      console.error('MatchManager: online-players-list container not found');
      return;
    }

    container.innerHTML = '<div class="loading">Loading online players...</div>';

    try {
      const authManager = (window as any).authManager;
      const headers = authManager ? authManager.getAuthHeaders() : {};
      console.log('MatchManager: Using headers:', headers);
      
      // Get online players from user service
      const response = await fetch('/api/user/online', { headers });
      console.log('MatchManager: Response status:', response.status);

      if (response.ok) {
        const players: OnlinePlayer[] = await response.json();
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

  private displayOnlinePlayers(players: OnlinePlayer[]): void {
    const container = document.getElementById('online-players-list');
    if (!container) return;
    
    const authManager = (window as any).authManager;
    const currentUser = authManager ? authManager.getCurrentUser() : null;
    
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

  private setupChallengeHandlers(): void {
    const challengeBtns = document.querySelectorAll('.challenge-btn');
    challengeBtns.forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const playerCard = target.closest('.player-card') as HTMLElement;
        const playerId = playerCard.getAttribute('data-player-id') || '';
        const playerType = playerCard.getAttribute('data-player-type') as 'online' | 'local' || 'online';
        const playerNameEl = playerCard.querySelector('.player-name') as HTMLElement;
        const playerName = playerNameEl ? playerNameEl.textContent || '' : '';
        
        this.challengePlayer(playerId, playerName, playerType);
      });
    });
  }

  public challengePlayer(playerId: string | number, playerName: string, playerType: 'online' | 'local' = 'online'): void {
    this.selectedOpponent = { id: playerId, name: playerName, type: playerType };
    
    if (playerType === 'local') {
      // Handle local player game
      this.startLocalGame(playerId.toString(), playerName);
    } else {
      // Handle online player challenge
      this.showGameStatus(
        'Challenge Match', 
        `Challenging ${playerName}... (Direct matches not implemented yet - using Quick Match)`
      );
      
      // For now, fall back to quick match
      // TODO: In future, implement direct challenge system
      setTimeout(() => {
        const gameManager = (window as any).gameManager;
        if (gameManager && typeof gameManager.findMatch === 'function') {
          gameManager.findMatch();
        } else {
          console.error('GameManager not available or findMatch method not found');
          this.showModeSelection();
        }
      }, 2000);
    }
  }

  private startLocalGame(playerId: string, playerName: string): void {
    this.showGameStatus(
      'Local Match', 
      `Starting local game with ${playerName}...`
    );
    
    // Create a local game session
    // TODO: Implement proper local multiplayer with shared controls
    setTimeout(() => {
      const gameManager = (window as any).gameManager;
      if (gameManager && typeof gameManager.startLocalMatch === 'function') {
        gameManager.startLocalMatch(playerId, playerName);
      } else {
        // Fallback to bot match for now
        console.log('Local match not implemented, starting bot match instead');
        if (gameManager && typeof gameManager.startBotMatch === 'function') {
          gameManager.startBotMatch();
        } else {
          console.error('No game modes available');
          this.showModeSelection();
        }
      }
    }, 1000);
  }

  private showGameStatus(title: string, description: string): void {
    // Hide other panels
    const matchSelection = document.getElementById('match-selection');
    const onlinePlayersPanel = document.getElementById('online-players-panel');
    const gameStatus = document.getElementById('game-status');
    
    if (matchSelection) {
      matchSelection.classList.add('hidden');
    }
    
    if (onlinePlayersPanel) {
      onlinePlayersPanel.classList.add('hidden');
    }
    
    // Show game status
    if (gameStatus) {
      gameStatus.classList.remove('hidden');
    }
    
    // Update content
    const gameTitle = document.getElementById('game-mode-title');
    const gameDesc = document.getElementById('game-mode-description');
    const waitingText = document.getElementById('waiting-text');
    
    if (gameTitle) {
      gameTitle.textContent = title;
    }
    
    if (gameDesc) {
      gameDesc.textContent = description;
    }
    
    if (waitingText) {
      waitingText.textContent = title === 'Bot Match' ? 'Starting bot match...' : 'Searching for opponent...';
    }
  }

  private showModeSelection(): void {
    // Show mode selection panel
    const matchSelection = document.getElementById('match-selection');
    const onlinePlayersPanel = document.getElementById('online-players-panel');
    const gameStatus = document.getElementById('game-status');
    
    if (matchSelection) {
      matchSelection.classList.remove('hidden');
    }
    
    if (onlinePlayersPanel) {
      onlinePlayersPanel.classList.add('hidden');
    }
    
    if (gameStatus) {
      gameStatus.classList.add('hidden');
    }
    
    // Reset active mode
    document.querySelectorAll('.match-option-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Set bot match as default active (since we removed quick match)
    const botBtn = document.getElementById('bot-match-btn');
    if (botBtn) {
      botBtn.classList.add('active');
    }
  }

  private cancelSearch(): void {
    // Cancel any ongoing search
    // Prefer asking GameManager to stop the current search/match so it can
    // clean up sockets/intervals properly instead of closing sockets directly.
    const gameManager = (window as any).gameManager;
    if (gameManager && typeof gameManager.stopGame === 'function') {
      gameManager.stopGame();
    } else if (gameManager && gameManager.websocket) {
      // Fallback: if stopGame not available, close the socket
      try { gameManager.websocket.close(); } catch (e) { /* ignore */ }
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
  public onGameStart(): void {
    // Clear any start guard (bot match started)
    if (this.isStartingBotMatch) {
      this.isStartingBotMatch = false;
      if (this.startBotTimeoutId) { clearTimeout(this.startBotTimeoutId); this.startBotTimeoutId = null; }
    }

    // Hide all match panels when game starts
    const matchSelection = document.getElementById('match-selection');
    const onlinePlayersPanel = document.getElementById('online-players-panel');
    const gameStatus = document.getElementById('game-status');
    
    if (matchSelection) {
      matchSelection.classList.add('hidden');
    }
    
    if (onlinePlayersPanel) {
      onlinePlayersPanel.classList.add('hidden');
    }
    
    if (gameStatus) {
      gameStatus.classList.add('hidden');
    }
  }

  // Called when game ends
  public onGameEnd(): void {
    // Return to mode selection
    setTimeout(() => {
      this.showModeSelection();
    }, 2000);
  }

  // Utility method to escape HTML
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('match-selection')) {
    (window as any).matchManager = new MatchManager();
  }
});