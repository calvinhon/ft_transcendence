// frontend/src/managers/app/AppPlayerManager.ts
// Handles player-related functionality for the App (drag/drop, team management, etc.)

import { logger } from '../../utils/Logger';
import { playerManager } from '../player-manager';
import { settingsManager } from '../settings-manager';
import { authService } from '../../core/authService';

export class AppPlayerManager {
  private draggedElement: HTMLElement | null = null;

  constructor() {
    logger.info('app-player-manager', '🏗️ AppPlayerManager initialized');
  }

  /**
   * Create player card element
   */
  createPlayerCard(player: any): HTMLElement {
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card local-player';
    playerCard.dataset.playerId = player.id;
    playerCard.dataset.email = player.email || ''; // Store email for duplicate checking

    // Make player card draggable in arcade mode
    playerCard.draggable = true;
    playerCard.dataset.team = (player as any).team || '1';

    playerCard.innerHTML = [
      '<div class="player-avatar"><i class="fas fa-home"></i></div>',
      '<div class="player-info">',
        `<span class="player-name">${player.username}</span>`,
        '<span class="role-badge local">Local</span>',
      '</div>',
      '<div class="player-actions">',
        `<button class="remove-btn" type="button"><i class="fas fa-times"></i></button>`,
      '</div>'
    ].join('');

    // Add drag event listeners
    playerCard.addEventListener('dragstart', this.handleDragStart.bind(this));
    playerCard.addEventListener('dragend', this.handleDragEnd.bind(this));

    // Remove button event
    playerCard.querySelector('.remove-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeLocalPlayer(player.id);
    });

    return playerCard;
  }

  /**
   * Remove local player
   */
  removeLocalPlayer(playerId: string): void {
    playerManager.removeLocalPlayer(playerId);
  }

  /**
   * Update game party display
   */
  updateGamePartyDisplay(): void {
    const team1List = document.getElementById('team1-list');
    const team2List = document.getElementById('team2-list');
    const tournamentLocalContainer = document.getElementById('tournament-local-players');

    console.log('[updateGamePartyDisplay] Current mode:', settingsManager.getSetting('gameMode'));
    console.log('[updateGamePartyDisplay] Tournament container exists:', !!tournamentLocalContainer);
    console.log('[updateGamePartyDisplay] Local players count:', playerManager.getLocalPlayers().length);

    // Clear tournament local players if it exists
    if (tournamentLocalContainer) {
      tournamentLocalContainer.innerHTML = '';
      console.log('[updateGamePartyDisplay] Cleared tournament local container');
    }

    // Check current game mode to determine which container to update
    const currentMode = settingsManager.getSetting('gameMode');

    // If we're in tournament mode, show ALL local players (from any mode)
    if (currentMode === 'tournament' && tournamentLocalContainer) {
      console.log('[updateGamePartyDisplay] Adding ALL local players to tournament container');

      // CRITICAL: Ensure host name is correct before updating players
      const hostPlayerNameTournament = document.getElementById('host-player-name-tournament');
      const currentUser = authService?.getCurrentUser?.();
      if (hostPlayerNameTournament && currentUser) {
        const currentUsername = currentUser.username;
        console.log('[updateGamePartyDisplay] Ensuring tournament host name is:', currentUsername);
        hostPlayerNameTournament.textContent = currentUsername;
      }

      playerManager.getLocalPlayers().forEach((player, index) => {
        const playerCard = this.createPlayerCard(player);
        const playerId = player.id?.toString();
        console.log(`[updateGamePartyDisplay] Adding player ${index}:`, player.username, 'ID:', playerId);
        tournamentLocalContainer.appendChild(playerCard);

        // Restore highlight if this player is selected
        if (playerId && playerManager.isPlayerSelected(playerId)) {
          playerCard.classList.add('active');
        } else {
          playerCard.classList.remove('active');
        }
      });
      console.log('[updateGamePartyDisplay] Tournament container children count:', tournamentLocalContainer.children.length);
      return;
    }

    // If we're not in arcade mode (coop or mode without team lists), return early
    if (!team1List || !team2List) {
      console.log('[updateGamePartyDisplay] Not in arcade mode, returning early');
      return;
    }

    // Clear local players from both teams (keep host and AI)
    const team1LocalContainer = document.getElementById('team1-local-players');
    if (team1LocalContainer) team1LocalContainer.innerHTML = '';

    // For TEAM 2, clear any local players after AI
    let team2LocalContainer = document.getElementById('team2-local-players');
    if (team2LocalContainer) {
      team2LocalContainer.innerHTML = '';
    } else {
      // Create container if it doesn't exist
      team2LocalContainer = document.createElement('div');
      team2LocalContainer.id = 'team2-local-players';
      team2LocalContainer.className = 'local-players';
      // Insert after AI card
      const aiCard = document.getElementById('ai-player-card');
      if (aiCard && aiCard.parentNode) {
        aiCard.parentNode.insertBefore(team2LocalContainer, aiCard.nextSibling);
      }
    }

    // Add local players to their respective teams (arcade mode only - filter out tournament players)
    playerManager.getLocalPlayers().forEach(player => {
      // Skip tournament players in arcade mode
      if ((player as any).team === 'tournament') {
        console.log('[updateGamePartyDisplay] Skipping tournament player in arcade mode:', player.username);
        return;
      }

      const playerCard = this.createPlayerCard(player);
      const playerId = player.id?.toString();

      // Determine which team container to use
      const team = (player as any).team || 1; // Default to team 1 if not specified
      const targetContainer = team === 2 ? team2LocalContainer : team1LocalContainer;

      if (targetContainer) {
        targetContainer.appendChild(playerCard);
        // Restore highlight if this player is selected
        if (playerId && playerManager.isPlayerSelected(playerId)) {
          playerCard.classList.add('active');
        } else {
          playerCard.classList.remove('active');
        }
      }
    });
  }

  /**
   * Setup drag and drop for arcade mode
   */
  setupDragAndDrop(): void {
    const team1List = document.getElementById('team1-list');
    const team2List = document.getElementById('team2-list');

    if (!team1List || !team2List) {
      console.warn('[DragDrop] Team lists not found');
      return;
    }

    // Add drop zone event listeners to both team lists
    [team1List, team2List].forEach(list => {
      list.addEventListener('dragover', this.handleDragOver.bind(this));
      list.addEventListener('dragleave', this.handleDragLeave.bind(this));
      list.addEventListener('drop', this.handleDrop.bind(this));
    });

    console.log('[DragDrop] Setup complete for team lists');
  }

  /**
   * Setup drag for host and AI players
   */
  setupHostAndAIDrag(): void {
    // Make host draggable
    const hostPlayerCard = document.getElementById('host-player-card');
    if (hostPlayerCard) {
      hostPlayerCard.addEventListener('dragstart', this.handleDragStart.bind(this));
      hostPlayerCard.addEventListener('dragend', this.handleDragEnd.bind(this));
      console.log('[DragDrop] Host player drag listeners attached');
    }

    // Make AI draggable
    const aiPlayerCard = document.getElementById('ai-player-card');
    if (aiPlayerCard) {
      aiPlayerCard.addEventListener('dragstart', this.handleDragStart.bind(this));
      aiPlayerCard.addEventListener('dragend', this.handleDragEnd.bind(this));
      console.log('[DragDrop] AI player drag listeners attached');
    }
  }

  /**
   * Handle drag start
   */
  private handleDragStart(e: DragEvent): void {
    const target = e.target as HTMLElement;
    this.draggedElement = target;
    target.classList.add('dragging');

    const playerId = target.dataset.playerId;
    if (e.dataTransfer && playerId) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', playerId);
    }

    console.log('[DragDrop] Started dragging player:', playerId);
  }

  /**
   * Handle drag end
   */
  private handleDragEnd(e: DragEvent): void {
    const target = e.target as HTMLElement;
    target.classList.remove('dragging');
    this.draggedElement = null;

    // Remove drag-over styling from all team lists
    document.querySelectorAll('.team-list').forEach(list => {
      list.classList.remove('drag-over');
    });

    console.log('[DragDrop] Drag ended');
  }

  /**
   * Handle drag over
   */
  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  /**
   * Handle drag leave
   */
  private handleDragLeave(e: DragEvent): void {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  /**
   * Handle drop
   */
  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    const playerId = e.dataTransfer?.getData('text/plain');
    if (!playerId || !this.draggedElement) {
      console.warn('[DragDrop] No player ID or dragged element');
      return;
    }

    // Determine which team this list belongs to
    const teamListId = target.id; // 'team1-list' or 'team2-list'
    const newTeam = teamListId === 'team1-list' ? 1 : 2;
    const targetTeamList = document.getElementById(teamListId);

    console.log('[DragDrop] Dropping player', playerId, 'into team', newTeam);

    // Handle special cases: host and AI players
    if (playerId === 'host-player' || playerId === 'ai-player') {
      const cardElement = this.draggedElement;
      const currentParent = cardElement.parentElement;
      const currentTeam = currentParent?.id === 'team1-list' ? 1 : 2;

      if (currentTeam === newTeam) {
        console.log('[DragDrop] Player already in this team');
        return;
      }

      // Move the card to the new team list (at the beginning)
      if (targetTeamList) {
        targetTeamList.insertBefore(cardElement, targetTeamList.firstChild);
        const playerName = playerId === 'host-player' ? 'Host' : 'AI';
        console.log(`[DragDrop] Moved ${playerName} to Team ${newTeam}`);
      }
      return;
    }

    // Handle regular local players
    const player = playerManager.getLocalPlayers().find(p => p.id === playerId);
    if (player) {
      const oldTeam = (player as any).team || 1;
      if (oldTeam === newTeam) {
        console.log('[DragDrop] Player already in this team');
        return;
      }

      (player as any).team = newTeam;
      console.log('[DragDrop] Updated player team from', oldTeam, 'to', newTeam);

      // Update the display
      this.updateGamePartyDisplay();
    } else {
      console.warn('[DragDrop] Player not found in localPlayers:', playerId);
    }
  }

  /**
   * Initialize the player manager
   */
  initialize(): void {
    // Setup drag and drop functionality
    this.setupDragAndDrop();
  }

  /**
   * Public wrapper for drag start handling
   */
  public handleDragStartEvent(e: DragEvent): void {
    this.handleDragStart(e);
  }

  /**
   * Public wrapper for drag end handling
   */
  public handleDragEndEvent(e: DragEvent): void {
    this.handleDragEnd(e);
  }

  /**
   * Public wrapper for drag over handling
   */
  public handleDragOverEvent(e: DragEvent): void {
    this.handleDragOver(e);
  }

  /**
   * Public wrapper for drag leave handling
   */
  public handleDragLeaveEvent(e: DragEvent): void {
    this.handleDragLeave(e);
  }

  /**
   * Public wrapper for drop handling
   */
  public handleDropEvent(e: DragEvent): void {
    this.handleDrop(e);
  }

  /**
   * Cleanup the player manager
   */
  cleanup(): void {
    logger.info('app-player-manager', '🧹 Cleaning up player manager...');
    // Clear any dragged element state
    this.draggedElement = null;
    // Note: Event listeners are attached to individual elements and will be cleaned up when elements are removed
    logger.info('app-player-manager', '✅ Player manager cleaned up');
  }
}