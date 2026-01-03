// tournament-service/src/database/index.ts
import { createDatabaseConfig, createDatabaseConnection, promisifyDbRun, promisifyDbGet, promisifyDbAll, ensureColumnExists, createLogger } from '@ft-transcendence/common';

const dbConfig = createDatabaseConfig('tournament-service', 'tournaments', { enableTestMode: true });
const connection = createDatabaseConnection(dbConfig);
const logger = createLogger('TOURNAMENT-SERVICE-DB');

// For backward compatibility, export the db directly
export const db = connection.getDb();

/**
 * Initialize database tables for production
 */
/**
 * Initialize database tables for production
 */
export async function initializeDatabase(): Promise<void> {
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
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
	  UNIQUE(tournament_id, round, match_number)
    )
  `);
}

export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return promisifyDbRun(db, sql, params);
}

export async function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const result = await promisifyDbGet<T>(db, sql, params);
  return result ?? null;
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