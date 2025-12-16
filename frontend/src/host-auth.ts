// Host player authentication logic
import { User, AuthResult } from './types';

export async function handleHostLogin(username: string, password: string, authManager: any): Promise<AuthResult> {
  return await authManager.login(username, password);
}

export async function handleHostRegister(username: string, email: string, password: string, authManager: any): Promise<AuthResult> {
  return await authManager.register(username, email, password);
}
