// auth-service/src/services/authService.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { User, DatabaseUser, JWTPayload } from '../types';
import { getQuery, runQuery } from '../utils/database';

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  async register(username: string, email: string, password: string): Promise<{ userId: number; token: string }> {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await runQuery(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    const token = this.fastify.jwt.sign({
      userId: (result as any).lastID,
      username
    } as JWTPayload, { expiresIn: '24h' });

    return { userId: (result as any).lastID, token };
  }

  async login(identifier: string, password: string): Promise<{ user: User; token: string }> {
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

    const token = this.fastify.jwt.sign({
      userId: user.id,
      username: user.username
    } as JWTPayload, { expiresIn: '24h' });

    return {
      user: {
        userId: user.id,
        username: user.username,
        email: user.email
      },
      token
    };
  }

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

  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      return this.fastify.jwt.verify(token) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
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