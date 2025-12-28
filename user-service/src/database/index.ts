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
        bio TEXT,
        country TEXT,
        preferred_language TEXT DEFAULT 'en',
        theme_preference TEXT DEFAULT 'dark',
        notification_settings TEXT DEFAULT '{}',
        privacy_settings TEXT DEFAULT '{}',
        campaign_level INTEGER DEFAULT 1,
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

    // 3. Create achievements table (Develop Schema)
    await promisifyDbRun(db, `
      CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon_url TEXT,
        reward_points INTEGER DEFAULT 0
      )
    `);

    // Insert default achievements if table is empty
    const result = await promisifyDbGet<{ count: number }>(db, 'SELECT COUNT(*) as count FROM achievements');
    if (result && result.count === 0) {
      const defaultAchievements = [
        { name: 'First Win', description: 'Win your first game', icon_url: '🏆', reward_points: 10 },
        { name: 'Winning Streak', description: 'Win 5 games in a row', icon_url: '🔥', reward_points: 25 },
        { name: 'Tournament Champion', description: 'Win a tournament', icon_url: '👑', reward_points: 50 },
        { name: 'Social Butterfly', description: 'Make 10 friends', icon_url: '🦋', reward_points: 15 },
        { name: 'Veteran Player', description: 'Play 100 games', icon_url: '🎖️', reward_points: 30 }
      ];

      for (const achievement of defaultAchievements) {
        await promisifyDbRun(db,
          'INSERT INTO achievements (name, description, icon_url, reward_points) VALUES (?, ?, ?, ?)',
          [achievement.name, achievement.description, achievement.icon_url, achievement.reward_points]
        );
      }
    }

    // Create user achievements table
    await promisifyDbRun(db, `
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_id INTEGER NOT NULL,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (achievement_id) REFERENCES achievements (id),
        UNIQUE(user_id, achievement_id)
      )
    `);

  } catch (error) {
    logger.error('Error initializing user-service database:', error);
    throw error;
  }
}
