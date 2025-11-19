// frontend/src/match-ui-manager.ts
// Match UI management

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

export class MatchUIManager {
  private currentMode: string = 'bot';

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    console.log('MatchUIManager: Setting up event listeners');

    // Mode selection buttons
    const botBtn = document.getElementById('bot-match-btn');
    const selectOpponentsBtn = document.getElementById('select-opponents-btn');

    botBtn?.addEventListener('click', () => {
      console.log('MatchUIManager: Bot match button clicked');
      this.selectMode('bot');
    });

    selectOpponentsBtn?.addEventListener('click', () => {
      console.log('MatchUIManager: Select opponents button clicked');
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

    // Online players button
    document.getElementById('online-players-btn')?.addEventListener('click', () => {
      this.showOnlinePlayers();
    });

    // Start match buttons
    document.getElementById('start-bot-match-btn')?.addEventListener('click', () => {
      this.startBotMatch();
    });

    document.getElementById('start-selected-match-btn')?.addEventListener('click', () => {
      this.startSelectedMatch();
    });
  }

  private selectMode(mode: string): void {
    console.log('MatchUIManager: selectMode called with:', mode);
    this.currentMode = mode;

    // Update active button
    document.querySelectorAll('.match-option-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    const activeBtn = document.getElementById(`${mode}-match-btn`);
    activeBtn?.classList.add('active');

    // Show appropriate screen
    if (mode === 'bot') {
      this.showBotMatchScreen();
    } else if (mode === 'opponents') {
      this.showOpponentSelectionScreen();
    }
  }

  private showModeSelection(): void {
    console.log('MatchUIManager: Showing mode selection');

    // Hide all match screens
    this.hideAllMatchScreens();

    // Show mode selection
    const modeSelection = document.getElementById('match-mode-selection');
    if (modeSelection) {
      modeSelection.style.display = 'block';
    }
  }

  private showBotMatchScreen(): void {
    console.log('MatchUIManager: Showing bot match screen');

    this.hideAllMatchScreens();

    const botScreen = document.getElementById('bot-match-screen');
    if (botScreen) {
      botScreen.style.display = 'block';
    }
  }

  private showOpponentSelectionScreen(): void {
    console.log('MatchUIManager: Showing opponent selection screen');

    this.hideAllMatchScreens();

    const opponentScreen = document.getElementById('opponent-selection-screen');
    if (opponentScreen) {
      opponentScreen.style.display = 'block';
    }

    // Load and display online players
    this.refreshOnlinePlayersList();
  }

  public showOnlinePlayers(): void {
    console.log('MatchUIManager: Showing online players');

    const onlinePlayersSection = document.getElementById('online-players-section');
    if (onlinePlayersSection) {
      // Hide other sections
      document.querySelectorAll('.main-section').forEach(section => {
        (section as HTMLElement).style.display = 'none';
      });

      onlinePlayersSection.style.display = 'block';

      // Refresh the players list
      this.refreshOnlinePlayersList();
    }
  }

  private refreshOnlinePlayersList(): void {
    const dataManager = (window as any).matchDataManager;
    if (!dataManager) return;

    const players = dataManager.getOnlinePlayers();
    this.displayOnlinePlayers(players);
  }

  private displayOnlinePlayers(players: OnlinePlayer[]): void {
    const container = document.getElementById('online-players-list');
    if (!container) return;

    if (players.length === 0) {
      container.innerHTML = '<p class="no-players">No online players found</p>';
      return;
    }

    container.innerHTML = players.map(player => this.createOnlinePlayerCard(player)).join('');
  }

  private createOnlinePlayerCard(player: OnlinePlayer): string {
    const wins = player.wins || 0;
    const totalGames = player.total_games || 0;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const displayName = player.display_name || player.username || `Player ${player.user_id}`;

    return `
      <div class="online-player-card" data-player-id="${player.user_id}">
        <div class="player-info">
          <div class="player-name">${displayName}</div>
          <div class="player-stats">
            <span class="wins">${wins}W</span>
            <span class="total-games">${totalGames}G</span>
            <span class="win-rate">${winRate}%</span>
          </div>
        </div>
        <div class="player-actions">
          <button class="btn btn-primary challenge-btn" data-player-id="${player.user_id}">
            Challenge
          </button>
        </div>
      </div>
    `;
  }

  private cancelSearch(): void {
    console.log('MatchUIManager: Cancelling search');

    const searchManager = (window as any).matchSearchManager;
    if (searchManager) {
      searchManager.cancelSearch();
    }

    // Hide searching screen and show opponent selection
    this.showOpponentSelectionScreen();
  }

  private startBotMatch(): void {
    console.log('MatchUIManager: Starting bot match');

    const matchManager = (window as any).matchManager;
    if (matchManager) {
      matchManager.startBotMatch();
    }
  }

  private startSelectedMatch(): void {
    console.log('MatchUIManager: Starting selected match');

    const matchManager = (window as any).matchManager;
    if (matchManager) {
      matchManager.startSelectedMatch();
    }
  }

  private hideAllMatchScreens(): void {
    const screens = [
      'match-mode-selection',
      'bot-match-screen',
      'opponent-selection-screen',
      'searching-players-screen',
      'online-players-section'
    ];

    screens.forEach(screenId => {
      const screen = document.getElementById(screenId);
      if (screen) {
        screen.style.display = 'none';
      }
    });
  }

  public showSearchingScreen(): void {
    this.hideAllMatchScreens();

    const searchingScreen = document.getElementById('searching-players-screen');
    if (searchingScreen) {
      searchingScreen.style.display = 'block';
    }
  }

  public updateSearchingStatus(message: string): void {
    const statusElement = document.getElementById('searching-status');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  public showMatchSection(): void {
    const matchSection = document.getElementById('match-section');
    if (matchSection) {
      // Hide other sections
      document.querySelectorAll('.main-section').forEach(section => {
        (section as HTMLElement).style.display = 'none';
      });

      matchSection.style.display = 'block';
      this.showModeSelection();
    }
  }

  public highlightSelectedOpponent(playerId: number): void {
    // Remove previous highlights
    document.querySelectorAll('.online-player-card').forEach(card => {
      card.classList.remove('selected');
    });

    // Highlight selected player
    const selectedCard = document.querySelector(`.online-player-card[data-player-id="${playerId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }
  }

  public showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const toast = (window as any).showToast;
    if (toast) {
      toast(message, type);
    } else {
      console.log(`Toast: ${type.toUpperCase()} - ${message}`);
    }
  }
}