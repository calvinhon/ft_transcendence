// packages/common/src/database.ts
import sqlite3 from 'sqlite3';
import path from 'path';
import { createLogger } from './logger';

export interface DatabaseConfig {
  dbPath: string;
  serviceName: string;
  enableTestMode?: boolean;
  lazyLoad?: boolean;
}

export interface DatabaseConnection {
  getDb: () => sqlite3.Database;
  isConnected: boolean;
  close: () => Promise<void>;
}

/**
 * Promisify sqlite3 run operation
 */
export function promisifyDbRun(db: sqlite3.Database, sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
	
    db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

/**
 * Promisify sqlite3 get operation
 */
export function promisifyDbGet<T>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: T) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Promisify sqlite3 all operation
 */
export function promisifyDbAll<T>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: T[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Create a database connection with consistent patterns
 */
export function createDatabaseConnection(config: DatabaseConfig): DatabaseConnection {
  const logger = createLogger(config.serviceName);

  // Determine if we're in test mode
  const isTest = config.enableTestMode && (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined);
  const actualDbPath = isTest ? ':memory:' : config.dbPath;

  if (config.lazyLoad) {
    // Lazy loading pattern (like auth-service)
    let db: sqlite3.Database | null = null;

    const getDatabase = (): sqlite3.Database => {
      if (!db) {
        db = new sqlite3.Database(actualDbPath, (err) => {
          if (err) {
            logger.error('Error opening database:', err);
            throw err;
          } else {
            logger.info(`Connected to ${isTest ? 'test' : config.serviceName} SQLite database`);
          }
        });
      }
      return db;
    };

    return {
      getDb: getDatabase,
      isConnected: false, // Lazy loaded, so we don't know until first access
      close: async () => {
        if (db) {
          return new Promise<void>((resolve, reject) => {
            db!.close((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }
    } as DatabaseConnection;
  } else {
    // Direct connection pattern (like other services)
    const db = new sqlite3.Database(actualDbPath, (err) => {
      if (err) {
        logger.error('Error opening database:', err);
        throw err;
      } else {
        logger.info(`Connected to ${isTest ? 'test' : config.serviceName} SQLite database`);
      }
    });

    return {
      getDb: () => db,
      isConnected: true,
      close: async () => {
        return new Promise<void>((resolve, reject) => {
          db.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    } as DatabaseConnection;
  }
}

/**
 * Helper function to create database config for a service
 */
export function createDatabaseConfig(serviceName: string, dbFileName: string, options: { enableTestMode?: boolean; lazyLoad?: boolean } = {}): DatabaseConfig {
  // Use path relative to the service's working directory
  const dbPath = path.join(process.cwd(), 'database', `${dbFileName}.db`);

  return {
    dbPath,
    serviceName: serviceName.toUpperCase().replace('-', '_'),
    enableTestMode: options.enableTestMode ?? true,
    lazyLoad: options.lazyLoad ?? false
  };
}

/**
 * Common database error handler
 */
export function handleDatabaseError(logger: ReturnType<typeof createLogger>, operation: string, error: Error): void {
  logger.error(`Database error during ${operation}:`, error);
}

/**
 * Ensure a column exists in a table (for migrations)
 */
export async function ensureColumnExists(db: sqlite3.Database, tableName: string, columnName: string, columnType: string): Promise<void> {
  const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
  try {
    await promisifyDbRun(db, sql);
  } catch (err: any) {
    // Ignore "duplicate column" errors
    if (!err.message.includes('duplicate column')) {
      throw err;
    }
  }
}