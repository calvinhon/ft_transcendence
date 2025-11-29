// frontend/src/managers/auth/UserSessionManager.ts
// Manages user session state and authentication status

interface User {
  userId: number;
  username: string;
  email?: string;
}

export class UserSessionManager {
  private currentUser: User | null = null;

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  clearCurrentUser(): void {
    this.currentUser = null;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  updateUserFromTokenVerification(user: User | null): void {
    this.currentUser = user;
  }
}