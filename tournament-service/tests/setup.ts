// tournament-service/tests/setup.ts
import { FastifyInstance } from 'fastify';
import { db } from '../src/database';

// Setup test database
export async function setupTestDatabase(): Promise<void> {
  // Create tables
  await new Promise<void>((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        max_participants INTEGER DEFAULT 8,
        current_participants INTEGER DEFAULT 0,
        status TEXT DEFAULT 'open',
        created_by INTEGER NOT NULL,
        winner_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        finished_at DATETIME
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await new Promise<void>((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        username TEXT,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        final_rank INTEGER,
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await new Promise<void>((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tournament_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        round INTEGER NOT NULL,
        match_number INTEGER NOT NULL,
        player1_id INTEGER,
        player2_id INTEGER,
        winner_id INTEGER,
        player1_score INTEGER,
        player2_score INTEGER,
        status TEXT DEFAULT 'pending',
        played_at DATETIME,
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Clean up test database
export async function cleanupTestDatabase(): Promise<void> {
  const tables = ['tournament_matches', 'tournament_participants', 'tournaments'];

  for (const table of tables) {
    await new Promise<void>((resolve, reject) => {
      db.run(`DELETE FROM ${table}`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Create test app
export async function createTestApp(): Promise<FastifyInstance> {
  const fastify = (await import('fastify')).default();

  // Register routes
  await fastify.register(require('../src/routes/index').default);

  return fastify;
}