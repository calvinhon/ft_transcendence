// frontend/src/tournament-data-manager.ts
// Tournament data management and API operations

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
  private baseURL: string;
  private currentTournaments: Tournament[] = [];
  private userTournaments: Tournament[] = [];
  private participantMap: { [userId: number]: string } = {};

  constructor() {
    this.baseURL = this.getBaseURL();
  }

  private getBaseURL(): string {
    // Check if running in development mode
    if (window.location.hostname === 'localhost' && window.location.port !== '80') {
      return 'http://localhost:3003';
    }
    return '/tournament';
  }

  // Tournament CRUD operations
  public async loadTournaments(): Promise<void> {
    try {
      console.log('Loading tournaments...');
      const response = await fetch(`${this.baseURL}/tournaments`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.currentTournaments = await response.json();
      console.log('Loaded tournaments:', this.currentTournaments.length);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      this.currentTournaments = [];
    }
  }

  public async loadUserTournaments(userId: number): Promise<void> {
    try {
      console.log('Loading user tournaments for user:', userId);
      const response = await fetch(`${this.baseURL}/user/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.userTournaments = await response.json();
      console.log('Loaded user tournaments:', this.userTournaments.length);
    } catch (error) {
      console.error('Failed to load user tournaments:', error);
      this.userTournaments = [];
    }
  }

  public async createTournament(tournamentData: {
    name: string;
    description?: string;
    max_participants: number;
  }): Promise<Tournament | null> {
    try {
      const authManager = (window as any).authManager;
      if (!authManager || !authManager.getCurrentUser()) {
        throw new Error('User not authenticated');
      }

      const user = authManager.getCurrentUser();
      const payload = {
        ...tournamentData,
        created_by: user.userId
      };

      console.log('Creating tournament:', payload);
      const response = await fetch(`${this.baseURL}/tournaments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authManager.getToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const newTournament = await response.json();
      console.log('Tournament created:', newTournament);

      // Refresh tournaments list
      await this.loadTournaments();
      return newTournament;
    } catch (error) {
      console.error('Failed to create tournament:', error);
      return null;
    }
  }

  public async joinTournament(tournamentId: number): Promise<boolean> {
    try {
      const authManager = (window as any).authManager;
      if (!authManager || !authManager.getCurrentUser()) {
        throw new Error('User not authenticated');
      }

      console.log('Joining tournament:', tournamentId);
      const response = await fetch(`${this.baseURL}/tournaments/${tournamentId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authManager.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Successfully joined tournament');
      await this.loadTournaments(); // Refresh list
      return true;
    } catch (error) {
      console.error('Failed to join tournament:', error);
      return false;
    }
  }

  public async leaveTournament(tournamentId: number): Promise<boolean> {
    try {
      const authManager = (window as any).authManager;
      if (!authManager || !authManager.getCurrentUser()) {
        throw new Error('User not authenticated');
      }

      console.log('Leaving tournament:', tournamentId);
      const response = await fetch(`${this.baseURL}/tournaments/${tournamentId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authManager.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Successfully left tournament');
      await this.loadTournaments(); // Refresh list
      return true;
    } catch (error) {
      console.error('Failed to leave tournament:', error);
      return false;
    }
  }

  public async startTournament(tournamentId: number): Promise<boolean> {
    try {
      const authManager = (window as any).authManager;
      if (!authManager || !authManager.getCurrentUser()) {
        throw new Error('User not authenticated');
      }

      console.log('Starting tournament:', tournamentId);
      const response = await fetch(`${this.baseURL}/tournaments/${tournamentId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authManager.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Tournament started successfully');
      await this.loadTournaments(); // Refresh list
      return true;
    } catch (error) {
      console.error('Failed to start tournament:', error);
      return false;
    }
  }

  public async deleteTournament(tournamentId: number): Promise<boolean> {
    try {
      const authManager = (window as any).authManager;
      if (!authManager || !authManager.getCurrentUser()) {
        throw new Error('User not authenticated');
      }

      console.log('Deleting tournament:', tournamentId);
      const response = await fetch(`${this.baseURL}/tournaments/${tournamentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authManager.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Tournament deleted successfully');
      await this.loadTournaments(); // Refresh list
      return true;
    } catch (error) {
      console.error('Failed to delete tournament:', error);
      return false;
    }
  }

  // Getters
  public getCurrentTournaments(): Tournament[] {
    return [...this.currentTournaments];
  }

  public getUserTournaments(): Tournament[] {
    return [...this.userTournaments];
  }

  public getTournamentById(id: number): Tournament | undefined {
    return this.currentTournaments.find(t => t.id === id);
  }

  public getParticipantMap(): { [userId: number]: string } {
    return { ...this.participantMap };
  }

  public setParticipantMap(map: { [userId: number]: string }): void {
    this.participantMap = { ...map };
  }

  // Utility methods
  public isUserParticipant(tournamentId: number, userId: number): boolean {
    // This would need to be implemented based on your API
    // For now, return false
    return false;
  }

  public canUserJoin(tournament: Tournament, userId: number): boolean {
    return tournament.status === 'open' &&
           tournament.current_participants < tournament.max_participants &&
           tournament.created_by !== userId;
  }

  public canUserStart(tournament: Tournament, userId: number): boolean {
    return tournament.created_by === userId &&
           tournament.status === 'open' &&
           tournament.current_participants >= 2;
  }

  public canUserDelete(tournament: Tournament, userId: number): boolean {
    return tournament.created_by === userId &&
           tournament.status === 'open';
  }
}