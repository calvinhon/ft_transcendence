import * as sqlite3 from 'sqlite3';
import * as path from 'path';

const dbPath = path.join(__dirname, '../database/users.db');

// Initialize database
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to Users SQLite database');

    // Create extended user profiles table
    db.run(`
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add campaign_level column if it doesn't exist (for existing databases)
    db.run(`ALTER TABLE user_profiles ADD COLUMN campaign_level INTEGER DEFAULT 1`, (err: Error | null) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding campaign_level column:', err);
      } else {
        // Update existing rows that might have NULL campaign_level
        db.run(`UPDATE user_profiles SET campaign_level = 1 WHERE campaign_level IS NULL`, (updateErr: Error | null) => {
          if (updateErr) {
            console.error('Error updating NULL campaign_level values:', updateErr);
          } else {
            console.log('Successfully migrated campaign_level column');
          }
        });
      }
    });

    // Create user achievements table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_type TEXT NOT NULL,
        achievement_name TEXT NOT NULL,
        description TEXT,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT DEFAULT '{}'
      )
    `);
  }
});