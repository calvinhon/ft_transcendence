// tournament-service/src/database/index.ts
import sqlite3 from 'sqlite3';
import path from 'path';

// Use in-memory database for tests, file database for production
const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
const dbPath = isTest ? ':memory:' : path.join(__dirname, '../../database/tournaments.db');

// Initialize database
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log(`Connected to ${isTest ? 'test' : 'Tournaments'} SQLite database`);
    if (!isTest) {
      initializeTables();
    } else {
      // For tests, initialize tables synchronously
      initializeTestTables();
    }
  }
});

/**
 * Initialize database tables for production
 */
function initializeTables(): void {
  if (isTest) return; // Skip for tests

  // Create tournaments table
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

  // Create tournament participants table
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

  // Add final_rank column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE tournament_participants ADD COLUMN final_rank INTEGER`, (err: any) => {
    // Ignore error if column already exists - this is expected for new databases
  });

  // Create tournament matches table
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
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
    )
  `);
}

/**
 * Initialize database tables for tests
 */
function initializeTestTables(): void {
  if (!isTest) return; // Skip for production

  console.log('Initializing test tables...');
  db.serialize(() => {
    // Create tournaments table
    db.run(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        current_participants INTEGER DEFAULT 0,
        status TEXT DEFAULT 'open',
        created_by INTEGER NOT NULL,
        winner_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        finished_at DATETIME
      )
    `, (err) => {
      if (err) console.error('Error creating tournaments table:', err);
      else console.log('Created tournaments table');
    });

    // Create tournament participants table
    db.run(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        username TEXT,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        eliminated_at DATETIME,
        final_rank INTEGER,
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
        UNIQUE(tournament_id, user_id)
      )
    `, (err) => {
      if (err) console.error('Error creating tournament_participants table:', err);
      else console.log('Created tournament_participants table');
    });

    // Create tournament matches table
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
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
      )
    `, (err) => {
      if (err) console.error('Error creating tournament_matches table:', err);
      else console.log('Created tournament_matches table');
    });
  });
}

/**
 * Promise wrapper for database operations
 */
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

/**
 * Close database connection
 */
export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}