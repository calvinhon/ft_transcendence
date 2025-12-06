// auth-service/src/services/twoFactorService.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { getQuery, runQuery } from '../utils/database.js';

interface User {
  id: number;
  username: string;
  email: string;
  two_factor_secret: string | null;
  two_factor_enabled: boolean;
}

export class TwoFactorService {
  /**
   * Generate a new TOTP secret for a user
   */
  async generateSecret(userId: number): Promise<{ secret: string; qrCode: string; otpauth_url: string }> {
    const user = await getQuery<User>('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `FT_Transcendence (${user.username})`,
      issuer: 'FT_Transcendence',
      length: 32,
    });

    // Store the secret (but don't enable 2FA yet)
    await runQuery(
      'UPDATE users SET two_factor_secret = ? WHERE id = ?',
      [secret.base32, userId]
    );

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode,
      otpauth_url: secret.otpauth_url!,
    };
  }

  /**
   * Verify a TOTP token and enable 2FA
   */
  async verifyAndEnable(userId: number, token: string): Promise<boolean> {
    const user = await getQuery<User>('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.two_factor_secret) {
      throw new Error('2FA not set up. Call /auth/2fa/setup first');
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after for clock skew
    });

    if (!verified) {
      return false;
    }

    // Enable 2FA
    await runQuery(
      'UPDATE users SET two_factor_enabled = ? WHERE id = ?',
      [true, userId]
    );

    return true;
  }

  /**
   * Verify a TOTP token for login
   */
  async verifyToken(userId: number, token: string): Promise<boolean> {
    const user = await getQuery<User>('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.two_factor_enabled || !user.two_factor_secret) {
      throw new Error('2FA not enabled for this user');
    }

    // Verify the token
    return speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
      window: 2,
    });
  }

  /**
   * Disable 2FA for a user
   */
  async disable(userId: number): Promise<void> {
    await runQuery(
      'UPDATE users SET two_factor_enabled = ?, two_factor_secret = ? WHERE id = ?',
      [false, null, userId]
    );
  }

  /**
   * Check if 2FA is enabled for a user
   */
  async isEnabled(userId: number): Promise<boolean> {
    const user = await getQuery<User>('SELECT two_factor_enabled FROM users WHERE id = ?', [userId]);
    return user?.two_factor_enabled || false;
  }

  /**
   * Get 2FA status for a user
   */
  async getStatus(userId: number): Promise<{ enabled: boolean; hasSecret: boolean }> {
    const user = await getQuery<User>(
      'SELECT two_factor_enabled, two_factor_secret FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      throw new Error('User not found');
    }

    return {
      enabled: user.two_factor_enabled || false,
      hasSecret: !!user.two_factor_secret,
    };
  }
}

export const twoFactorService = new TwoFactorService();
