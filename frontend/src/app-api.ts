// frontend/src/app-api.ts
// API functionality for the App

export class AppAPIManager {
  private baseURL: string;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL || window.location.origin;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const authManager = (window as any).authManager;
    if (authManager && authManager.getToken()) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${authManager.getToken()}`,
      };
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // User API methods
  public async getUserProfile(userId: number): Promise<any> {
    return this.makeRequest(`/api/users/${userId}`);
  }

  public async updateUserProfile(userId: number, updates: any): Promise<any> {
    return this.makeRequest(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public async getUserStats(userId: number): Promise<any> {
    return this.makeRequest(`/api/users/${userId}/stats`);
  }

  // Tournament API methods
  public async getTournaments(): Promise<any[]> {
    return this.makeRequest('/api/tournaments');
  }

  public async getTournament(tournamentId: string): Promise<any> {
    return this.makeRequest(`/api/tournaments/${tournamentId}`);
  }

  public async createTournament(tournamentData: any): Promise<any> {
    return this.makeRequest('/api/tournaments', {
      method: 'POST',
      body: JSON.stringify(tournamentData),
    });
  }

  public async joinTournament(tournamentId: string): Promise<any> {
    return this.makeRequest(`/api/tournaments/${tournamentId}/join`, {
      method: 'POST',
    });
  }

  public async updateTournamentMatch(matchId: string, matchData: any): Promise<any> {
    return this.makeRequest(`/api/matches/${matchId}`, {
      method: 'PUT',
      body: JSON.stringify(matchData),
    });
  }

  // Game API methods
  public async getLeaderboard(limit: number = 10): Promise<any[]> {
    return this.makeRequest(`/api/leaderboard?limit=${limit}`);
  }

  public async getGameHistory(userId: number, limit: number = 20): Promise<any[]> {
    return this.makeRequest(`/api/games/history/${userId}?limit=${limit}`);
  }

  public async reportGameResult(gameData: any): Promise<any> {
    return this.makeRequest('/api/games/result', {
      method: 'POST',
      body: JSON.stringify(gameData),
    });
  }

  // Authentication API methods
  public async login(credentials: { email: string; password: string }): Promise<any> {
    return this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  public async register(userData: { username: string; email: string; password: string }): Promise<any> {
    return this.makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  public async logout(): Promise<any> {
    return this.makeRequest('/api/auth/logout', {
      method: 'POST',
    });
  }

  public async refreshToken(): Promise<any> {
    return this.makeRequest('/api/auth/refresh', {
      method: 'POST',
    });
  }

  // Utility methods
  public setBaseURL(url: string): void {
    this.baseURL = url;
  }

  public async ping(): Promise<boolean> {
    try {
      await this.makeRequest('/api/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  public async getServerStatus(): Promise<any> {
    return this.makeRequest('/api/status');
  }
}