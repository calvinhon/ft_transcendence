// frontend/src/managers/tournament/TournamentDataManager.ts
// Handles tournament data and state management

interface Tournament {
  id: number;
  name: string;
  description?: string;
  max_participants: number;
  current_participants: number;
  status: 'open' | 'active' | 'finished' | 'full';
  created_by: number;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  winner_id?: number | null;
}

interface User {
  userId: number;
  username: string;
}

export class TournamentDataManager {
  private currentTournaments: Tournament[] = [];
  private userTournaments: Tournament[] = [];
  private participantMap: { [userId: number]: string } = {};

  constructor() {
    console.log('🏆 [TournamentDataManager] Initialized');
  }

  // Tournament data management
  public setCurrentTournaments(tournaments: Tournament[]): void {
    this.currentTournaments = tournaments;
    console.log('🏆 [Data] Set current tournaments:', tournaments.length);
  }

  public getCurrentTournaments(): Tournament[] {
    return [...this.currentTournaments];
  }

  public getAvailableTournaments(): Tournament[] {
    return this.currentTournaments.filter(t => t.status === 'open');
  }

  public getUserTournaments(): Tournament[] {
    return [...this.userTournaments];
  }

  public addTournament(tournament: Tournament): void {
    // Check if tournament already exists
    const existingIndex = this.currentTournaments.findIndex(t => t.id === tournament.id);
    if (existingIndex >= 0) {
      this.currentTournaments[existingIndex] = tournament;
    } else {
      this.currentTournaments.push(tournament);
    }
    console.log('🏆 [Data] Added/updated tournament:', tournament.id);
  }

  public removeTournament(tournamentId: number): void {
    this.currentTournaments = this.currentTournaments.filter(t => t.id !== tournamentId);
    console.log('🏆 [Data] Removed tournament:', tournamentId);
  }

  public getTournamentById(tournamentId: number): Tournament | null {
    return this.currentTournaments.find(t => t.id === tournamentId) || null;
  }

  // Participant map management
  public setParticipantMap(participantMap: { [userId: number]: string }): void {
    this.participantMap = { ...participantMap };
    console.log('🏆 [Data] Set participant map with', Object.keys(participantMap).length, 'participants');
  }

  public getParticipantMap(): { [userId: number]: string } {
    return { ...this.participantMap };
  }

  public getParticipantName(userId: number): string {
    return this.participantMap[userId] || `Player ${userId}`;
  }

  public addParticipant(userId: number, username: string): void {
    this.participantMap[userId] = username;
    console.log('🏆 [Data] Added participant:', userId, username);
  }

  public removeParticipant(userId: number): void {
    delete this.participantMap[userId];
    console.log('🏆 [Data] Removed participant:', userId);
  }

  // Tournament match data management
  private currentTournamentMatch: any = null;

  public setCurrentTournamentMatch(matchData: any): void {
    this.currentTournamentMatch = matchData;
    console.log('🏆 [Data] Set current tournament match:', matchData);
  }

  public getCurrentTournamentMatch(): any {
    return this.currentTournamentMatch;
  }

  public clearCurrentTournamentMatch(): void {
    this.currentTournamentMatch = null;
    console.log('🏆 [Data] Cleared current tournament match');
  }

  // Tournament creation helpers
  public validateTournamentCreation(formData: FormData, user: User): {
    isValid: boolean;
    errors: string[];
    data?: any;
  } {
    const errors: string[] = [];

    // Get selected participants
    const selectedCheckboxes = document.querySelectorAll('.participant-checkbox:checked');
    const participantIds: number[] = [(user.userId || user.id)]; // Host is always included

    selectedCheckboxes.forEach((checkbox: any) => {
      const userId = parseInt(checkbox.getAttribute('data-user-id'));
      if (userId && !participantIds.includes(userId)) {
        participantIds.push(userId);
      }
    });

    // Validate minimum participants
    if (participantIds.length < 2) {
      errors.push('Need at least 2 participants to start a tournament');
    }

    // Generate default tournament name if not provided
    let tournamentName = formData.get('tournament-name') as string;
    if (!tournamentName || tournamentName.trim() === '') {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      tournamentName = `${user.username}'s Tournament - ${dateStr} ${timeStr}`;
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    const tournamentData = {
      name: tournamentName,
      description: formData.get('tournament-description') as string || '',
      maxParticipants: parseInt(formData.get('max-participants') as string) || 8,
      createdBy: (user.userId || user.id),
      participants: participantIds
    };

    return { isValid: true, errors: [], data: tournamentData };
  }

  // Match result helpers
  public prepareMatchResultData(tournamentId: number, matchId: number, winnerId: number, player1Score: number, player2Score: number): any {
    return {
      tournamentId,
      matchId,
      winnerId,
      player1Score,
      player2Score
    };
  }

  // Tournament statistics
  public getTournamentStats(): {
    totalTournaments: number;
    activeTournaments: number;
    finishedTournaments: number;
    totalParticipants: number;
  } {
    const totalTournaments = this.currentTournaments.length;
    const activeTournaments = this.currentTournaments.filter(t => t.status === 'active').length;
    const finishedTournaments = this.currentTournaments.filter(t => t.status === 'finished').length;
    const totalParticipants = this.currentTournaments.reduce((sum, t) => sum + t.current_participants, 0);

    return {
      totalTournaments,
      activeTournaments,
      finishedTournaments,
      totalParticipants
    };
  }

  // Clear all data (for cleanup)
  public clearAllData(): void {
    this.currentTournaments = [];
    this.userTournaments = [];
    this.participantMap = {};
    this.currentTournamentMatch = null;
    console.log('🏆 [Data] Cleared all tournament data');
  }
}