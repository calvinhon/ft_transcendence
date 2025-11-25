// game-service/src/routes/modules/database.ts
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { logger } from './logger';

const dbPath = path.join(__dirname, '../../../database/games.db');

// Initialize database
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Error opening database:', err);
  } else {
    logger.db('Connected to Games SQLite database');
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
          logger.db('Adding game_mode column...');
          db.run("ALTER TABLE games ADD COLUMN game_mode TEXT DEFAULT 'coop'", (err) => {
            if (err) logger.error('Failed to add game_mode column:', err);
            else logger.db('game_mode column added');
          });
        }

        // Add team1_players column if it doesn't exist
        if (!columnNames.includes('team1_players')) {
          logger.db('Adding team1_players column...');
          db.run("ALTER TABLE games ADD COLUMN team1_players TEXT", (err) => {
            if (err) logger.error('Failed to add team1_players column:', err);
            else logger.db('team1_players column added');
          });
        }

        // Add team2_players column if it doesn't exist
        if (!columnNames.includes('team2_players')) {
          logger.db('Adding team2_players column...');
          db.run("ALTER TABLE games ADD COLUMN team2_players TEXT", (err) => {
            if (err) logger.error('Failed to add team2_players column:', err);
            else logger.db('team2_players column added');
          });
        }

        // Add tournament_id column if it doesn't exist
        if (!columnNames.includes('tournament_id')) {
          logger.db('Adding tournament_id column...');
          db.run("ALTER TABLE games ADD COLUMN tournament_id INTEGER", (err) => {
            if (err) logger.error('Failed to add tournament_id column:', err);
            else logger.db('tournament_id column added');
          });
        }

        // Add tournament_match_id column if it doesn't exist
        if (!columnNames.includes('tournament_match_id')) {
          logger.db('Adding tournament_match_id column...');
          db.run("ALTER TABLE games ADD COLUMN tournament_match_id INTEGER", (err) => {
            if (err) logger.error('Failed to add tournament_match_id column:', err);
            else logger.db('tournament_match_id column added');
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