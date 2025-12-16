// frontend/src/managers/tournament/TournamentNetworkManager.ts
// Handles all tournament API calls and network communication
import { logger } from '../../utils/Logger';

import { showToast } from '../../toast';
import { authManager } from '../auth';

interface Tournament {
  id: number;
  name: string;
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

export class TournamentNetworkManager {
  private baseURL: string;

  constructor() {
    // Check if running in development mode (direct service access)
    // Use development URL only when explicitly running on a non-standard port
    if (window.location.hostname === 'localhost' && window.location.port && window.location.port !== '80') {
      // Direct service access for development
      this.baseURL = 'http://localhost:3003';
      console.log('🏆 [TournamentNetworkManager] Using direct service URL for development');
    } else {
      this.baseURL = '/api/tournament';
    }

    console.log('🏆 [TournamentNetworkManager] Initialized with baseURL:', this.baseURL);
  }

  // Load tournaments
  public async loadTournaments(): Promise<Tournament[]> {
    console.log('🏆 [Network] Loading tournaments...');

    try {
      const headers = authManager ? authManager.getAuthHeaders() : {};

      console.log('🏆 [Network] Using headers:', headers);
      console.log('🏆 [Network] Fetching from:', this.baseURL);

      const response = await fetch(`${this.baseURL}/tournaments`, { headers });
      console.log('🏆 [Network] Response status:', response.status);

      if (response.ok) {
        const tournaments: Tournament[] = await response.json();
        console.log('🏆 [Network] Received tournaments:', tournaments);
        return tournaments;
      } else {
        logger.error('TournamentNetworkManager', `Failed to load tournaments: ${response.status} ${response.statusText}`);
        const errorBody = await response.text();
        logger.error('TournamentNetworkManager', `Error body: ${errorBody}`);
        throw new Error(`Failed to load tournaments: ${response.status}`);
      }
    } catch (error) {
      logger.error('TournamentNetworkManager', 'Error loading tournaments', error);
      throw error;
    }
  }

  // Create tournament
  public async createTournament(tournamentData: {
    name: string;
    description?: string;
    maxParticipants: number;
    createdBy: number;
    participants: number[];
  }): Promise<any> {
    try {
      console.log('🏆 [Network] Creating tournament with data:', tournamentData);

      const response = await fetch(`${this.baseURL}/tournaments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        },
        body: JSON.stringify(tournamentData)
      });

      console.log('🏆 [Network] Create response status:', response.status);
      const createResult = await response.json();
      console.log('🏆 [Network] Create response body:', createResult);

      if (!response.ok) {
        throw new Error(createResult.error || createResult.message || 'Failed to create tournament');
      }

      const tournamentId = createResult.data.id;
      console.log('🏆 [Network] Tournament created:', tournamentId);

      return createResult;
    } catch (error) {
      logger.error('TournamentNetworkManager', 'Create tournament error', error);
      throw error;
    }
  }

  // Join tournament
  public async joinTournament(tournamentId: number, userId: number): Promise<any> {
    try {
      const joinURL = `${this.baseURL}/join`;
      console.log('🏆 [Network] Join URL:', joinURL);

      const requestData = {
        tournamentId: parseInt(tournamentId.toString()),
        userId: parseInt(userId.toString())
      };
      console.log('🏆 [Network] Request data:', requestData);

      const authHeaders = authManager ? authManager.getAuthHeaders() : {};
      const response = await fetch(joinURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(requestData)
      });

      console.log('🏆 [Network] Response status:', response.status);
      console.log('🏆 [Network] Response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('🏆 [Network] Join success:', result);
        return result;
      } else {
        let errorMessage = 'Unknown error';
        try {
          const result = await response.json();
          errorMessage = result.error || result.message || 'Server error';
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        logger.error('TournamentNetworkManager', `Join failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error('TournamentNetworkManager', 'Join tournament network error', error);
      throw error;
    }
  }

  // Add participant to tournament
  public async addParticipant(tournamentId: number, userId: number): Promise<any> {
    try {
      const authHeaders = authManager ? authManager.getAuthHeaders() : {};
      const joinResponse = await fetch(`${this.baseURL}/tournaments/${tournamentId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ userId })
      });

      if (!joinResponse.ok) {
        const joinResult = await joinResponse.json();
        logger.error('TournamentNetworkManager', `Failed to add participant: ${userId}`, joinResult);
        throw new Error(joinResult.error || 'Failed to add participant');
      } else {
        console.log('🏆 [Network] Added participant:', userId);
        return await joinResponse.json();
      }
    } catch (error) {
      logger.error('TournamentNetworkManager', 'Add participant error', error);
      throw error;
    }
  }

  // Start tournament
  public async startTournament(tournamentId: number): Promise<any> {
    try {
      console.log('🏆 [Network] Starting tournament...');

      const authHeaders = authManager ? authManager.getAuthHeaders() : {};
      const startResponse = await fetch(`${this.baseURL}/tournaments/${tournamentId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({})
      });

      const startResult = await startResponse.json();
      console.log('🏆 [Network] Start response:', startResult);

      if (!startResponse.ok) {
        throw new Error(startResult.error || startResult.message || 'Failed to start tournament');
      }

      console.log('🏆 [Network] Tournament started:', startResult);
      return startResult;
    } catch (error) {
      logger.error('TournamentNetworkManager', 'Start tournament error', error);
      throw error;
    }
  }

  // View tournament details
  public async viewTournament(tournamentId: number): Promise<any> {
    try {
      const authHeaders = authManager ? authManager.getAuthHeaders() : {};
      const response = await fetch(`${this.baseURL}/tournaments/${tournamentId}`, {
        headers: {
          ...authHeaders
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load tournament details');
      }

      const details = await response.json();
      console.log('🏆 [Network] Tournament details (before username fetch):', details);

      // Fetch usernames for all participants
      const participantsWithNames = await Promise.all(
        details.participants.map(async (p: any) => {
          try {
            const userResponse = await fetch(`/api/auth/profile/${p.user_id}`, {
              headers: authHeaders
            });
            if (userResponse.ok) {
              const result = await userResponse.json();
              if (result.success && result.data) {
                return { ...p, username: result.data.username };
              }
            }
          } catch (err) {
            logger.error('TournamentNetworkManager', `Failed to fetch username for user ${p.user_id}`, err);
          }
          return { ...p, username: `Player ${p.user_id}` };
        })
      );

      details.participants = participantsWithNames;
      console.log('🏆 [Network] Tournament details (after username fetch):', details);

      return details;
    } catch (error) {
      logger.error('TournamentNetworkManager', 'View tournament error', error);
      throw error;
    }
  }

  // Record match result
  public async recordMatchResult(tournamentId: number, matchId: number, winnerId: number, player1Score: number, player2Score: number): Promise<any> {
    console.log('🏆 [Network] ========== RECORDING MATCH RESULT ==========');
    console.log('🏆 [Network] Input parameters:', {
      tournamentId,
      matchId,
      winnerId,
      player1Score,
      player2Score
    });

    try {
      const authHeaders = authManager ? authManager.getAuthHeaders() : {};

      const requestBody = {
        winnerId,
        player1Score,
        player2Score
      };

      console.log('🏆 [Network] Sending to backend:', requestBody);

      const response = await fetch(`${this.baseURL}/tournaments/${tournamentId}/matches/${matchId}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🏆 [Network] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        logger.error('TournamentNetworkManager', 'Failed to record match result', errorData);
        throw new Error(errorData.error || 'Failed to record match result');
      }

      const result = await response.json();
      console.log('🏆 [Network] Backend response:', result);
      console.log('🏆 [Network] Match result recorded successfully');
      return result;

    } catch (error) {
      logger.error('TournamentNetworkManager', 'Record match result error', error);
      throw error;
    }
  }

  // Record tournament on blockchain
  public async recordOnBlockchain(tournamentId: number, winnerId: number): Promise<any> {
    try {
      const authHeaders = authManager ? authManager.getAuthHeaders() : {};
      const response = await fetch(`${this.baseURL}/blockchain/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          tournamentId,
          winnerId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record on blockchain');
      }

      const result = await response.json();
      console.log('🏆 [Network] Blockchain recording result:', result);
      return result;
    } catch (error) {
      logger.error('TournamentNetworkManager', 'Blockchain recording error', error);
      throw error;
    }
  }
}