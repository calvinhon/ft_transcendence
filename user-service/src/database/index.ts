// user-service/src/database/index.ts
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/users.db');

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
    `, (err) => {
      if (err) {
        console.error('Error creating user_profiles table:', err);
      } else {
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

        // Add game statistics columns if they don't exist
        const gameStatsColumns = [
          'games_played INTEGER DEFAULT 0',
          'games_won INTEGER DEFAULT 0',
          'win_streak INTEGER DEFAULT 0',
          'tournaments_won INTEGER DEFAULT 0',
          'friends_count INTEGER DEFAULT 0',
          'xp INTEGER DEFAULT 0',
          'level INTEGER DEFAULT 1'
        ];

        gameStatsColumns.forEach(columnDef => {
          const columnName = columnDef.split(' ')[0];
          db.run(`ALTER TABLE user_profiles ADD COLUMN ${columnDef}`, (err: Error | null) => {
            if (err && !err.message.includes('duplicate column')) {
              console.error(`Error adding ${columnName} column:`, err);
            }
          });
        });
      }

      // Create achievements table
      db.run(`
        CREATE TABLE IF NOT EXISTS achievements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          icon_url TEXT,
          reward_points INTEGER DEFAULT 0
        )
      `);

      // Insert default achievements if table is empty
      db.get('SELECT COUNT(*) as count FROM achievements', [], (err: Error | null, result: any) => {
        if (!err && result.count === 0) {
          const defaultAchievements = [
            { name: 'First Win', description: 'Win your first game', icon_url: '🏆', reward_points: 10 },
            { name: 'Winning Streak', description: 'Win 5 games in a row', icon_url: '🔥', reward_points: 25 },
            { name: 'Tournament Champion', description: 'Win a tournament', icon_url: '👑', reward_points: 50 },
            { name: 'Social Butterfly', description: 'Make 10 friends', icon_url: '🦋', reward_points: 15 },
            { name: 'Veteran Player', description: 'Play 100 games', icon_url: '🎖️', reward_points: 30 }
          ];

          defaultAchievements.forEach(achievement => {
            db.run(
              'INSERT INTO achievements (name, description, icon_url, reward_points) VALUES (?, ?, ?, ?)',
              [achievement.name, achievement.description, achievement.icon_url, achievement.reward_points]
            );
          });
        }
      });

      // Create user achievements table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_achievements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          achievement_id INTEGER NOT NULL,
          unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (achievement_id) REFERENCES achievements (id),
          UNIQUE(user_id, achievement_id)
        )
      `);
    });
  }
});