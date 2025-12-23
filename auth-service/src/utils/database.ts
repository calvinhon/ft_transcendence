// auth-service/src/utils/database.ts
import { createDatabaseConfig, createDatabaseConnection, promisifyDbRun, promisifyDbGet, ensureColumnExists } from '@ft-transcendence/common';

const dbConfig = createDatabaseConfig('auth-service', 'auth', { lazyLoad: true });
const connection = createDatabaseConnection(dbConfig);

// For backward compatibility, create a getter that matches the original getDatabase pattern
let db: any = null;
function getDatabase(): any {
  if (!db) {
    db = connection.getDb();
  }
  return db;
}

async function initializeDatabase(): Promise<void> {
  try {
    // Create users table
    await promisifyDbRun(db, `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    // Ensure last_login column exists
    await ensureColumnExists(db, 'users', 'last_login', 'DATETIME');

    // Create password reset tokens table
    await promisifyDbRun(db, `
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
  } catch (error) {
    console.error('Error initializing auth-service database:', error);
    throw error;
  }
}

// Initialize the database
initializeDatabase().catch(console.error);

export function runQuery<T = any>(query: string, params: any[] = []): Promise<T> {
  return promisifyDbRun(getDatabase(), query, params) as Promise<T>;
}

export function getQuery<T = any>(query: string, params: any[] = []): Promise<T | undefined> {
  return promisifyDbGet<T>(getDatabase(), query, params);
}