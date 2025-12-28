// auth-service/src/services/authService.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User, DatabaseUser } from '../types';
import { getQuery, runQuery } from '../utils/database';
// Hoach added: For session token generation
import { createLogger } from '@ft-transcendence/common';
const logger = createLogger('AUTH-SERVICE');
// End Hoach added

export class AuthService {
  async register(username: string, email: string, password: string): Promise<{ userId: number }> {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await runQuery(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    return { userId: (result as any).lastID };
  }

  async login(identifier: string, password: string): Promise<User> {
    const user = await getQuery<DatabaseUser>(
      'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?',
      [identifier, identifier]
    );

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await runQuery(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    return {
      userId: user.id,
      username: user.username,
      email: user.email
    };
  }

  // Hoach added: Create session after successful login with per-tab token
  async createSession(userId: number): Promise<{ sessionToken: string; tabToken: string }> {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const tabToken = crypto.randomBytes(16).toString('hex'); // Per-tab token (will be stored in sessionStorage)
    // Hoach modified: 5-minute TTL for short-lived sessions (Option 3: new tabs after 5 mins require login)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await runQuery(
      'INSERT INTO sessions (user_id, session_token, tab_token, expires_at) VALUES (?, ?, ?, ?)',
      [userId, sessionToken, tabToken, expiresAt.toISOString()]
    );

    logger.info(`Session created for user ${userId} with 5-minute TTL`);
    return { sessionToken, tabToken };
  }

  // Hoach added: Validate session with both cookie (sessionToken) and per-tab token (tabToken)
  async validateSession(sessionToken: string, tabToken?: string): Promise<User | null> {
    const session = await getQuery<any>(
      `SELECT s.user_id, s.tab_token, u.id, u.username, u.email 
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.session_token = ? AND s.expires_at > datetime('now')`,
      [sessionToken]
    );

    if (!session) {
      logger.warn('Invalid or expired session token');
      return null;
    }

    // Validate per-tab token if provided (new tabs won't have it)
    if (tabToken && session.tab_token !== tabToken) {
      logger.warn(`Tab token mismatch for session ${sessionToken}`);
      return null;
    }

    // Update last activity
    await runQuery(
      'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_token = ?',
      [sessionToken]
    );

    return {
      userId: session.user_id,
      username: session.username,
      email: session.email
    };
  }

  // Hoach added: Logout by deleting session
  async logout(sessionToken: string): Promise<void> {
    await runQuery(
      'DELETE FROM sessions WHERE session_token = ?',
      [sessionToken]
    );
    logger.info('Session deleted');
  }
  // End Hoach added

  async getUserProfile(userId: number): Promise<User> {
    const user = await getQuery<DatabaseUser>(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at
    };
  }

  async createPasswordResetToken(email: string): Promise<{ resetToken: string; resetLink: string }> {
    const user = await getQuery<{ id: number; email: string }>(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      // Return fake data for security
      throw new Error('User not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await runQuery(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiresAt.toISOString()]
    );

    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    return { resetToken, resetLink };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ username: string; email: string }> {
    const resetRecord = await getQuery(
      `SELECT prt.*, u.email, u.username
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = ? AND prt.used = FALSE`,
      [token]
    );

    if (!resetRecord) {
      throw new Error('Invalid or expired reset token');
    }

    const expiresAt = new Date((resetRecord as any).expires_at);
    if (expiresAt < new Date()) {
      throw new Error('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await runQuery(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, (resetRecord as any).user_id]
    );

    await runQuery(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
      [token]
    );

    return {
      username: (resetRecord as any).username,
      email: (resetRecord as any).email
    };
  }
}