// frontend/src/managers/PlayerManager.ts
import { LocalPlayer, User } from '../types';
import { logger } from '../utils/Logger';
import { eventManager } from '../utils/EventManager';
import { showToast } from '../toast';

export class PlayerManager {
  private static instance: PlayerManager;
  private localPlayers: LocalPlayer[] = [];
  private selectedPlayerIds: Set<string> = new Set();
  private hostUser: User | null = null;
  private playerSelectionInitialized: boolean = false;

  private constructor() {}

  static getInstance(): PlayerManager {
    if (!PlayerManager.instance) {
      PlayerManager.instance = new PlayerManager();
    }
    return PlayerManager.instance;
  }

  /**
   * Initialize the player manager
   */
  initialize(): void {
    this.loadFromLocalStorage();
    this.setupEventListeners();
    logger.info('PlayerManager', 'Initialized');
  }

  /**
   * Setup event listeners for player interactions
   */
  private setupEventListeners(): void {
    if (this.playerSelectionInitialized) return;
    this.playerSelectionInitialized = true;

    console.log('[PlayerManager] Setting up event listeners');

    // Player selection via event delegation
    document.addEventListener('click', (e: Event) => {
      this.handlePlayerClick(e);
    });

    logger.info('PlayerManager', 'Event listeners setup');
  }

  /**
   * Handle player card clicks
   */
  private handlePlayerClick(e: Event): void {
    console.log('[PlayerManager] handlePlayerClick called', e.target);
    const target = e.target as HTMLElement;

    // Allow clicks on add-player buttons to pass through
    if (target.closest('.add-player-btn')) {
      logger.debug('PlayerManager', 'Add player button clicked, allowing propagation');
      return;
    }

    // Ignore clicks on remove buttons
    if (target.closest('.remove-player-btn') || target.closest('.remove-btn')) return;

    const card = target.closest('.player-card') as HTMLElement | null;
    if (!card) return;

    // Prevent double-firing
    e.stopImmediatePropagation();
    e.preventDefault();

    // Check if we're inside a valid party container
    const isInsideParty = card.closest('#game-party-list, #team1-list, #team2-list, #coop-party-frame, #tournament-party-frame');
    if (!isInsideParty) {
      logger.debug('PlayerManager', 'Click outside party container, ignoring');
      return;
    }

    // Debounce clicks
    const cardId = card.id || card.dataset.playerId || 'unknown';
    eventManager.debounce(`player-click-${cardId}`, () => {
      this.togglePlayerSelection(card);
    }, 300);
  }

  /**
   * Toggle player selection
   */
  public togglePlayerSelection(card: HTMLElement): void {
    const playerId = card.dataset.playerId || card.id;
    if (!playerId) return;

    const wasActive = card.classList.contains('active');
    card.classList.toggle('active');

    // Force reflow to ensure DOM updates
    void card.offsetHeight;

    const isNowActive = card.classList.contains('active');

    if (isNowActive) {
      this.selectedPlayerIds.add(playerId);
      logger.debug('PlayerManager', `Player ${playerId} selected`);
    } else {
      this.selectedPlayerIds.delete(playerId);
      logger.debug('PlayerManager', `Player ${playerId} deselected`);
    }

    // Update UI to reflect selection
    this.updatePlayerSelectionUI();
  }

  /**
   * Update UI to reflect current player selections
   */
  private updatePlayerSelectionUI(): void {
    // This will be called by the UI manager
    logger.debug('PlayerManager', 'Player selection UI update requested');
  }

  /**
   * Set the host user
   */
  setHostUser(user: User): void {
    this.hostUser = user;
    logger.info('PlayerManager', 'Host user set', user);
  }

  /**
   * Clear the host user
   */
  clearHostUser(): void {
    this.hostUser = null;
    logger.info('PlayerManager', 'Host user cleared');
  }

  /**
   * Get the host user
   */
  getHostUser(): User | null {
    return this.hostUser;
  }

  /**
   * Add a local player
   */
  addLocalPlayer(player: LocalPlayer): void {
    // Check for duplicates
    const existing = this.localPlayers.find(p => p.username === player.username);
    if (existing) {
      showToast(`Player "${player.username}" already exists`, 'error');
      return;
    }

    this.localPlayers.push(player);
    this.saveToLocalStorage();
    this.updateUI();

    logger.info('PlayerManager', 'Local player added', player);
  }

  /**
   * Remove a local player
   */
  removeLocalPlayer(playerId: string): void {
    const index = this.localPlayers.findIndex(p => p.id === playerId);
    if (index >= 0) {
      const removed = this.localPlayers.splice(index, 1)[0];
      this.selectedPlayerIds.delete(playerId);
      this.saveToLocalStorage();
      this.updateUI();

      logger.info('PlayerManager', 'Local player removed', removed);
    }
  }

  /**
   * Get all local players
   */
  getLocalPlayers(): LocalPlayer[] {
    return [...this.localPlayers];
  }

  /**
   * Get selected player IDs
   */
  getSelectedPlayerIds(): Set<string> {
    return new Set(this.selectedPlayerIds);
  }

  /**
   * Set selected players
   */
  setSelectedPlayers(playerIds: string[]): void {
    this.selectedPlayerIds = new Set(playerIds);
    this.updateUI();
    logger.debug('PlayerManager', 'Selected players set', playerIds);
  }

  /**
   * Clear all selections
   */
  clearSelections(): void {
    this.selectedPlayerIds.clear();
    this.updateUI();
    logger.debug('PlayerManager', 'All selections cleared');
  }

  /**
   * Check if a player is selected
   */
  isPlayerSelected(playerId: string): boolean {
    return this.selectedPlayerIds.has(playerId);
  }

  /**
   * Get selected players count
   */
  getSelectedCount(): number {
    return this.selectedPlayerIds.size;
  }

  /**
   * Get total players available (host + local)
   */
  getTotalAvailablePlayers(): number {
    return 1 + this.localPlayers.length; // +1 for host
  }

  /**
   * Create player card element
   */
  createPlayerCard(player: LocalPlayer, options: {
    isHost?: boolean;
    isAI?: boolean;
    team?: number;
    draggable?: boolean;
  } = {}): HTMLElement {
    const { isHost = false, isAI = false, team = 1, draggable = false } = options;

    const card = document.createElement('div');
    card.className = `player-card ${isHost ? 'host-player' : ''} ${isAI ? 'ai-player' : 'local-player'}`;
    card.dataset.playerId = player.id;
    card.dataset.playerType = isHost ? 'host' : isAI ? 'ai' : 'local';
    card.draggable = draggable;

    if (team) {
      card.dataset.team = team.toString();
    }

    card.innerHTML = `
      <div class="player-avatar">
        <i class="fas fa-${isAI ? 'robot' : 'home'}"></i>
      </div>
      <div class="player-info">
        <span class="player-name">${this.escapeHtml(player.username)}</span>
        <span class="role-badge ${isHost ? 'host' : isAI ? 'ai' : 'local'}">
          ${isHost ? 'Host' : isAI ? 'Computer' : 'Local'}
        </span>
      </div>
      ${!isHost ? `
        <div class="player-actions">
          <button class="remove-btn" type="button">
            <i class="fas fa-times"></i>
          </button>
        </div>
      ` : ''}
    `;

    // Add event listeners
    if (!isHost) {
      const removeBtn = card.querySelector('.remove-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeLocalPlayer(player.id);
        });
      }
    }

    // Restore selection state
    if (this.isPlayerSelected(player.id)) {
      card.classList.add('active');
    }

    return card;
  }

  /**
   * Update the UI to reflect current players
   */
  updateUI(): void {
    // This will be called by the UI manager to update displays
    logger.debug('PlayerManager', 'UI update requested');
  }

  /**
   * Load players from localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('localPlayers');
      if (saved) {
        this.localPlayers = JSON.parse(saved);
        logger.info('PlayerManager', 'Loaded players from localStorage', this.localPlayers.length);
      }
    } catch (error) {
      logger.warn('PlayerManager', 'Failed to load players from localStorage', error);
      this.localPlayers = [];
    }
  }

  /**
   * Save players to localStorage
   */
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('localPlayers', JSON.stringify(this.localPlayers));
      logger.debug('PlayerManager', 'Players saved to localStorage');
    } catch (error) {
      logger.error('PlayerManager', 'Failed to save players to localStorage', error);
    }
  }

  /**
   * Clear all players
   */
  clearAllPlayers(): void {
    this.localPlayers = [];
    this.selectedPlayerIds.clear();
    this.saveToLocalStorage();
    this.updateUI();
    logger.info('PlayerManager', 'All players cleared');
  }

  /**
   * Export players data for debugging
   */
  exportData(): {
    localPlayers: LocalPlayer[];
    selectedPlayerIds: string[];
    hostUser: User | null;
  } {
    return {
      localPlayers: [...this.localPlayers],
      selectedPlayerIds: Array.from(this.selectedPlayerIds),
      hostUser: this.hostUser
    };
  }

  /**
   * Escape HTML for security
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export const playerManager = PlayerManager.getInstance();