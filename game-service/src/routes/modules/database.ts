// game-service/src/routes/modules/database.ts
import * as sqlite3 from 'sqlite3';
import * as path from 'path';

const dbPath = path.join(__dirname, '../../../database/games.db');

// Initialize database
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to Games SQLite database');
    // Create games table with support for arcade mode and tournament tracking
    db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER NOT NULL,
        player1_score INTEGER DEFAULT 0,
        player2_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        winner_id INTEGER,
        game_mode TEXT DEFAULT 'coop',
        team1_players TEXT,
        team2_players TEXT,
        tournament_id INTEGER,
        tournament_match_id INTEGER
      )
    `);

    // Migrate existing database: Add new columns if they don't exist
    db.all("PRAGMA table_info(games)", (err, columns: any[]) => {
      if (!err && columns) {
        const columnNames = columns.map(col => col.name);

        // Add game_mode column if it doesn't exist
        if (!columnNames.includes('game_mode')) {
          console.log('📦 [DB-MIGRATION] Adding game_mode column...');
          db.run("ALTER TABLE games ADD COLUMN game_mode TEXT DEFAULT 'coop'", (err) => {
            if (err) console.error('Failed to add game_mode column:', err);
            else console.log('✅ [DB-MIGRATION] game_mode column added');
          });
        }

        // Add team1_players column if it doesn't exist
        if (!columnNames.includes('team1_players')) {
          console.log('📦 [DB-MIGRATION] Adding team1_players column...');
          db.run("ALTER TABLE games ADD COLUMN team1_players TEXT", (err) => {
            if (err) console.error('Failed to add team1_players column:', err);
            else console.log('✅ [DB-MIGRATION] team1_players column added');
          });
        }

        // Add team2_players column if it doesn't exist
        if (!columnNames.includes('team2_players')) {
          console.log('📦 [DB-MIGRATION] Adding team2_players column...');
          db.run("ALTER TABLE games ADD COLUMN team2_players TEXT", (err) => {
            if (err) console.error('Failed to add team2_players column:', err);
            else console.log('✅ [DB-MIGRATION] team2_players column added');
          });
        }

        // Add tournament_id column if it doesn't exist
        if (!columnNames.includes('tournament_id')) {
          console.log('📦 [DB-MIGRATION] Adding tournament_id column...');
          db.run("ALTER TABLE games ADD COLUMN tournament_id INTEGER", (err) => {
            if (err) console.error('Failed to add tournament_id column:', err);
            else console.log('✅ [DB-MIGRATION] tournament_id column added');
          });
        }

        // Add tournament_match_id column if it doesn't exist
        if (!columnNames.includes('tournament_match_id')) {
          console.log('📦 [DB-MIGRATION] Adding tournament_match_id column...');
          db.run("ALTER TABLE games ADD COLUMN tournament_match_id INTEGER", (err) => {
            if (err) console.error('Failed to add tournament_match_id column:', err);
            else console.log('✅ [DB-MIGRATION] tournament_match_id column added');
          });
        }
      }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS game_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games (id)
      )
    `);
  }
});