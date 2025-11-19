// frontend/src/tournament-logic.ts
// Tournament business logic

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

export class TournamentLogic {
  // Tournament validation and business rules
  public validateTournamentData(data: {
    name: string;
    description?: string;
    max_participants: number;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Tournament name is required');
    } else if (data.name.length > 100) {
      errors.push('Tournament name must be less than 100 characters');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }

    if (!data.max_participants || data.max_participants < 2) {
      errors.push('Minimum 2 participants required');
    } else if (data.max_participants > 16) {
      errors.push('Maximum 16 participants allowed');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public canUserCreateTournament(userId: number): boolean {
    // Add any business rules for tournament creation
    // For now, any authenticated user can create
    return userId > 0;
  }

  public calculateTournamentProgress(tournament: Tournament): {
    progress: number;
    statusText: string;
    canStart: boolean;
  } {
    const progress = (tournament.current_participants / tournament.max_participants) * 100;

    let statusText = '';
    let canStart = false;

    switch (tournament.status) {
      case 'open':
        if (tournament.current_participants >= 2) {
          statusText = `Ready to start (${tournament.current_participants}/${tournament.max_participants})`;
          canStart = true;
        } else {
          statusText = `Waiting for players (${tournament.current_participants}/${tournament.max_participants})`;
        }
        break;
      case 'active':
        statusText = 'Tournament in progress';
        break;
      case 'finished':
        statusText = 'Tournament completed';
        break;
      case 'full':
        statusText = 'Tournament full';
        canStart = true;
        break;
    }

    return { progress, statusText, canStart };
  }

  public generateBracket(participants: User[]): any {
    // Simple single-elimination bracket generation
    if (participants.length < 2) {
      throw new Error('Not enough participants for tournament');
    }

    const bracket = {
      rounds: [] as any[],
      participants: participants
    };

    // First round
    const firstRound = {
      round: 1,
      matches: [] as any[]
    };

    // Pair up participants
    for (let i = 0; i < participants.length; i += 2) {
      const match = {
        id: `round1_match${Math.floor(i/2) + 1}`,
        player1: participants[i],
        player2: participants[i + 1] || null, // Bye if odd number
        winner: null,
        status: 'pending'
      };
      firstRound.matches.push(match);
    }

    bracket.rounds.push(firstRound);

    // Calculate subsequent rounds
    let currentRoundParticipants = Math.ceil(participants.length / 2);
    let roundNumber = 2;

    while (currentRoundParticipants > 1) {
      const round = {
        round: roundNumber,
        matches: [] as any[]
      };

      const numMatches = Math.floor(currentRoundParticipants / 2);
      for (let i = 0; i < numMatches; i++) {
        round.matches.push({
          id: `round${roundNumber}_match${i + 1}`,
          player1: null,
          player2: null,
          winner: null,
          status: 'pending'
        });
      }

      bracket.rounds.push(round);
      currentRoundParticipants = Math.ceil(currentRoundParticipants / 2);
      roundNumber++;
    }

    return bracket;
  }

  public updateBracketWithResult(bracket: any, matchId: string, winnerId: number): any {
    // Find the match and update winner
    for (const round of bracket.rounds) {
      const match = round.matches.find((m: any) => m.id === matchId);
      if (match) {
        match.winner = winnerId;
        match.status = 'completed';

        // Propagate winner to next round
        this.propagateWinner(bracket, matchId, winnerId);
        break;
      }
    }

    return bracket;
  }

  private propagateWinner(bracket: any, matchId: string, winnerId: number): void {
    const matchParts = matchId.split('_');
    const currentRound = parseInt(matchParts[0].replace('round', ''));
    const matchIndex = parseInt(matchParts[1].replace('match', '')) - 1;

    if (currentRound < bracket.rounds.length) {
      const nextRound = bracket.rounds[currentRound];
      const nextMatchIndex = Math.floor(matchIndex / 2);
      const isPlayer1 = matchIndex % 2 === 0;

      if (nextRound.matches[nextMatchIndex]) {
        if (isPlayer1) {
          nextRound.matches[nextMatchIndex].player1 = winnerId;
        } else {
          nextRound.matches[nextMatchIndex].player2 = winnerId;
        }
      }
    }
  }

  public getTournamentWinner(bracket: any): number | null {
    const finalRound = bracket.rounds[bracket.rounds.length - 1];
    if (finalRound && finalRound.matches.length === 1) {
      const finalMatch = finalRound.matches[0];
      if (finalMatch.status === 'completed') {
        return finalMatch.winner;
      }
    }
    return null;
  }

  public formatTournamentDuration(startTime: string, endTime?: string): string {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();

    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  }

  public getTournamentStatistics(tournament: Tournament, participants: User[]): any {
    return {
      totalParticipants: participants.length,
      maxParticipants: tournament.max_participants,
      status: tournament.status,
      createdDate: new Date(tournament.created_at).toLocaleDateString(),
      duration: tournament.started_at ?
        this.formatTournamentDuration(tournament.started_at, tournament.finished_at || undefined) :
        'Not started',
      hasWinner: !!tournament.winner_id
    };
  }

  public validateTournamentStart(tournament: Tournament): { canStart: boolean; reason?: string } {
    if (tournament.status !== 'open') {
      return { canStart: false, reason: 'Tournament is not open for starting' };
    }

    if (tournament.current_participants < 2) {
      return { canStart: false, reason: 'Minimum 2 participants required' };
    }

    if (tournament.current_participants > tournament.max_participants) {
      return { canStart: false, reason: 'Too many participants' };
    }

    return { canStart: true };
  }

  public getRecommendedTournamentSize(currentPlayers: number): number {
    // Recommend next power of 2
    const sizes = [4, 8, 16];
    for (const size of sizes) {
      if (size >= currentPlayers) {
        return size;
      }
    }
    return 16; // Maximum
  }
}