// auth-service/src/services/authService.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import axios from 'axios';
import { User, DatabaseUser } from '../types';
import { getQuery, runQuery } from '../utils/database';

let sessionSecret: any = null;

export class AuthService {
  async register(username: string, email: string, password: string): Promise<{ userId: number }> {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await runQuery(
      'INSERT INTO users (username, email, password_hash, last_login) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [username, email, hashedPassword]
    );

    if (!sessionSecret) {
      try {
        const vaultResponse = await axios.get(`${process.env.VAULT_ADDR}/v1/kv/data/Server_Session`, { headers: { 'X-Vault-Token': process.env.VAULT_TOKEN } });
        const secrets = vaultResponse.data.data.data;
        if (!secrets || !secrets.Secret)
          throw new Error('Vault response missing secrets');
        sessionSecret = secrets.Secret;
      } catch (err: any) {
        console.log("Failed server_session credentials: ", err.message );
      }
    }

    try {
      // Add a profile for the user in the user database.
      console.log('Attempting to create a user profile for the new user');
      let profile = await axios.get(`http://user-service:3000/profile/${result.lastID}`, { timeout: 5000, headers: { 'X-Microservice-Secret': sessionSecret } });
      if (profile.status === 200)
        console.log('User profile ready for update');

      console.log('Attempting to update the user profile for the new user');
      profile = await axios.put(`http://user-service:3000/profile/${result.lastID}`, { displayName: username }, { timeout: 5000, headers: { 'X-Microservice-Secret': sessionSecret } });
      if (profile.status === 200)
        console.log('User profile ready');
    } catch (err: any) {
      console.log('Something went wrong:', err.message);
    }
    return { userId: (result as any).lastID };
  }

  async login(identifier: string, password: string): Promise<User> {
    const user = await getQuery<DatabaseUser>(
      'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?',
      [identifier, identifier]
    );

    if (!user || !user.password_hash) {
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

    // Hoach edited SECURITY FIX: Use HTTPS for password reset links to prevent MITM attacks
    const resetLink = `https://localhost/reset-password?token=${resetToken}`;
    // Hoach edit ended

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