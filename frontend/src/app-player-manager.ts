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

    return playerCard;
  }

  public updateGamePartyDisplay(): void {
    // Update tournament local players display
    const tournamentLocalContainer = document.getElementById('tournament-local-players');
    if (tournamentLocalContainer) {
      const currentMode = (window as any).app?.gameSettings?.gameMode || 'coop';
      if (currentMode === 'tournament') {
        const hostPlayerNameTournament = document.getElementById('host-player-name-tournament');
        const authManager = (window as any).authManager;
        if (hostPlayerNameTournament && authManager && authManager.getCurrentUser()) {
          hostPlayerNameTournament.textContent = authManager.getCurrentUser().username;
        }

        // Update selected count
        const selectedCount = document.getElementById('tournament-selected-count');
        if (selectedCount) {
          const count = this.selectedPlayerIds.size;
          selectedCount.textContent = count.toString();
          selectedCount.classList.toggle('max-reached', count >= 2);
        }
      }
    }

    // Update arcade team displays
    this.updateArcadeTeamDisplays();
  }

  private updateArcadeTeamDisplays(): void {
    const team1List = document.getElementById('team1-list');
    const team2List = document.getElementById('team2-list');

    if (!team1List || !team2List) return;

    const team1LocalContainer = team1List.querySelector('.local-players-container') as HTMLElement;
    const team2LocalContainer = team2List.querySelector('.local-players-container') as HTMLElement;

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
        .filter(p => p && p.team !== 2)
        .concat(this.selectedPlayerIds.has('ai-player') &&
                !document.getElementById('ai-player-card')?.closest('#team2-list') ? [{ id: 'ai-player' }] : []);
      team1Count.textContent = team1Players.length.toString();
    }

    if (team2Count) {
      const team2Players = Array.from(this.selectedPlayerIds)
        .map(id => this.localPlayers.find(p => p.id === id))
        .filter(p => p && p.team === 2)
        .concat(this.selectedPlayerIds.has('ai-player') &&
                document.getElementById('ai-player-card')?.closest('#team2-list') ? [{ id: 'ai-player' }] : []);
      team2Count.textContent = team2Players.length.toString();
    }
  }
}