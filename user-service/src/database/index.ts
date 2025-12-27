// user-service/src/database/index.ts
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/users.db');

// Initialize database
export const db = new sqlite3.Database(dbPath);

export const initDbPromise = new Promise<void>((resolve, reject) => {
  db.on('open', () => {
    console.log('Connected to Users SQLite database');

    // Use container-mounted path for auth.db (see docker-compose.yml volumes)
    const authDbPath = '/app/auth-database/auth.db';
    console.log(`Attaching Auth DB at: ${authDbPath}`);

    db.serialize(() => {
      // 1. Attach Auth Database
      db.run(`ATTACH DATABASE ? AS auth`, [authDbPath], (err) => {
        if (err) {
          console.error('Failed to attach auth database:', err);
          // We don't reject here to allow server to start even if auth db is missing (graceful degradation or retry?)
          // actually, better to log. If it fails, profile fetch will fail, which is what we see now.
        } else {
          console.log('Attached auth database successfully');
        }
      });

      // 2. Initialize Schema
      initializeSchema();

      // 3. Resolve when apparently ready (operations are queued)
      resolve();
    });
  });

  db.on('error', (err) => {
    console.error('Database connection error:', err);
    reject(err);
  });
});

function initializeSchema() {
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
      wins INTEGER DEFAULT 0,
      total_games INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      games_won INTEGER DEFAULT 0,
      games_lost INTEGER DEFAULT 0,
      win_streak INTEGER DEFAULT 0,
      tournaments_won INTEGER DEFAULT 0,
      friends_count INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      winRate REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating user_profiles table:', err);
    } else {
      // Add campaign_level column if it doesn't exist
      db.run(`ALTER TABLE user_profiles ADD COLUMN campaign_level INTEGER DEFAULT 1`, (err: Error | null) => { });
      // Add game statistics columns
      const gameStatsColumns = [
        'wins INTEGER DEFAULT 0',
        'total_games INTEGER DEFAULT 0',
        'games_played INTEGER DEFAULT 0',
        'games_won INTEGER DEFAULT 0',
        'games_lost INTEGER DEFAULT 0',
        'win_streak INTEGER DEFAULT 0',
        'tournaments_won INTEGER DEFAULT 0',
        'friends_count INTEGER DEFAULT 0',
        'xp INTEGER DEFAULT 0',
        'level INTEGER DEFAULT 1',
        'winRate REAL DEFAULT 0'
      ];
      gameStatsColumns.forEach(columnDef => {
        db.run(`ALTER TABLE user_profiles ADD COLUMN ${columnDef}`, (err: Error | null) => { });
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

    // Insert default achievements
    db.get('SELECT COUNT(*) as count FROM achievements', [], (err: Error | null, result: any) => {
      if (!err && result && result.count === 0) {
        const defaultAchievements = [
          { name: 'First Win', description: 'Win your first game', icon_url: '🏆', reward_points: 10 },
          { name: 'Winning Streak', description: 'Win 5 games in a row', icon_url: '🔥', reward_points: 25 },
          { name: 'Tournament Champion', description: 'Win a tournament', icon_url: '👑', reward_points: 50 },
          { name: 'Social Butterfly', description: 'Make 10 friends', icon_url: '🦋', reward_points: 15 },
          { name: 'Veteran Player', description: 'Play 100 games', icon_url: '🎖️', reward_points: 30 }
        ];
        defaultAchievements.forEach(ach => {
          db.run('INSERT INTO achievements (name, description, icon_url, reward_points) VALUES (?, ?, ?, ?)',
            [ach.name, ach.description, ach.icon_url, ach.reward_points]);
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