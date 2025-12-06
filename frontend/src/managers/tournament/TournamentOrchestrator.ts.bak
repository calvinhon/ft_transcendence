// frontend/src/managers/tournament/TournamentOrchestrator.ts
// Main orchestrator that coordinates all tournament managers
import { logger } from '../../utils/Logger';

import { TournamentCreationManager } from './TournamentCreationManager';
import { TournamentListManager } from './TournamentListManager';
import { TournamentBracketManager } from './TournamentBracketManager';
import { TournamentMatchManager } from './TournamentMatchManager';
import { TournamentUIManager } from './TournamentUIManager';
import { TournamentBracketRenderer } from './TournamentBracketRenderer';
import { TournamentDragDropManager } from './TournamentDragDropManager';
import { TournamentNetworkManager } from './TournamentNetworkManager';
import { TournamentDataManager } from './TournamentDataManager';

export class TournamentOrchestrator {
  // Specialized managers
  private creationManager: TournamentCreationManager;
  private listManager: TournamentListManager;
  private bracketManager: TournamentBracketManager;
  private matchManager: TournamentMatchManager;

  // Legacy managers (keeping for compatibility)
  private uiManager: TournamentUIManager;
  private bracketRenderer: TournamentBracketRenderer;
  private dragDropManager: TournamentDragDropManager;
  private networkManager: TournamentNetworkManager;
  private dataManager: TournamentDataManager;

  constructor() {
    console.log('🏆 [TournamentOrchestrator] Constructor called');

    // Initialize network and data managers first (dependencies)
    this.networkManager = new TournamentNetworkManager();
    this.dataManager = new TournamentDataManager();

    // Initialize specialized managers
    this.creationManager = new TournamentCreationManager(this.networkManager);
    this.listManager = new TournamentListManager(this.networkManager, this.dataManager);
    this.bracketManager = new TournamentBracketManager(this.dataManager, null); // Will set dragDropManager later
    this.matchManager = new TournamentMatchManager(this.dataManager, this.networkManager);

    // Initialize legacy managers for compatibility
    this.uiManager = new TournamentUIManager();
    this.bracketRenderer = new TournamentBracketRenderer();
    this.dragDropManager = new TournamentDragDropManager();

    // Set drag drop manager in bracket manager
    this.bracketManager = new TournamentBracketManager(this.dataManager, this.dragDropManager);

    // Wait for DOM to be ready before setting up
    if (document.readyState === 'loading') {
      console.log('🏆 [TournamentOrchestrator] DOM not ready, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('🏆 [TournamentOrchestrator] DOMContentLoaded fired, setting up event listeners');
        this.setupEventListeners();
        // Load initial data
        this.loadTournaments();
      });
    } else {
      console.log('🏆 [TournamentOrchestrator] DOM already ready, setting up event listeners immediately');
      this.setupEventListeners();
      // Load initial data
      this.loadTournaments();
    }
  }

  private setupEventListeners(): void {
    console.log('🏆 [TournamentOrchestrator] Setting up event listeners');

    // Setup event listeners for all managers
    this.creationManager.setupEventListeners();
    this.listManager.setupEventListeners();
  }

  // Tournament creation
  public async createTournamentWithParty(): Promise<void> {
    // This method is public in the orchestrator but delegates to creation manager
    // The creation manager handles the actual implementation
    await (this.creationManager as any).createTournamentWithParty();
  }

  // Tournament listing
  public async loadTournaments(): Promise<void> {
    return this.listManager.loadTournaments();
  }

  public async joinTournament(tournamentId: number): Promise<void> {
    return this.listManager.joinTournament(tournamentId);
  }

  // Tournament viewing
  public async viewTournament(tournamentId: number): Promise<void> {
    try {
      const details = await this.networkManager.viewTournament(tournamentId);
      this.dataManager.setParticipantMap(details.participants.reduce((map: { [key: number]: string }, p: any) => {
        map[p.user_id] = p.username || `Player ${p.user_id}`;
        return map;
      }, {}));
      this.bracketManager.showBracketModal(details);
    } catch (error) {
      logger.error('TournamentOrchestrator', 'View tournament error', error);
      // showToast is imported in the managers that need it
    }
  }

  // Match playing
  public async playMatch(tournamentId: number, matchId: number, player1Id: number, player2Id: number): Promise<void> {
    return this.matchManager.playMatch(tournamentId, matchId, player1Id, player2Id);
  }

  public async playMatchFromCard(tournamentId: number, matchId: number): Promise<void> {
    return this.matchManager.playMatchFromCard(tournamentId, matchId);
  }

  // Match result recording
  public async recordMatchResult(tournamentId: number, matchId: number, winnerId: number, player1Score: number, player2Score: number): Promise<void> {
    await this.matchManager.recordMatchResult(tournamentId, matchId, winnerId, player1Score, player2Score);

    // Reload tournament to check if it's finished and show updated bracket
    const details = await this.networkManager.viewTournament(tournamentId);
    this.dataManager.setParticipantMap(details.participants.reduce((map: { [key: number]: string }, p: any) => {
      map[p.user_id] = p.username || `Player ${p.user_id}`;
      return map;
    }, {}));

    // Show updated bracket with new match statuses
    this.bracketManager.showBracketModal(details);
  }

  public async recordOnBlockchain(tournamentId: number, winnerId: number): Promise<void> {
    return this.matchManager.recordOnBlockchain(tournamentId, winnerId);
  }

  // Legacy compatibility methods - these delegate to the appropriate managers
  public openCreateTournamentModal(): void {
    // Delegate to creation manager
    this.creationManager.openCreateTournamentModal();
  }

  private closeCreateTournamentModal(): void {
    // Delegate to creation manager
    (this.creationManager as any).closeCreateTournamentModal();
  }

  private populatePartyList(): void {
    // Delegate to creation manager
    (this.creationManager as any).populatePartyList();
  }

  private updateParticipantCount(): void {
    // Delegate to creation manager
    (this.creationManager as any).updateParticipantCount();
  }

  private switchTab(tabType: string): void {
    // Delegate to list manager
    (this.listManager as any).switchTab(tabType);
  }

  private displayAvailableTournaments(): void {
    // Delegate to list manager
    (this.listManager as any).displayAvailableTournaments();
  }

  private displayMyTournaments(): void {
    // Delegate to list manager
    (this.listManager as any).displayMyTournaments();
  }

  private showBracketModal(details: any): void {
    // Delegate to bracket manager
    this.bracketManager.showBracketModal(details);
  }

  private renderBracket(matches: any[], participants: any[], tournament: any): string {
    // Delegate to bracket manager
    return (this.bracketManager as any).renderBracket(matches, participants, tournament);
  }

  private getRoundName(roundNum: number, totalRounds: number): string {
    // Delegate to bracket manager
    return (this.bracketManager as any).getRoundName(roundNum, totalRounds);
  }

  private renderMatch(match: any, tournament: any): string {
    // Delegate to bracket manager
    return (this.bracketManager as any).renderMatch(match, tournament);
  }

  private initializeDragAndDrop(): void {
    // Delegate to drag drop manager
    this.dragDropManager.initializeDragAndDrop();
  }

  private showSideSelectionDialog(
    player1Id: number,
    player2Id: number,
    player1Name: string,
    player2Name: string,
    currentUserId: number
  ): Promise<'keep' | 'swap' | null> {
    // Delegate to match manager
    return (this.matchManager as any).showSideSelectionDialog(player1Id, player2Id, player1Name, player2Name, currentUserId);
  }

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