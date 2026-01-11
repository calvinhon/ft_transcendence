// auth-service/src/utils/database.ts
import { createDatabaseConfig, createDatabaseConnection, promisifyDbRun, promisifyDbGet, ensureColumnExists, createLogger } from '@ft-transcendence/common';

const dbConfig = createDatabaseConfig('auth-service', 'auth', { lazyLoad: true });
const connection = createDatabaseConnection(dbConfig);
const logger = createLogger('AUTH-SERVICE-DB');

// For backward compatibility, create a getter that matches the original getDatabase pattern
let db: any = null;
function getDatabase(): any {
  if (!db) {
    db = connection.getDb();
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  try {
    // Initialize database connection
    db = connection.getDb();

    // Create users table
    await promisifyDbRun(getDatabase(), `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        oauth_provider TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    logger.info('Connected to AUTH_SERVICE SQLite database');
  } catch (error: any) {
    if (error.code === 'SQLITE_READONLY') {
      logger.error('🚨 CRITICAL ERROR: Database is READ-ONLY. Please check filesystem permissions for the database file and directory.');
    } else {
      logger.error('Error initializing auth-service database:', error);
    }
    throw error;
  }
}

export function runQuery<T = any>(query: string, params: any[] = []): Promise<T> {
  return promisifyDbRun(getDatabase(), query, params) as Promise<T>;
}

export function getQuery<T = any>(query: string, params: any[] = []): Promise<T | undefined> {
  return promisifyDbGet<T>(getDatabase(), query, params);
}