// user-service/src/database/index.ts
import { createDatabaseConfig, createDatabaseConnection, ensureColumnExists, promisifyDbRun, promisifyDbGet, createLogger } from '@ft-transcendence/common';
import path from 'path';

const dbConfig = createDatabaseConfig('user-service', 'users');
const connection = createDatabaseConnection(dbConfig);
const logger = createLogger('USER-SERVICE-DB');

// Export the db instance directly
export const db = connection.getDb();

// Initialize database tables and data
export async function initializeDatabase(): Promise<void> {
  try {
    // 1. Attach Auth Database (Legacy/HEAD Requirement)
    const authDbPath = '/app/auth-database/auth.db';
    logger.info(`Attaching Auth DB at: ${authDbPath}`);

    await new Promise<void>((resolve, reject) => {
      db.run(`ATTACH DATABASE ? AS auth`, [authDbPath], (err) => {
        if (err) {
          logger.error('Failed to attach auth database:', err);
          // Depending on strictness, we might wan to reject, but HEAD allowed it to fail? 
          // HEAD logged error but didn't reject explicitly in the callback unless 'error' event fired.
          // But let's proceed.
        } else {
          logger.info('Attached auth database successfully');
        }
        resolve();
      });
    });

    // 2. Create extended user profiles table (Develop Schema)
    await promisifyDbRun(db, `
      CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        is_custom_avatar INTEGER DEFAULT 0,
        bio TEXT,
        country TEXT,
        campaign_level INTEGER DEFAULT 1,
        campaign_mastered INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        win_streak INTEGER DEFAULT 0,
        tournaments_won INTEGER DEFAULT 0,
        friends_count INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure all columns exist (migration logic from Develop)
    await ensureColumnExists(db, 'user_profiles', 'campaign_level', 'INTEGER DEFAULT 1');
    // Hoach - campaign progression- backend: Add campaign_mastered column
    await ensureColumnExists(db, 'user_profiles', 'campaign_mastered', 'INTEGER DEFAULT 0');
    await ensureColumnExists(db, 'user_profiles', 'is_custom_avatar', 'INTEGER DEFAULT 0');
    await ensureColumnExists(db, 'user_profiles', 'bio', 'TEXT');
    await ensureColumnExists(db, 'user_profiles', 'country', 'TEXT');

    const gameStatsColumns = [
      'games_played INTEGER DEFAULT 0',
      'games_won INTEGER DEFAULT 0',
      'win_streak INTEGER DEFAULT 0',
      'tournaments_won INTEGER DEFAULT 0',
      'friends_count INTEGER DEFAULT 0',
      'xp INTEGER DEFAULT 0',
      'level INTEGER DEFAULT 1'
    ];

    for (const columnDef of gameStatsColumns) {
      const columnName = columnDef.split(' ')[0];
      await ensureColumnExists(db, 'user_profiles', columnName, columnDef.substring(columnName.length + 1));
    }

    // Update existing rows that might have NULL campaign_level
    await promisifyDbRun(db, `UPDATE user_profiles SET campaign_level = 1 WHERE campaign_level IS NULL`);

    // 3. Create Friends Table
    await promisifyDbRun(db, `
      CREATE TABLE IF NOT EXISTS friends (
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, friend_id),
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id),
        FOREIGN KEY (friend_id) REFERENCES user_profiles(user_id)
      )
    `);

  } catch (error) {
    logger.error('Error initializing user-service database:', error);
    throw error;
  }
}
