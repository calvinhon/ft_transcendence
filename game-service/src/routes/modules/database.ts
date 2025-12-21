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
  }
});