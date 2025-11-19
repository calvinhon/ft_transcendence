// tournament-service/src/tournament-logic.ts
import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { MatchToCreate } from './types.js';

export const dbPath = path.join(__dirname, '../database/tournaments.db');

// Initialize database
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to Tournaments SQLite database');

    // Create tournaments table
    db.run(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        max_participants INTEGER DEFAULT 8,
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
    db.run(`
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
    db.run(`ALTER TABLE tournament_participants ADD COLUMN final_rank INTEGER`, (err: any) => {
      // Ignore error if column already exists - this is expected for new databases
    });

    // Create tournament matches table
    db.run(`
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
});

/**
 * Generate single-elimination bracket for tournament
 * Supports any number of participants with byes for non-power-of-2
 * @param participantIds Array of user IDs
 * @returns Array of matches to create
 */
export function generateBracket(participantIds: number[]): MatchToCreate[] {
  const matches: MatchToCreate[] = [];
  const numParticipants = participantIds.length;

  if (numParticipants < 2) {
    return matches;
  }

  // Calculate next power of 2 (bracket size)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numParticipants)));
  const numByes = bracketSize - numParticipants;

  console.log(`[Tournament Bracket] Participants: ${numParticipants}, Bracket Size: ${bracketSize}, Byes: ${numByes}`);

  // First round: pair up participants, leaving byes (null) for missing players
  const firstRoundPlayers: (number | null)[] = [...participantIds];

  // Add null (bye) slots at strategic positions
  // Byes should be distributed evenly (typically at top and bottom of bracket)
  for (let i = 0; i < numByes; i++) {
    // Insert byes at even intervals
    const insertPos = Math.floor((i * firstRoundPlayers.length) / numByes);
    firstRoundPlayers.splice(insertPos, 0, null);
  }

  // Create first round matches
  let matchNumber = 1;
  for (let i = 0; i < firstRoundPlayers.length; i += 2) {
    const player1 = firstRoundPlayers[i];
    const player2 = firstRoundPlayers[i + 1];

    // Only create match if at least one player exists
    // If one player is null (bye), the other advances automatically
    if (player1 !== null || player2 !== null) {
      matches.push({
        player1: player1 || 0, // 0 represents bye
        player2: player2 || 0,
        round: 1,
        matchNumber: matchNumber++
      });
    }
  }

  console.log(`[Tournament Bracket] Generated ${matches.length} matches for round 1`);

  return matches;
}