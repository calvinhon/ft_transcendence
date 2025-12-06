import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { getTournamentRankFromBlockchain, isBlockchainAvailable, recordRank } from '../blockchain';

interface Tournament {
  id: number;
  current_participants: number;
  status: 'active' | 'finished';
  started_at: string | null;
  finished_at: string | null;
  winner_id: number | null;
}

interface TournamentParticipant {
  id: number;
  username: string;
  tournament_id: number;
  user_id: number;
  eliminated_at: string | null;
  final_rank: number | null;
}

interface TournamentMatch {
  id: number;
  tournament_id: number;
  round: number;
  match_number: number;
  player1_id: number | null;
  player2_id: number | null;
  winner_id: number | null;
  player1_score: number;
  player2_score: number;
  status: 'pending' | 'completed';
}

interface TournamentMatchWithNames extends TournamentMatch {
  player1_username: string | null;
  player2_username: string | null;
}

interface MatchResultBody {
  matchId: number;
  winner_username: string;
  player1Score: number;
  player2Score: number;
}

interface CreateFromPartyBody {
  participants: { id: number; username: string }[];
}

declare const __dirname: string;
const dbDir = path.join(__dirname, '../../database');
const dbPath = path.join(dbDir, 'tournaments.db');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  console.log('🏆 Creating database directory:', dbDir);
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('🏆 FATAL: Error opening database:', err);
    process.exit(1);  // Exit if can't open database
  }
  console.log('🏆 Connected to Tournament SQLite database at:', dbPath);
});

// Promisified database helpers
const dbRun = (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
};

const dbAll = <T>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};

// Initialize database tables - returns a promise
async function initializeDatabases(): Promise<void> {
  try {
    // Create tables in order, fail fast if any error
    await dbRun(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        current_participants INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        started_at DATETIME,
        finished_at DATETIME,
        winner_id INTEGER
      )
    `);
    console.log('🏆 tournaments table ready');

    await dbRun(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
  		username TEXT,
        tournament_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        eliminated_at DATETIME,
        final_rank INTEGER,
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
      )
    `);
    console.log('🏆 tournament_participants table ready');

    await dbRun(`
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
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
      )
    `);
    console.log('🏆 tournament_matches table ready');

    console.log('🏆 All database tables initialized successfully');
  } catch (err) {
    console.error('🏆 FATAL: Database initialization failed:', err);
    process.exit(1);  // Exit if tables can't be created
  }
}

// Route definitions
async function routes(fastify: FastifyInstance): Promise<void> {

  await initializeDatabases();

  // ✅ KEEP: Create tournament directly from party (main entry point)
  fastify.post<{
    Body: CreateFromPartyBody;
  }>('/create-from-party', async (request, reply) => {
    console.log('🏆 [Tournament API] create-from-party called');
    console.log('🏆 [Tournament API] Body:', JSON.stringify(request.body));
    
    try {
      const { participants } = request.body;

      if (![4, 8].includes(participants.length)) {
        console.log('🏆 [Tournament API] Error: Invalid count:', participants.length);
        return reply.status(400).send({ error: 'Need 4 or 8 players' });
      }

      console.log('🏆 [Tournament API] Creating tournament with', participants.length, 'players');
      
      const result = await dbRun(
        `INSERT INTO tournaments (
          current_participants, status, started_at
        ) VALUES (?, 'active', CURRENT_TIMESTAMP)`,
        [participants.length]
      );

      const tournamentId = result.lastID;
      console.log('🏆 [Tournament API] Created tournament ID:', tournamentId);

      // Add participants
      for (const participant of participants) {
        await dbRun(
          'INSERT INTO tournament_participants (tournament_id, user_id, username) VALUES (?, ?, ?)',
          [tournamentId, participant.id, participant.username]
        );
      }

	  const participantsData = await dbAll<{ user_id: number; username: string }>(
	  'SELECT user_id, username FROM tournament_participants WHERE tournament_id = ?',
	  [tournamentId]
	  );

      // Generate bracket matches
      await generateBracketMatches(tournamentId, participantsData.map(p => p.user_id));

      const matches = await dbAll<TournamentMatchWithNames>(
        `SELECT tm.*,
                tp1.username AS player1_username,
                tp2.username AS player2_username
         FROM tournament_matches tm
         LEFT JOIN tournament_participants tp1
           ON tp1.tournament_id = tm.tournament_id AND tp1.user_id = tm.player1_id
         LEFT JOIN tournament_participants tp2
           ON tp2.tournament_id = tm.tournament_id AND tp2.user_id = tm.player2_id
         WHERE tm.tournament_id = ?
         ORDER BY tm.round, tm.match_number`,
        [tournamentId]
      );

      // Get tournament data
      const tournament = await dbGet<Tournament>(
        'SELECT * FROM tournaments WHERE id = ?',
        [tournamentId]
      );

      return reply.send({
        success: true,
        tournament,
        matches
      });

    } catch (err) {
      console.error('🏆 [Tournament API] ERROR:', err);
      fastify.log.error(err, 'Create tournament from party error');
      return reply.status(500).send({ 
        error: 'Failed to create tournament',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  });

  fastify.get<{
    Params: { tournamentId: string };
  }>('/details/:tournamentId', async (request, reply) => {
    const { tournamentId } = request.params;
    
    try {
      const tournament = await dbGet<Tournament>(
        'SELECT * FROM tournaments WHERE id = ?',
        [tournamentId]
      );

      if (!tournament) {
        return reply.status(404).send({ error: 'Tournament not found' });
      }

      const participants = await dbAll<TournamentParticipant>(
        'SELECT * FROM tournament_participants WHERE tournament_id = ?',
        [tournamentId]
      );

      const matches = await dbAll<TournamentMatchWithNames>(
        `SELECT tm.*,
                tp1.username AS player1_username,
                tp2.username AS player2_username
         FROM tournament_matches tm
         LEFT JOIN tournament_participants tp1
           ON tp1.tournament_id = tm.tournament_id AND tp1.user_id = tm.player1_id
         LEFT JOIN tournament_participants tp2
           ON tp2.tournament_id = tm.tournament_id AND tp2.user_id = tm.player2_id
         WHERE tm.tournament_id = ?
         ORDER BY tm.round, tm.match_number`,
        [tournamentId]
      );

      return reply.send({ tournament, participants, matches });
    } catch (err) {
      fastify.log.error(err, 'Get tournament details error');
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  fastify.post<{
    Body: MatchResultBody;
  }>('/match/result', async (request, reply) => {
    const { matchId, winner_username, player1Score, player2Score } = request.body;

    if (!matchId || !winner_username || player1Score === undefined || player2Score === undefined)
      return reply.status(400).send({ error: 'Missing required fields' });

    const winnerParticipant = await dbGet<{ user_id: number }>(
      'SELECT user_id FROM tournament_participants WHERE tournament_id = (SELECT tournament_id FROM tournament_matches WHERE id = ?) AND username = ?',
      [matchId, winner_username]
    );
    if (!winnerParticipant)
      return reply.status(400).send({ error: 'Winner not found in tournament' });

    await dbRun(
      `UPDATE tournament_matches 
       SET winner_id = ?, player1_score = ?, player2_score = ?, status = 'completed' WHERE id = ?`,
      [winnerParticipant.user_id, player1Score, player2Score, matchId]
    );

    await checkAndCreateNextRound(fastify, matchId);

    // Find tournamentId for this match
    const meta = await dbGet<{ tournament_id: number }>(
      'SELECT tournament_id FROM tournament_matches WHERE id = ?',
      [matchId]
    );
    if (meta?.tournament_id)
      await recordRanksOnChain(meta.tournament_id);

    return reply.send({ message: 'Match result updated successfully' });
  });

  fastify.get<{
    Params: { matchId: string };
  }>('/match/:matchId', async (request, reply) => {
    const { matchId } = request.params;

    try {
      const match = await dbGet<TournamentMatch>(
        'SELECT * FROM tournament_matches WHERE id = ?',
        [matchId]
      );

      if (!match) {
        return reply.status(404).send({ error: 'Match not found' });
      }

      return reply.send(match);
    } catch (err) {
      fastify.log.error(err, 'Get match error');
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  fastify.get<{
    Params: { userId: string };
  }>('/user/:userId', async (request, reply) => {
    const { userId } = request.params;

    try {
      const tournaments = await dbAll(
        `SELECT t.*, tp.eliminated_at, tp.final_rank
         FROM tournaments t 
         JOIN tournament_participants tp ON t.id = tp.tournament_id 
         WHERE tp.user_id = ? 
         ORDER BY t.id DESC`,
        [userId]
      );

      return reply.send(tournaments);
    } catch (err) {
      fastify.log.error(err, 'Get user tournaments error');
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // ✅ KEEP: Get user rankings
  fastify.get<{
    Params: { userId: string };
  }>('/user/:userId/rankings', async (request, reply) => {
    const { userId } = request.params;

    try {
      const tournaments = await dbAll<any>(
        `SELECT 
          t.id as tournament_id,
          t.finished_at,
          t.status,
          t.winner_id,
          t.current_participants,
          tp.final_rank
         FROM tournaments t
         INNER JOIN tournament_participants tp ON t.id = tp.tournament_id
         WHERE tp.user_id = ?
         ORDER BY t.id DESC
         LIMIT 20`,
        [userId]
      );

      const rankings = tournaments.map(t => ({
        tournamentId: t.tournament_id,
        date: t.finished_at,
        rank: t.final_rank || '--',
        totalParticipants: t.current_participants,
        status: t.status,
        isWinner: t.winner_id === parseInt(userId)
      }));

      return reply.send(rankings);
    } catch (err) {
      fastify.log.error(err, 'Get user rankings error');
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  async function recordRanksOnChain(tournamentId: number): Promise<void> {
  const tournament = await dbGet<Tournament>(
    'SELECT * FROM tournaments WHERE id = ? AND status = "finished"',
    [tournamentId]
  );
  if (!tournament) throw new Error('Finished tournament not found');

  const participants = await dbAll<{
    user_id: number;
    username: string;
    final_rank: number | null;
    wallet_address: string | null;
  }>(
    `SELECT tp.user_id, tp.username, tp.final_rank, u.wallet_address
     FROM tournament_participants tp
     LEFT JOIN users u ON u.id = tp.user_id
     WHERE tp.tournament_id = ?
     ORDER BY COALESCE(tp.final_rank, 999) ASC`,
    [tournamentId]
  );

  const blockchainAvailable = await isBlockchainAvailable();
  if (!blockchainAvailable) throw new Error('Blockchain service unavailable');

  const txHashes: string[] = [];

  for (const p of participants) {
    const rank = p.final_rank ?? 0;
    if (!rank || !p.wallet_address) {
      fastify.log.warn(
        { userId: p.user_id, username: p.username },
        'Skipping on-chain record: missing rank or wallet'
      );
      continue;
    }
    try {
      const tx = await recordRank(tournamentId, p.wallet_address, rank);
      if (tx.txHash) txHashes.push(tx.txHash);
      console.log(`[Blockchain] Recorded rank ${rank} for ${p.wallet_address}. txHash=${tx.txHash ?? 'n/a'}`);
    } catch (e: any) {
      fastify.log.error(
        { userId: p.user_id, username: p.username, error: e?.message },
        'Failed to record rank on-chain'
      );
    }
    console.log(`Tournament ranks recorded on blockchain. tx count=${txHashes.length}`);
  }
}

  async function generateBracketMatches(tournamentId: number, participants: number[]): Promise<TournamentMatch[]> {
    const matches: TournamentMatch[] = [];
    
    // Shuffle for random matchups
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    
    // Calculate total rounds needed
    const totalRounds = Math.ceil(Math.log2(shuffled.length));  // Use Math.ceil
    
    // Create first round matches
    for (let i = 0; i < shuffled.length; i += 2) {
      const result = await dbRun(
        `INSERT INTO tournament_matches (
          tournament_id, round, match_number, 
          player1_id, player2_id, status
        ) VALUES (?, 1, ?, ?, ?, 'pending')`,
        [tournamentId, Math.floor(i / 2) + 1, shuffled[i], shuffled[i + 1]]
      );
      
      matches.push({
        id: result.lastID,
        tournament_id: tournamentId,
        round: 1,
        match_number: Math.floor(i / 2) + 1,
        player1_id: shuffled[i],
        player2_id: shuffled[i + 1],
        winner_id: null,
        player1_score: 0,
        player2_score: 0,
        status: 'pending',
      });
    }
    
    if (shuffled.length === 2) {
      return matches;
    }
    
    let matchesInRound = Math.floor(shuffled.length / 4);
    for (let round = 2; round <= totalRounds; round++) {
      for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
        const result = await dbRun(
          `INSERT INTO tournament_matches (
            tournament_id, round, match_number, 
            player1_id, player2_id, status
          ) VALUES (?, ?, ?, NULL, NULL, 'pending')`,
          [tournamentId, round, matchNum]
        );
        
        matches.push({
          id: result.lastID,
          tournament_id: tournamentId,
          round: round,
          match_number: matchNum,
          player1_id: null,
          player2_id: null,
          winner_id: null,
          player1_score: 0,
          player2_score: 0,
          status: 'pending',
        });
      }
      matchesInRound = Math.max(1, Math.floor(matchesInRound / 2));  // Prevent 0
    }
    
    return matches;
  }

  async function checkAndCreateNextRound(fastify: FastifyInstance, matchId: number): Promise<void> {
  try {
    const match = await dbGet<TournamentMatch>(
      'SELECT * FROM tournament_matches WHERE id = ?',
      [matchId]
    );

    if (!match) return;

    // Check if all matches in current round are completed
    const incompleteMatches = await dbAll<TournamentMatch>(
      'SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? AND status != "completed"',
      [match.tournament_id, match.round]
    );

    if (incompleteMatches.length > 0) return;

    // All matches completed, get winners
    const completedMatches = await dbAll<{ winner_id: number; match_number: number }>(
      'SELECT winner_id, match_number FROM tournament_matches WHERE tournament_id = ? AND round = ? ORDER BY match_number',
      [match.tournament_id, match.round]
    );

    if (completedMatches.length === 1) {
      await dbRun(
        'UPDATE tournaments SET status = "finished", finished_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?',
        [match.winner_id, match.tournament_id]
      );

      await dbRun(
        'UPDATE tournament_participants SET final_rank = 1 WHERE tournament_id = ? AND user_id = ?',
        [match.tournament_id, match.winner_id]
      );

      fastify.log.info({ tournamentId: match.tournament_id, winner_username: match.winner_id }, 'Tournament finished');
      return;
    }

    // Create next round matches
    const nextRound = match.round + 1;
    for (let i = 0; i < completedMatches.length; i += 2) {
      if (i + 1 < completedMatches.length) {
        await dbRun(
          `UPDATE tournament_matches 
           SET player1_id = ?, player2_id = ? 
           WHERE tournament_id = ? AND round = ? AND match_number = ?`,
          [
            completedMatches[i].winner_id,
            completedMatches[i + 1].winner_id,
            match.tournament_id,
            nextRound,
            Math.floor(i / 2) + 1
          ]
        );
      }
    }

    fastify.log.info({ tournamentId: match.tournament_id, nextRound }, 'Created next round matches');
    } catch (err) {
      fastify.log.error(err, 'Check and create next round error');
    }
  }
}

export default routes;