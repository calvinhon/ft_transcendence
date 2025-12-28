// game-service/src/routes/modules/database.ts
import { createDatabaseConfig, createDatabaseConnection, promisifyDbRun, createLogger } from '@ft-transcendence/common';

const dbConfig = createDatabaseConfig('game-service', 'games');
const connection = createDatabaseConnection(dbConfig);
const logger = createLogger('GAME-SERVICE-DB');

// For backward compatibility, export the db directly
export const db: any = connection.getDb();

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

    // Migrate existing database: Add new columns if they don't exist
    // Using raw db.all/run here to preserve original logic flow
    db.all("PRAGMA table_info(games)", (err: any, columns: any[]) => {
      if (!err && columns) {
        const columnNames = columns.map(col => col.name);

        // Add game_mode column if it doesn't exist
        if (!columnNames.includes('game_mode')) {
          logger.info('Adding game_mode column...');
          db.run("ALTER TABLE games ADD COLUMN game_mode TEXT DEFAULT 'campaign'", (err: any) => {
            if (err) logger.error('Failed to add game_mode column:', err);
            else logger.info('game_mode column added');
          });
        }

        // Add team1_players column if it doesn't exist
        if (!columnNames.includes('team1_players')) {
          logger.info('Adding team1_players column...');
          db.run("ALTER TABLE games ADD COLUMN team1_players TEXT", (err: any) => {
            if (err) logger.error('Failed to add team1_players column:', err);
            else logger.info('team1_players column added');
          });
        }

        // Add team2_players column if it doesn't exist
        if (!columnNames.includes('team2_players')) {
          logger.info('Adding team2_players column...');
          db.run("ALTER TABLE games ADD COLUMN team2_players TEXT", (err: any) => {
            if (err) logger.error('Failed to add team2_players column:', err);
            else logger.info('team2_players column added');
          });
        }

        // Add tournament_id column if it doesn't exist
        if (!columnNames.includes('tournament_id')) {
          logger.info('Adding tournament_id column...');
          db.run("ALTER TABLE games ADD COLUMN tournament_id INTEGER", (err: any) => {
            if (err) logger.error('Failed to add tournament_id column:', err);
            else logger.info('tournament_id column added');
          });
        }

        // Add tournament_match_id column if it doesn't exist
        if (!columnNames.includes('tournament_match_id')) {
          logger.info('Adding tournament_match_id column...');
          db.run("ALTER TABLE games ADD COLUMN tournament_match_id INTEGER", (err: any) => {
            if (err) logger.error('Failed to add tournament_match_id column:', err);
            else logger.info('tournament_match_id column added');
          });
        }
      }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS game_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games (id)
      )
    `);

    // Friends Table
    db.run(`
      CREATE TABLE IF NOT EXISTS friends (
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, friend_id),
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (friend_id) REFERENCES users (id)
      )
    `, (err: any) => {
      if (err) logger.error('Error creating friends table:', err);
      else logger.info('Friends table ready');
    });

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