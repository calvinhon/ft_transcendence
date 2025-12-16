import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface AuthData {
  token: string;
  userId: string;
  username: string;
}

class AuthStorage {
  private authPath: string;

  constructor() {
    this.authPath = path.join(os.homedir(), '.pong-cli', 'auth.json');
  }

  saveAuth(data: AuthData): void {
    try {
      const dir = path.dirname(this.authPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.authPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save auth data:', error);
    }
  }

  getAuth(): Partial<AuthData> {
    try {
      if (fs.existsSync(this.authPath)) {
        const data = fs.readFileSync(this.authPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
    }
    return {};
  }

  clearAuth(): void {
    try {
      if (fs.existsSync(this.authPath)) {
        fs.unlinkSync(this.authPath);
      }
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }
}

export const authStorage = new AuthStorage();
