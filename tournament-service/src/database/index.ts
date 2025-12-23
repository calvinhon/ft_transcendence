// tournament-service/src/database/index.ts
import { createDatabaseConfig, createDatabaseConnection, promisifyDbRun, promisifyDbGet, promisifyDbAll, ensureColumnExists } from '@ft-transcendence/common';

const dbConfig = createDatabaseConfig('tournament-service', 'tournaments', { enableTestMode: true });
const connection = createDatabaseConnection(dbConfig);

// For backward compatibility, export the db directly
export const db = connection.getDb();

/**
 * Initialize database tables for production
 */
async function initializeTables(): Promise<void> {
  // Create tournaments table
  await promisifyDbRun(db, `
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
  await promisifyDbRun(db, `
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
  await ensureColumnExists(db, 'tournament_participants', 'final_rank', 'INTEGER');

  // Create tournament matches table
  await promisifyDbRun(db, `
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
async function initializeTestTables(): Promise<void> {
  // Create tournaments table
  await promisifyDbRun(db, `
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
  `);

  // Create tournament participants table
  await promisifyDbRun(db, `
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
  `);

  // Create tournament matches table
  await promisifyDbRun(db, `
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

// Initialize tables based on environment
async function initializeDatabase(): Promise<void> {
  try {
    const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

    if (!isTest) {
      await initializeTables();
    } else {
      await initializeTestTables();
    }
  } catch (error) {
    console.error('Error initializing tournament-service database:', error);
    throw error;
  }
}

// Initialize the database
initializeDatabase().catch(console.error);

/**
 * Promise wrapper for database operations (backward compatibility)
 */
export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return promisifyDbRun(db, sql, params);
}

export async function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const result = await promisifyDbGet<T>(db, sql, params);
  return result ?? null;
}

export function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return promisifyDbAll<T>(db, sql, params);
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  return connection.close();
}