// tournament-service/tests/setup.ts
import { FastifyInstance } from 'fastify';
import sqlite3 from 'sqlite3';
import { createLogger } from '@ft-transcendence/common';

const logger = createLogger('TOURNAMENT-SERVICE-TEST');

// Use in-memory database for tests
export const testDb = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    logger.error('Error opening test database:', err);
  } else {
    logger.info('Connected to test SQLite database');
    initializeTestTables();
  }
});

// Setup test database
export async function setupTestDatabase(): Promise<void> {
  // Wait for database to be ready
  await new Promise(resolve => setTimeout(resolve, 100));
  // Tables are already created in initializeTestTables
  // Just ensure they're clean
  await cleanupTestDatabase();
}

// Clean up test database
export async function cleanupTestDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    testDb.serialize(() => {
      testDb.run(`DELETE FROM tournament_matches`, (err) => {
        if (err) return reject(err);
        testDb.run(`DELETE FROM tournament_participants`, (err) => {
          if (err) return reject(err);
          testDb.run(`DELETE FROM tournaments`, (err) => {
            if (err) return reject(err);
            testDb.run(`DELETE FROM sqlite_sequence WHERE name IN ('tournaments', 'tournament_participants', 'tournament_matches')`, (err) => {
              if (err) return reject(err);
              resolve();
            });
          });
        });
      });
    });
  });
}

// Initialize test database tables
function initializeTestTables(): void {
  testDb.serialize(() => {
    // Create tournaments table
    testDb.run(`
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
    testDb.run(`
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
    testDb.run(`
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
  });
}

// Promise wrapper for test database operations
export function testDbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    testDb.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

export function testDbGet<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    testDb.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve((row as T) || null);
      }
    });
  });
}

export function testDbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    testDb.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows as T[]);
      }
    });
  });
}

// Create test app
export async function createTestApp(): Promise<FastifyInstance> {
  const fastify = (await import('fastify')).default();

  // Register routes
  const routes = await import('../src/routes/index');
  await fastify.register(routes.default);

  return fastify;
}