// user-service/src/routes/handlers/gdpr.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../database';
import { promisifyDbGet, promisifyDbRun, promisifyDbAll } from '@ft-transcendence/common';
import sqlite3 from 'sqlite3';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('USER-SERVICE');

interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  last_login: string;
  [key: string]: any;
}

interface GameRecord {
  [key: string]: any;
}

interface TournamentRecord {
  [key: string]: any;
}

interface GDPRAction {
  user_id: string;
  action: string;
  timestamp: string;
}

/**
 * Request user data export (GDPR - Right to data portability)
 */
export async function exportUserDataHandler(
  request: FastifyRequest<{
    Params: {
      userId: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { userId } = request.params;

    // Get user data
    const user = await promisifyDbGet<User>(
      db,
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }

    // Get user's game history
    const games = await promisifyDbAll<GameRecord>(
      db,
      'SELECT * FROM games WHERE user_id = ?',
      [userId]
    );

    // Get user's tournament data
    const tournaments = await promisifyDbAll<TournamentRecord>(
      db,
      'SELECT * FROM tournament_registrations WHERE user_id = ?',
      [userId]
    );

    // Prepare exportable data
    const exportData = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        last_login: user.last_login
      },
      games: games || [],
      tournaments: tournaments || [],
      export_timestamp: new Date().toISOString()
    };

    // Return as JSON file for download
    reply.type('application/json');
    reply.header('Content-Disposition', `attachment; filename="user_data_${userId}.json"`);
    reply.send(exportData);
  } catch (err) {
    logger.error('Export user data error:', err);
    reply.status(500).send({ error: 'Failed to export user data' });
  }
}

/**
 * Anonymize user account (GDPR - Right to be forgotten)
 * Replaces user data with anonymized versions while keeping records for audit
 */
export async function anonymizeUserHandler(
  request: FastifyRequest<{
    Params: {
      userId: string;
    };
    Body: {
      confirm: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { userId } = request.params;
    const { confirm } = request.body;

    if (!confirm) {
      reply.status(400).send({ error: 'Confirmation required to anonymize account' });
      return;
    }

    // Verify user exists
    const user = await promisifyDbGet<User>(
      db,
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }

    const timestamp = new Date().toISOString();

    // Anonymize user profile
    await promisifyDbRun(
      db,
      `UPDATE users SET username = ?, email = ?, avatar_url = NULL, updated_at = ? WHERE id = ?`,
      [`anonymized_user_${userId}`, `anonymized_${userId}@example.com`, timestamp, userId]
    );

    // Log anonymization action
    await promisifyDbRun(
      db,
      `INSERT INTO gdpr_actions (user_id, action, timestamp) VALUES (?, ?, ?)`,
      [userId, 'ANONYMIZE', timestamp]
    );

    reply.status(200).send({
      success: true,
      message: 'User account has been anonymized',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Anonymize user error:', err);
    reply.status(500).send({ error: 'Failed to anonymize user account' });
  }
}

/**
 * Delete user account and all data (GDPR - Right to erasure/Right to be forgotten)
 */
export async function deleteUserHandler(
  request: FastifyRequest<{
    Params: {
      userId: string;
    };
    Body: {
      password: string;
      confirm: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { userId } = request.params;
    const { password, confirm } = request.body;

    if (!confirm) {
      reply.status(400).send({ error: 'Confirmation required to delete account' });
      return;
    }

    // Verify user exists
    const user = await promisifyDbGet<User>(
      db,
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }

    const timestamp = new Date().toISOString();

    // Log deletion action before deleting
    await promisifyDbRun(
      db,
      `INSERT INTO gdpr_actions (user_id, action, timestamp) VALUES (?, ?, ?)`,
      [userId, 'DELETE', timestamp]
    );

    // Delete user's game records
    await promisifyDbRun(db, 'DELETE FROM games WHERE user_id = ?', [userId]);

    // Delete user's tournament registrations
    await promisifyDbRun(db, 'DELETE FROM tournament_registrations WHERE user_id = ?', [userId]);

    // Delete user's authentication tokens
    await promisifyDbRun(db, 'DELETE FROM auth_tokens WHERE user_id = ?', [userId]);

    // Delete user profile
    await promisifyDbRun(db, 'DELETE FROM users WHERE id = ?', [userId]);

    reply.status(200).send({
      success: true,
      message: 'User account and all associated data have been permanently deleted',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Delete user error:', err);
    reply.status(500).send({ error: 'Failed to delete user account' });
  }
}

/**
 * Get GDPR compliance status for user
 */
export async function getGdprStatusHandler(
  request: FastifyRequest<{
    Params: {
      userId: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { userId } = request.params;

    const user = await promisifyDbGet<User>(
      db,
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      reply.status(404).send({ error: 'User not found' });
      return;
    }

    // Get user's data footprint
    const gamesCount = await promisifyDbGet<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM games WHERE user_id = ?',
      [userId]
    );

    const tournamentsCount = await promisifyDbGet<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM tournament_registrations WHERE user_id = ?',
      [userId]
    );

    const actions = await promisifyDbAll<GDPRAction>(
      db,
      'SELECT * FROM gdpr_actions WHERE user_id = ? ORDER BY timestamp DESC',
      [userId]
    );

    const accountAgeDays = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    reply.send({
      userId,
      username: user.username,
      email: user.email,
      dataFootprint: {
        games_count: gamesCount?.count || 0,
        tournaments_count: tournamentsCount?.count || 0,
        account_age_days: accountAgeDays
      },
      gdprActions: actions || [],
      gdprRights: {
        right_to_access: 'You can request your data export',
        right_to_erasure: 'You can request complete account deletion',
        right_to_rectification: 'You can update your profile information',
        right_to_data_portability: 'You can export all your data',
        right_to_object: 'You can object to data processing'
      }
    });
  } catch (err) {
    logger.error('Get GDPR status error:', err);
    reply.status(500).send({ error: 'Failed to get GDPR status' });
  }
}
