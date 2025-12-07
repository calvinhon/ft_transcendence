import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface GameState {
  gameId: string;
  ballX: number;
  ballY: number;
  ballVelX: number;
  ballVelY: number;
  paddleLeftY: number;
  paddleRightY: number;
  scoreLeft: number;
  scoreRight: number;
  isGameOver: boolean;
  winner?: string;
}

interface GameStartResponse {
  gameId: string;
  opponent: string;
  status: string;
}

interface AuthResponse {
  token: string;
  userId: string;
}

interface StatsResponse {
  userId: string;
  wins: number;
  losses: number;
  winRate: number;
  rank: number;
  streak: number;
  averageScore: number;
}

export class GameServiceClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenPath: string;

  constructor(baseURL: string = 'http://localhost') {
    this.tokenPath = path.join(os.homedir(), '.pong-cli', 'token.txt');
    this.client = axios.create({
      baseURL,
      timeout: 5000,
    });

    this.loadToken();
    this.setupInterceptors();
  }

  private loadToken(): void {
    try {
      if (fs.existsSync(this.tokenPath)) {
        this.token = fs.readFileSync(this.tokenPath, 'utf-8').trim();
        console.log('Token loaded from cache');
      }
    } catch (error) {
      console.log('No cached token found');
    }
  }

  private saveToken(token: string): void {
    try {
      const dir = path.dirname(this.tokenPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.tokenPath, token, 'utf-8');
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await this.client.post('/api/auth/login', {
        username,
        password,
      });
      
      // Extract token from Set-Cookie header
      const setCookie = response.headers['set-cookie'];
      if (setCookie && Array.isArray(setCookie)) {
        const tokenCookie = setCookie.find(cookie => cookie.startsWith('token='));
        if (tokenCookie) {
          // Extract token value from cookie string
          const tokenMatch = tokenCookie.match(/token=([^;]+)/);
          if (tokenMatch) {
            this.token = tokenMatch[1];
            this.saveToken(this.token);
          }
        }
      }
      
      // Return user info from response
      const user = response.data.user || response.data;
      return {
        token: this.token || '',
        userId: user.id || user.userId || ''
      };
    } catch (error: any) {
      throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async startGame(): Promise<GameStartResponse> {
    try {
      const response = await this.client.post<GameStartResponse>('/api/game/start');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to start game: ${error.response?.data?.message || error.message}`);
    }
  }

  async getGameState(gameId: string): Promise<GameState> {
    try {
      const response = await this.client.get<GameState>(`/api/game/${gameId}/state`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get game state: ${error.response?.data?.message || error.message}`);
    }
  }

  async movePaddle(gameId: string, direction: 'up' | 'down'): Promise<void> {
    try {
      await this.client.post(`/api/game/${gameId}/move`, { direction });
    } catch (error: any) {
      throw new Error(`Failed to move paddle: ${error.response?.data?.message || error.message}`);
    }
  }

  async endGame(gameId: string, result: 'win' | 'lose'): Promise<void> {
    try {
      await this.client.post(`/api/game/${gameId}/end`, { result });
    } catch (error: any) {
      throw new Error(`Failed to end game: ${error.response?.data?.message || error.message}`);
    }
  }

  async getStats(userId: string): Promise<StatsResponse> {
    try {
      const response = await this.client.get<StatsResponse>(`/api/game/stats/${userId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get stats: ${error.response?.data?.message || error.message}`);
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  logout(): void {
    this.token = null;
    try {
      if (fs.existsSync(this.tokenPath)) {
        fs.unlinkSync(this.tokenPath);
      }
    } catch (error) {
      console.error('Failed to remove token file:', error);
    }
  }
}

export const gameClient = new GameServiceClient();
