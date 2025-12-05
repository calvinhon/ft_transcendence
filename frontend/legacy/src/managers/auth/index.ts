// frontend/src/managers/auth/index.ts
// Export all authentication managers

export { TokenManager } from './token-manager';
export { AuthApiService } from './auth-api-service';
export { UserSessionManager } from './user-session-manager';
export { AuthManager } from './auth-manager';

// Import for global assignment
import { AuthManager } from './auth-manager';

// Create and export singleton instance
export const authManager = new AuthManager();

// Make AuthManager available globally for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).AuthManager = AuthManager;
}