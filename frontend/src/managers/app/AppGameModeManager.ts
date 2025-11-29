// frontend/src/managers/app/AppGameModeManager.ts
// Handles game mode specific setup and management for the App

import { logger } from '../../utils/Logger';
import { settingsManager } from '../SettingsManager';
import { playerManager } from '../PlayerManager';
import { authService } from '../../core/authService';
import { sharedFlags } from '../SharedFlags';
import { LocalPlayerManager } from '../local-player/LocalPlayerManager';

export class AppGameModeManager {
  constructor() {
    logger.info('AppGameModeManager', '🏗️ AppGameModeManager initialized');
  }

  /**
   * Handle game mode change
   */
  handleGameModeChange(tab: HTMLElement): void {
    const mode = tab.getAttribute('data-mode') as 'coop' | 'arcade' | 'tournament';
    console.log('[AppGameModeManager] handleGameModeChange called with mode:', mode);
    if (!mode) return;

    logger.info('AppGameModeManager', `Game mode changed to: ${mode}`);

    // Update active class on tabs
    const allTabs = document.querySelectorAll('.game-mode-tab');
    allTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update the game settings with the new mode using SettingsManager
    settingsManager.updateSettings({ gameMode: mode });

    // Update players section based on mode
    this.updatePlayersForMode(mode);
  }

  /**
   * Update players section based on game mode
   */
  private updatePlayersForMode(mode: 'coop' | 'arcade' | 'tournament'): void {
    // Update host player display with username
    const hostPlayerName = document.getElementById('host-player-name');
    const currentUser = authService?.getCurrentUser?.();
    console.log('[updatePlayersForMode] mode:', mode, 'currentUser:', currentUser);
    if (hostPlayerName && currentUser) {
      const currentUsername = currentUser.username;
      console.log('[updatePlayersForMode] Setting arcade host name to:', currentUsername);
      hostPlayerName.textContent = currentUsername;
    }

    // Handle mode-specific player setup
    switch (mode) {
      case 'coop':
        this.setupCoopMode();
        break;
      case 'arcade':
        this.setupArcadeMode();
        break;
      case 'tournament':
        this.setupTournamentMode();
        this.populateOnlinePlayers();
        break;
    }

    // Initialize the game party display and sync score
    const appPlayerManager = (window as any).appPlayerManager;
    if (appPlayerManager) {
      appPlayerManager.updateGamePartyDisplay();
    }
    this.updateScoreDisplay(); // Sync score display with gameSettings
  }

  /**
   * Setup CO-OP mode
   */
  private setupCoopMode(): void {
    // CO-OP mode: Show single party frame with HOST and AI
    const coopPartyFrame = document.getElementById('coop-party-frame');
    const tournamentPartyFrame = document.getElementById('tournament-party-frame');
    const teamsRow = document.getElementById('teams-row');

    // Show coop frame, hide others
    if (coopPartyFrame) coopPartyFrame.style.display = 'block';
    if (tournamentPartyFrame) tournamentPartyFrame.style.display = 'none';
    if (teamsRow) teamsRow.style.display = 'none';

    // Activate host and AI cards in coop frame
    const hostPlayerCardCoop = document.getElementById('host-player-card-coop');
    const aiPlayerCardCoop = document.getElementById('ai-player-card-coop');
    const hostPlayerNameCoop = document.getElementById('host-player-name-coop');

    // Update host name in coop frame
    const hostUser = this.getHostUser();
    console.log('[setupCoopMode] hostUser:', hostUser);
    if (hostPlayerNameCoop && hostUser) {
      console.log('[setupCoopMode] Setting host name to:', hostUser.username);
      hostPlayerNameCoop.textContent = hostUser.username;
    }

    if (hostPlayerCardCoop) {
      hostPlayerCardCoop.classList.add('active');
      // persist host selection
      try {
        if (hostUser && hostUser.userId) playerManager.setSelectedPlayers([String(hostUser.userId)]);
      } catch (e) { /* ignore */ }
    }
    if (aiPlayerCardCoop) {
      aiPlayerCardCoop.classList.add('active');
      playerManager.setSelectedPlayers(['ai-player']);
    }

    // Hide add player buttons for CO-OP mode since it's HOST vs AI only
    const addPlayerButtons = document.querySelectorAll('.add-player-btn');
    addPlayerButtons.forEach(btn => {
      (btn as HTMLElement).style.display = 'none';
    });

    // Show CO-OP campaign progress UI
    const coopProgress = document.getElementById('coop-campaign-progress');
    if (coopProgress) {
      coopProgress.style.display = 'block';
    }

    // Update CO-OP progress UI to sync AI difficulty
    // Note: Coop progress UI is now handled by SettingsManager
  }

  /**
   * Setup arcade mode
   */
  private setupArcadeMode(): void {
    // Arcade mode: Show team-based layout
    const coopPartyFrame = document.getElementById('coop-party-frame');
    const tournamentPartyFrame = document.getElementById('tournament-party-frame');
    const teamsRow = document.getElementById('teams-row');

    // Hide coop and tournament frames, show teams
    if (coopPartyFrame) coopPartyFrame.style.display = 'none';
    if (tournamentPartyFrame) tournamentPartyFrame.style.display = 'none';
    if (teamsRow) teamsRow.style.display = 'flex';

    // Arcade mode: Allow adding players, show add player buttons
    const addPlayerButtons = document.querySelectorAll('.add-player-btn');
    addPlayerButtons.forEach(btn => {
      (btn as HTMLElement).style.display = 'flex';
    });

    // Keep host selected by default (as per requirement)
    const hostPlayerCard = document.getElementById('host-player-card');
    const aiPlayerCard = document.getElementById('ai-player-card');

    // Ensure host is active by default in arcade mode
    if (hostPlayerCard) {
      hostPlayerCard.classList.add('active');
      try {
        const hostUser = this.getHostUser();
        if (hostUser && hostUser.userId) playerManager.setSelectedPlayers([String(hostUser.userId)]);
      } catch (e) { /* ignore */ }
    }

    // Remove AI player selection in arcade mode
    if (aiPlayerCard) {
      aiPlayerCard.classList.remove('active');
      playerManager.clearSelections();
    }

    // Hide CO-OP campaign progress UI
    const coopProgress = document.getElementById('coop-campaign-progress');
    if (coopProgress) {
      coopProgress.style.display = 'none';
    }

    // Setup drag-and-drop for team lists
    const appPlayerManager = (window as any).appPlayerManager;
    if (appPlayerManager) {
      appPlayerManager.setupDragAndDrop();
      appPlayerManager.setupHostAndAIDrag();
    }
  }

  /**
   * Setup tournament mode
   */
  private setupTournamentMode(): void {
    // Tournament mode: Show single party frame with host + add player button
    const coopPartyFrame = document.getElementById('coop-party-frame');
    const tournamentPartyFrame = document.getElementById('tournament-party-frame');
    const teamsRow = document.getElementById('teams-row');

    // Hide coop frame and teams, show tournament frame
    if (coopPartyFrame) coopPartyFrame.style.display = 'none';
    if (tournamentPartyFrame) tournamentPartyFrame.style.display = 'block';
    if (teamsRow) teamsRow.style.display = 'none';

    // Update host player name in tournament frame
    const hostPlayerNameTournament = document.getElementById('host-player-name-tournament');
    const hostUser = this.getHostUser();
    console.log('[setupTournamentMode] hostUser:', hostUser);
    if (hostPlayerNameTournament && hostUser) {
      console.log('[setupTournamentMode] Setting host name to:', hostUser.username);
      hostPlayerNameTournament.textContent = hostUser.username;
    }

    // Set host as active and selected by default
    const hostPlayerCardTournament = document.getElementById('host-player-card-tournament');
    if (hostPlayerCardTournament) {
      hostPlayerCardTournament.classList.add('active');
      try {
        if (hostUser && hostUser.userId) playerManager.setSelectedPlayers([String(hostUser.userId)]);
      } catch (e) { /* ignore */ }
    }

    // Show the add player button for tournament mode
    const addTournamentPlayerBtn = document.getElementById('add-tournament-player-btn');
    if (addTournamentPlayerBtn) {
      addTournamentPlayerBtn.style.display = 'flex';

      // Attach event listener for tournament add player button
      addTournamentPlayerBtn.removeEventListener('click', this.handleAddTournamentPlayer);
      addTournamentPlayerBtn.addEventListener('click', this.handleAddTournamentPlayer.bind(this));
    }

    // Hide CO-OP campaign progress UI
    const coopProgress = document.getElementById('coop-campaign-progress');
    if (coopProgress) {
      coopProgress.style.display = 'none';
    }

    // Display local players that were added in arcade mode (they should appear in tournament too)
    const appPlayerManager = (window as any).appPlayerManager;
    if (appPlayerManager) {
      appPlayerManager.updateGamePartyDisplay();
    }
  }

  /**
   * Handle add tournament player
   */
  private handleAddTournamentPlayer = (e: Event) => {
    e.stopPropagation();
    console.log('[handleAddTournamentPlayer] Setting addPlayerTeam to "tournament"');
    if (sharedFlags) sharedFlags.addPlayerTeam = 'tournament'; // Mark as tournament mode (not arcade team)
    const localPlayerManager = (window as any).localPlayerManager as LocalPlayerManager;
    if (localPlayerManager) {
      localPlayerManager.showLoginModal();
    }
  };

  /**
   * Populate online players for tournament mode
   */
  private populateOnlinePlayers(): void {
    const onlinePlayersList = document.getElementById('online-players-list');
    const onlineCount = document.getElementById('online-count');

    if (!onlinePlayersList || !onlineCount) return;

    // Mock online players data - replace with real API call
    const mockOnlinePlayers = [
      { id: '2', username: 'player2', status: 'online' },
      { id: '3', username: 'player3', status: 'online' },
      { id: '4', username: 'player4', status: 'in-game' }
    ];

    onlineCount.textContent = mockOnlinePlayers.length.toString();

    if (mockOnlinePlayers.length === 0) {
      onlinePlayersList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <span>No other players online</span>
        </div>
      `;
    } else {
      onlinePlayersList.innerHTML = mockOnlinePlayers.map(player => `
        <div class="player-card" data-player-id="${player.id}">
          <div class="player-avatar">
            <i class="fas fa-user"></i>
          </div>
          <div class="player-info">
            <span class="player-name">${player.username}</span>
            <span class="player-status ${player.status}">${player.status}</span>
          </div>
        </div>
      `).join('');

      // Add click listeners for online players
      onlinePlayersList.querySelectorAll('.player-card').forEach(card => {
        card.addEventListener('click', () => {
          const playerId = card.getAttribute('data-player-id');
          const playerName = card.querySelector('.player-name')?.textContent;
          if (playerId && playerName) {
            this.invitePlayer(playerId, playerName);
          }
        });
      });
    }
  }

  /**
   * Invite player to game
   */
  private invitePlayer(playerId: string, playerName: string): void {
    // TODO: Implement player invitation system
    console.log(`Inviting player ${playerName} (${playerId}) to game`);
    // For now, just show a notification
    const showToast = (window as any).showToast;
    if (showToast) {
      showToast(`Invitation sent to ${playerName}!`, 'info');
    }
  }

  /**
   * Get host user
   */
  private getHostUser(): { userId: number; username: string } | null {
    const currentUser = authService?.getCurrentUser?.();
    if (!currentUser) return null;

    // Verify this user matches the stored token
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      // This is the host user (token holder)
      return currentUser;
    }

    return currentUser;
  }

  /**
   * Update score display
   */
  private updateScoreDisplay(): void {
    const scoreDisplay = document.getElementById('score-value');
    const score = settingsManager.getSetting('scoreToWin');
    if (scoreDisplay && score !== undefined) {
      scoreDisplay.textContent = score.toString();
    }
  }

  /**
   * Initialize the game mode manager
   */
  initialize(): void {
    // Set the initial active tab
    const coopTab = document.querySelector('.game-mode-tab[data-mode="coop"]') as HTMLElement;
    if (coopTab) {
      coopTab.classList.add('active');
    }

    // Setup initial game mode
    this.setupCoopMode();
  }

  /**
   * Cleanup the game mode manager
   */
  cleanup(): void {
    // Clear any game mode specific state
    // Remove event listeners if any were added
  }
}