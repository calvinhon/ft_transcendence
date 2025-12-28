// game-service/src/routes/modules/database.ts
import { createDatabaseConfig, createDatabaseConnection, promisifyDbRun, createLogger } from '@ft-transcendence/common';

const dbConfig = createDatabaseConfig('game-service', 'games');
const connection = createDatabaseConnection(dbConfig);
const logger = createLogger('GAME-SERVICE-DB');

// For backward compatibility, export the db directly
export const db = connection.getDb();

// Initialize database tables
async function initializeDatabase(): Promise<void> {
  try {
    // Create games table with support for arcade mode and tournament tracking
    await promisifyDbRun(db, `
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1_id INTEGER NOT NULL,
        player2_id INTEGER NOT NULL,
        player1_score INTEGER DEFAULT 0,
        player2_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        winner_id INTEGER,
        game_mode TEXT DEFAULT 'campaign',
        team1_players TEXT,
        team2_players TEXT,
        tournament_id INTEGER,
        tournament_match_id INTEGER
      )
    `);
  } catch (error) {
    logger.error('Error initializing game-service database:', error);
    throw error;
  }
}

// Initialize the database
initializeDatabase().catch((error) => {
  logger.error('Failed to initialize database:', error);
  process.exit(1);
});