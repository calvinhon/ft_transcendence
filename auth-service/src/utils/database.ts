// auth-service/src/utils/database.ts
import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/auth.db');

let db: sqlite3.Database | null = null;

function getDatabase(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
      }
    });
  }
  return db;
}

function initializeDatabase(): void {
  const database = getDatabase();
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  // Create password reset tokens table
  database.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      used BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
}

export function runQuery<T = any>(query: string, params: any[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(query, params, function(this: sqlite3.RunResult, err: Error | null) {
      if (err) {
        reject(err);
      } else {
        resolve(this as T);
      }
    });
  });
}

export function getQuery<T = any>(query: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(query, params, (err: Error | null, row: T | undefined) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}