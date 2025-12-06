// frontend/src/managers/auth/index.ts
// Export all authentication managers

export { TokenManager } from './TokenManager';
export { AuthApiService } from './AuthApiService';
export { UserSessionManager } from './UserSessionManager';
export { AuthManager } from './AuthManager';

// Import for global assignment
import { AuthManager } from './AuthManager';

// Create and export singleton instance
export const authManager = new AuthManager();

// Make AuthManager available globally for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).AuthManager = AuthManager;
}