// frontend/src/app-player-manager.ts
// Player management functionality for the App

import { LocalPlayer } from './types';

export class AppPlayerManager {
  private localPlayers: LocalPlayer[] = [];
  private selectedPlayerIds: Set<string> = new Set();

  constructor() {
    this.loadLocalPlayers();
  }

  // Local player management
  private loadLocalPlayers(): void {
    const stored = localStorage.getItem('localPlayers');
    if (stored) {
      try {
        this.localPlayers = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse local players from storage:', e);
        this.localPlayers = [];
      }
    }
  }

  private saveLocalPlayers(): void {
    localStorage.setItem('localPlayers', JSON.stringify(this.localPlayers));
  }

  public getLocalPlayers(): LocalPlayer[] {
    return [...this.localPlayers];
  }

  public addLocalPlayer(player: LocalPlayer): void {
    // Check for duplicate email
    const existingPlayer = this.localPlayers.find(p => p.email === player.email);
    if (existingPlayer) {
      throw new Error('A player with this email already exists');
    }

    this.localPlayers.push(player);
    this.saveLocalPlayers();
  }

  public removeLocalPlayer(playerId: string): void {
    this.localPlayers = this.localPlayers.filter(p => p.id !== playerId);
    this.selectedPlayerIds.delete(playerId);
    this.saveLocalPlayers();
  }

  public updateLocalPlayer(playerId: string, updates: Partial<LocalPlayer>): void {
    const index = this.localPlayers.findIndex(p => p.id === playerId);
    if (index !== -1) {
      this.localPlayers[index] = { ...this.localPlayers[index], ...updates };
      this.saveLocalPlayers();
    }
  }

  public getSelectedPlayerIds(): Set<string> {
    return new Set(this.selectedPlayerIds);
  }

  public setSelectedPlayerIds(ids: Set<string>): void {
    this.selectedPlayerIds = new Set(ids);
  }

  public togglePlayerSelection(playerId: string): boolean {
    if (this.selectedPlayerIds.has(playerId)) {
      this.selectedPlayerIds.delete(playerId);
      return false;
    } else {
      this.selectedPlayerIds.add(playerId);
      return true;
    }
  }

  public clearPlayerSelection(): void {
    this.selectedPlayerIds.clear();
  }

  public createPlayerCard(player: any): HTMLElement {
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card local-player';
    playerCard.dataset.playerId = player.id;
    playerCard.dataset.email = player.email || '';

    // Make player card draggable in arcade mode
    playerCard.draggable = true;
    playerCard.dataset.team = (player as any).team || '1';

    playerCard.innerHTML = `
      <div class="player-info">
        <div class="player-name">${player.username}</div>
        <div class="player-email">${player.email || ''}</div>
      </div>
      <div class="player-actions">
        <button class="btn btn-sm btn-outline edit-player-btn" data-player-id="${player.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline remove-player-btn" data-player-id="${player.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    // Add event listeners
    const editBtn = playerCard.querySelector('.edit-player-btn') as HTMLButtonElement;
    const removeBtn = playerCard.querySelector('.remove-player-btn') as HTMLButtonElement;

    editBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      // TODO: Implement edit functionality
      console.log('Edit player:', player.id);
    });

    removeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Remove player "${player.username}"?`)) {
        this.removeLocalPlayer(player.id);
        playerCard.remove();
        this.updateGamePartyDisplay();
      }
    });

    // Make card clickable for selection
    playerCard.addEventListener('click', () => {
      const isSelected = this.togglePlayerSelection(player.id);
      playerCard.classList.toggle('selected', isSelected);
      this.updateGamePartyDisplay();
    });

    // Add drag and drop event listeners
    this.setupDragAndDrop(playerCard, player);

    return playerCard;
  }

  private setupDragAndDrop(playerCard: HTMLElement, player: any): void {
    // Drag start
    playerCard.addEventListener('dragstart', (e) => {
      e.dataTransfer!.setData('text/plain', player.id);
      e.dataTransfer!.effectAllowed = 'move';
      playerCard.classList.add('dragging');
    });

    // Drag end
    playerCard.addEventListener('dragend', () => {
      playerCard.classList.remove('dragging');
    });
  }

  public updateGamePartyDisplay(): void {
    // Always restore host name in all party frames
    const authManager = (window as any).authManager;
    const savedHostUser = authManager?.getCurrentUser();
    console.log('🎮 [PlayerManager] updateGamePartyDisplay - authManager:', !!authManager);
    console.log('🎮 [PlayerManager] updateGamePartyDisplay - savedHostUser:', savedHostUser);
    
    const hostPlayerNames = [
      document.getElementById('host-player-name'),
      document.getElementById('host-player-name-coop'),
      document.getElementById('host-player-name-tournament')
    ];
    
    console.log('🎮 [PlayerManager] updateGamePartyDisplay - host player name elements:', hostPlayerNames.map(el => !!el));
    
    hostPlayerNames.forEach((element, index) => {
      if (element && savedHostUser) {
        element.textContent = savedHostUser.username;
        console.log(`🎮 [PlayerManager] updateGamePartyDisplay - Set host name element ${index} to:`, savedHostUser.username);
      } else {
        console.log(`🎮 [PlayerManager] updateGamePartyDisplay - Could not set host name element ${index}, element:`, !!element, 'user:', !!savedHostUser);
      }
    });

    // Update tournament local players display
    const tournamentLocalContainer = document.getElementById('tournament-local-players');
    if (tournamentLocalContainer) {
      const currentMode = (window as any).app?.gameSettings?.gameMode || 'coop';
      if (currentMode === 'tournament') {
        tournamentLocalContainer.innerHTML = '';
        for (const player of this.localPlayers) {
          const playerCard = this.createPlayerCard(player);
          tournamentLocalContainer.appendChild(playerCard);
          if (this.selectedPlayerIds.has(player.id)) {
            playerCard.classList.add('selected');
          }
        }
        const selectedCount = document.getElementById('tournament-selected-count');
        if (selectedCount) {
          const count = this.selectedPlayerIds.size;
          selectedCount.textContent = count.toString();
          selectedCount.classList.toggle('max-reached', count >= 2);
        }
      }
    }
    this.updateArcadeTeamDisplays();
    this.setupDropZones();
  }

  private updateArcadeTeamDisplays(): void {
    const team1List = document.getElementById('team1-list');
    const team2List = document.getElementById('team2-list');

    if (!team1List || !team2List) return;

    const team1LocalContainer = document.getElementById('team1-local-players') as HTMLElement;
    const team2LocalContainer = document.getElementById('team2-local-players') as HTMLElement;

    if (team1LocalContainer) team1LocalContainer.innerHTML = '';
    if (team2LocalContainer) team2LocalContainer.innerHTML = '';

    // Add selected players to their teams
    for (const playerId of this.selectedPlayerIds) {
      const player = this.localPlayers.find(p => p.id === playerId);
      if (!player) continue;

      const playerCard = this.createPlayerCard({ ...player, team: player.team || 1 });
      const targetContainer = player.team === 2 ? team2LocalContainer : team1LocalContainer;

      if (targetContainer) {
        targetContainer.appendChild(playerCard);

        // Mark as selected
        playerCard.classList.add('selected');
      }
    }

    // Handle AI player
    const aiCard = document.getElementById('ai-player-card');
    if (aiCard && aiCard.parentNode) {
      const inTeam2 = aiCard.closest('#team2-list') !== null;
      const targetContainer = inTeam2 ? team2LocalContainer : team1LocalContainer;

      if (targetContainer && this.selectedPlayerIds.has('ai-player')) {
        const aiPlayerCard = this.createPlayerCard({
          id: 'ai-player',
          username: 'AI Bot',
          email: '',
          team: inTeam2 ? 2 : 1
        });
        aiPlayerCard.classList.add('selected');
        targetContainer.appendChild(aiPlayerCard);
      }
    }

    // Update team counts
    this.updateTeamCounts();
  }

  private updateTeamCounts(): void {
    const team1Count = document.getElementById('team1-count');
    const team2Count = document.getElementById('team2-count');

    if (team1Count) {
      const team1Players = Array.from(this.selectedPlayerIds)
        .map(id => this.localPlayers.find(p => p.id === id))
        .filter(p => p && p.team !== 2);
      team1Count.textContent = team1Players.length.toString();
    }

    if (team2Count) {
      const team2Players = Array.from(this.selectedPlayerIds)
        .map(id => this.localPlayers.find(p => p.id === id))
        .filter(p => p && p.team === 2);
      team2Count.textContent = team2Players.length.toString();
    }
  }

  private setupDropZones(): void {
    // Setup drop zones for team containers
    const team1List = document.getElementById('team1-list');
    const team2List = document.getElementById('team2-list');

    if (team1List) {
      this.setupDropZone(team1List, 1);
    }

    if (team2List) {
      this.setupDropZone(team2List, 2);
    }
  }

  private setupDropZone(container: HTMLElement, teamNumber: number): void {
    // Add drop zone event listeners with bound functions
    const dragOverHandler = (e: DragEvent) => this.handleDragOver(e, teamNumber);
    const dragLeaveHandler = (e: DragEvent) => this.handleDragLeave(e, container);
    const dropHandler = (e: DragEvent) => this.handleDrop(e, teamNumber);

    container.addEventListener('dragover', dragOverHandler);
    container.addEventListener('dragleave', dragLeaveHandler);
    container.addEventListener('drop', dropHandler);

    // Store the handlers for potential cleanup
    (container as any)._dragOverHandler = dragOverHandler;
    (container as any)._dragLeaveHandler = dragLeaveHandler;
    (container as any)._dropHandler = dropHandler;
  }

  private handleDragOver(e: DragEvent, teamNumber: number): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';

    const target = e.target as HTMLElement;
    const container = target.closest('.team-list') as HTMLElement;
    if (container) {
      container.classList.add('drag-over');
    }
  }

  private handleDragLeave(e: DragEvent, container: HTMLElement): void {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!container.contains(relatedTarget)) {
      container.classList.remove('drag-over');
    }
  }

  private handleDrop(e: DragEvent, teamNumber: number): void {
    e.preventDefault();

    const container = (e.target as HTMLElement).closest('.team-list') as HTMLElement;
    if (container) {
      container.classList.remove('drag-over');
    }

    const playerId = e.dataTransfer!.getData('text/plain');
    if (playerId) {
      this.movePlayerToTeam(playerId, teamNumber);
    }
  }

  private movePlayerToTeam(playerId: string, teamNumber: number): void {
    // Find the player
    const player = this.localPlayers.find(p => p.id === playerId);
    if (!player) return;

    // Update player's team
    player.team = teamNumber;
    this.saveLocalPlayers();

    // Update the UI
    this.updateGamePartyDisplay();

    console.log(`Moved player ${player.username} to team ${teamNumber}`);
  }
}