// tournament-service/src/database/index.ts
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/tournaments.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
      initializeTables();
  }
});

function initializeTables(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      current_participants INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      finished_at DATETIME,
      winner_id INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tournament_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      eliminated_at DATETIME,
      final_rank INTEGER,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      UNIQUE(tournament_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tournament_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      round INTEGER NOT NULL,
      match_number INTEGER NOT NULL,
      player1_id INTEGER,
      player2_id INTEGER,
      winner_id INTEGER,
      player1_score INTEGER DEFAULT 0,
      player2_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      played_at DATETIME,
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
	  UNIQUE(tournament_id, round, match_number)
    )
  `);
}

export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

export function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve((row as T) || null);
      }
    });
  });
}

export function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows as T[]);
      }
    });
  });
}