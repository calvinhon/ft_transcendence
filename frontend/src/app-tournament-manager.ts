// frontend/src/app-tournament-manager.ts
// Tournament management functionality for the App

import { Tournament, TournamentMatch } from './types';

export class AppTournamentManager {
  private currentTournament: Tournament | null = null;
  private tournamentMatches: TournamentMatch[] = [];

  constructor() {
    this.loadTournamentData();
  }

  private loadTournamentData(): void {
    const storedTournament = localStorage.getItem('currentTournament');
    const storedMatches = localStorage.getItem('tournamentMatches');

    if (storedTournament) {
      try {
        this.currentTournament = JSON.parse(storedTournament);
      } catch (e) {
        console.error('Failed to parse tournament data:', e);
        this.currentTournament = null;
      }
    }

    if (storedMatches) {
      try {
        this.tournamentMatches = JSON.parse(storedMatches);
      } catch (e) {
        console.error('Failed to parse tournament matches:', e);
        this.tournamentMatches = [];
      }
    }
  }

  private saveTournamentData(): void {
    if (this.currentTournament) {
      localStorage.setItem('currentTournament', JSON.stringify(this.currentTournament));
    } else {
      localStorage.removeItem('currentTournament');
    }

    localStorage.setItem('tournamentMatches', JSON.stringify(this.tournamentMatches));
  }

  public createTournament(name: string, maxPlayers: number = 8): Tournament {
    const tournament: Tournament = {
      id: `tournament_${Date.now()}`,
      name,
      status: 'waiting',
      maxPlayers,
      currentPlayers: 0,
      createdAt: new Date().toISOString(),
      settings: {
        gameMode: 'tournament',
        difficulty: 'medium',
        timeLimit: 300, // 5 minutes
        scoreLimit: 10
      }
    };

    this.currentTournament = tournament;
    this.tournamentMatches = [];
    this.saveTournamentData();

    return tournament;
  }

  public joinTournament(tournamentId: string): boolean {
    // TODO: Implement tournament joining logic
    console.log('Joining tournament:', tournamentId);
    return true;
  }

  public startTournament(): void {
    const players = this.getTournamentPlayers();
    
    if (players.length < 2) {
      console.error('Not enough players for tournament. Need at least 2 players.');
      (window as any).app?.showToast('Need at least 2 players to start a tournament', 'error');
      return;
    }

    // Create tournament with current players
    this.createTournament(`Tournament ${new Date().toLocaleDateString()}`, Math.max(8, players.length));
    this.currentTournament!.currentPlayers = players.length;

    this.currentTournament!.status = 'active';
    this.generateTournamentBracket();
    this.saveTournamentData();

    console.log('Tournament started:', this.currentTournament);
    
    // Start the first match
    this.startNextMatch();
  }

  public startNextMatch(): void {
    // Find the next pending match
    const nextMatch = this.tournamentMatches.find(match => match.status === 'pending');
    if (!nextMatch) {
      console.log('No more matches to play');
      this.endTournament();
      return;
    }

    // Set the current match on the app
    const app = (window as any).app;
    if (app) {
      // Convert to the format expected by GameManager
      app.currentTournamentMatch = {
        tournamentId: parseInt(nextMatch.tournamentId.split('_')[1] || '0'),
        matchId: parseInt(nextMatch.id.split('_')[1] || '0'),
        player1Id: nextMatch.player1?.userId || nextMatch.player1?.id || 0,
        player1Name: nextMatch.player1?.username || 'Unknown',
        player2Id: nextMatch.player2?.userId || nextMatch.player2?.id || 0,
        player2Name: nextMatch.player2?.username || 'AI Bot',
        round: nextMatch.round,
        status: nextMatch.status === 'pending' ? 'pending' : 'in_progress'
      };
      console.log('Starting tournament match:', app.currentTournamentMatch);
      
      // Start the game with this match
      const actualGameManager = (window as any).gameManager;
      if (actualGameManager) {
        actualGameManager.startBotMatch();
      }
    }
  }

  private generateTournamentBracket(): void {
    if (!this.currentTournament) return;

    // Simple single-elimination bracket generation
    const players = this.getTournamentPlayers();
    const numPlayers = players.length;

    if (numPlayers < 2) {
      console.error('Not enough players for tournament');
      return;
    }

    // Generate matches for first round
    const matches: TournamentMatch[] = [];
    const numMatches = Math.floor(numPlayers / 2);

    for (let i = 0; i < numMatches; i++) {
      const match: TournamentMatch = {
        id: `match_${i + 1}`,
        tournamentId: this.currentTournament.id,
        round: 1,
        player1: players[i * 2],
        player2: players[i * 2 + 1],
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      matches.push(match);
    }

    // Handle bye for odd number of players
    if (numPlayers % 2 === 1) {
      const byeMatch: TournamentMatch = {
        id: `match_bye_${numPlayers}`,
        tournamentId: this.currentTournament.id,
        round: 1,
        player1: players[numPlayers - 1],
        player2: null, // Bye
        status: 'completed',
        winner: players[numPlayers - 1],
        createdAt: new Date().toISOString()
      };
      matches.push(byeMatch);
    }

    this.tournamentMatches = matches;
  }

  private getTournamentPlayers(): any[] {
    // Get players from player manager
    const playerManager = (window as any).app?.playerManager;
    const authManager = (window as any).authManager;
    
    const players: any[] = [];
    
    // Always include the host player
    if (authManager) {
      const hostUser = authManager.getCurrentUser();
      if (hostUser) {
        players.push({
          id: `host_${hostUser.id}`,
          userId: hostUser.id,
          username: hostUser.username,
          isHost: true
        });
      }
    }
    
    // Add selected local players
    if (playerManager) {
      const selectedIds = playerManager.getSelectedPlayerIds();
      const selectedPlayers = Array.from(selectedIds).map(id => {
        if (id === 'ai-player') {
          return { id: 'ai-player', username: 'AI Bot', isAI: true };
        }
        return playerManager.getLocalPlayers().find((p: any) => p.id === id);
      }).filter(Boolean);
      
      players.push(...selectedPlayers);
    }
    
    return players;
  }

  public getCurrentTournament(): Tournament | null {
    return this.currentTournament;
  }

  public getTournamentMatches(): TournamentMatch[] {
    return [...this.tournamentMatches];
  }

  public updateMatchResult(matchId: string, winnerId: string): void {
    const match = this.tournamentMatches.find(m => m.id === matchId);
    if (match) {
      match.status = 'completed';
      match.winner = winnerId;
      match.completedAt = new Date().toISOString();
      this.saveTournamentData();

      // Check if tournament is complete
      this.checkTournamentCompletion();
    }
  }

  private checkTournamentCompletion(): void {
    if (!this.currentTournament) return;

    const activeMatches = this.tournamentMatches.filter(m => m.status === 'pending' || m.status === 'active');
    if (activeMatches.length === 0) {
      this.currentTournament.status = 'completed';
      this.saveTournamentData();
      console.log('Tournament completed!');
      // TODO: Show tournament results
    }
  }

  public getTournamentStats(): any {
    if (!this.currentTournament) return null;

    const totalMatches = this.tournamentMatches.length;
    const completedMatches = this.tournamentMatches.filter(m => m.status === 'completed').length;
    const activeMatches = this.tournamentMatches.filter(m => m.status === 'active').length;

    return {
      totalMatches,
      completedMatches,
      activeMatches,
      progress: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0
    };
  }

  public resetTournament(): void {
    this.currentTournament = null;
    this.tournamentMatches = [];
    this.saveTournamentData();
  }

  private endTournament(): void {
    if (!this.currentTournament) return;

    this.currentTournament.status = 'completed';
    this.saveTournamentData();

    console.log('Tournament ended:', this.currentTournament);

    // Show completion message
    const app = (window as any).app;
    if (app) {
      app.showToast('Tournament completed!', 'success');
      app.showScreen('play-config-screen');
    }
  }
}