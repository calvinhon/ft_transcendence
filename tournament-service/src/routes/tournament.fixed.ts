import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import sqlite3 from 'sqlite3';
import path from 'path';

// Type definitions
interface Tournament {
  id: number;
  name: string;
  description: string | null;
  max_participants: number;
  current_participants: number;
  status: 'open' | 'active' | 'finished' | 'full';
  created_by: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  winner_id: number | null;
}

interface TournamentParticipant {
  id: number;
  tournament_id: number;
  joined_at: string;
  eliminated_at: string | null;
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
  played_at: string | null;
}

interface CreateTournamentBody {
  name: string;
  description?: string;
  maxParticipants?: number;
  createdBy: number;
}

interface JoinTournamentBody {
  tournamentId: number;
  userId: number;
}

interface MatchResultBody {
  matchId: number;
  winnerId: number;
  player1Score: number;
  player2Score: number;
}

interface TournamentQuery {
  status?: string;
  limit?: string;
}

interface TournamentDetails {
  tournament: Tournament;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
}

interface MatchToCreate {
  player1: number;
  player2: number;
  round: number;
  matchNumber: number;
}

declare const __dirname: string;
const dbPath = path.join(__dirname, '../../database/tournaments.db');

// Initialize database
const db = new sqlite3.Database(dbPath);
db.on('open', () => {
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
      FOREIGN KEY (tournament_id) REFERENCES tournaments (id),
      UNIQUE(tournament_id, user_id)
    )
  `);
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
});

// Route definitions
async function routes(fastify: FastifyInstance): Promise<void> {
  // Create tournament
  fastify.post<{
    Body: CreateTournamentBody;
  }>('/create', async (request: FastifyRequest<{ Body: CreateTournamentBody }>, reply: FastifyReply) => {
    const { name, description, maxParticipants, createdBy } = request.body;
    if (!name || !createdBy) {
      return reply.status(400).send({ error: 'Name and creator required' });
    }
    return new Promise<void>((resolve, reject) => {
      db.run(
        'INSERT INTO tournaments (name, description, max_participants, created_by) VALUES (?, ?, ?, ?)',
        [name, description || '', maxParticipants || 8, createdBy],
        function(this: sqlite3.RunResult, err: Error | null) {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send({ 
              message: 'Tournament created successfully',
              tournamentId: this.lastID
            });
            resolve();
          }
        }
      );
    });
  });

  // Join tournament
  fastify.post<{
    Body: JoinTournamentBody;
  }>('/join', async (request: FastifyRequest<{ Body: JoinTournamentBody }>, reply: FastifyReply) => {
    const { tournamentId, userId } = request.body;
    if (!tournamentId || !userId) {
      return reply.status(400).send({ error: 'Tournament ID and User ID required' });
    }
    return new Promise<void>((resolve, reject) => {
      // First check if tournament exists and is open
      db.get(
        'SELECT * FROM tournaments WHERE id = ? AND status = "open"',
        [tournamentId],
        (err: Error | null, tournament: Tournament) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else if (!tournament) {
            reply.status(404).send({ error: 'Tournament not found or not open' });
            resolve();
          } else if (tournament.current_participants >= tournament.max_participants) {
            reply.status(409).send({ error: 'Tournament is full' });
            resolve();
          } else {
            // Add participant
            db.run(
              'INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)',
              [tournamentId, userId],
              function(this: sqlite3.RunResult, err: Error | null) {
                if (err) {
                  if ((err as any).code === 'SQLITE_CONSTRAINT') {
                    reply.status(409).send({ error: 'Already joined this tournament' });
                  } else {
                    reply.status(500).send({ error: 'Database error' });
                  }
                  reject(err);
                } else {
                  // Update participant count
                  db.run(
                    'UPDATE tournaments SET current_participants = current_participants + 1 WHERE id = ?',
                    [tournamentId],
                    (err: Error | null) => {
                      if (!err) {
                        reply.send({ message: 'Successfully joined tournament' });
                      }
                      resolve();
                    }
                  );
                }
              }
            );
          }
        }
      );
    });
  });

  // Start tournament
  fastify.post<{
    Params: { tournamentId: string };
  }>('/start/:tournamentId', async (request: FastifyRequest<{ Params: { tournamentId: string } }>, reply: FastifyReply) => {
    const { tournamentId } = request.params;
    return new Promise<void>((resolve, reject) => {
      db.get(
        'SELECT * FROM tournaments WHERE id = ? AND status = "open"',
        [tournamentId],
        (err: Error | null, tournament: Tournament) => {
          if (err || !tournament) {
            reply.status(404).send({ error: 'Tournament not found' });
            reject(err);
            return;
          }
          if (tournament.current_participants < 2) {
            reply.status(400).send({ error: 'Need at least 2 participants' });
            resolve();
            return;
          }
          db.all(
            'SELECT user_id FROM tournament_participants WHERE tournament_id = ? ORDER BY joined_at',
            [tournamentId],
            (err: Error | null, participants: { user_id: number }[]) => {
              if (err) {
                reply.status(500).send({ error: 'Database error' });
                reject(err);
                return;
              }
              const matches: MatchToCreate[] = [];
              for (let i = 0; i < participants.length; i += 2) {
                if (i + 1 < participants.length) {
                  matches.push({
                    player1: participants[i].user_id,
                    player2: participants[i + 1].user_id,
                    round: 1,
                    matchNumber: Math.floor(i / 2) + 1
                  });
                }
              }
              const insertPromises = matches.map(match => {
                return new Promise<void>((resolveMatch, rejectMatch) => {
                  db.run(
                    'INSERT INTO tournament_matches (tournament_id, round, match_number, player1_id, player2_id) VALUES (?, ?, ?, ?, ?)',
                    [tournamentId, match.round, match.matchNumber, match.player1, match.player2],
                    (err: Error | null) => {
                      if (err) rejectMatch(err);
                      else resolveMatch();
                    }
                  );
                });
              });
              Promise.all(insertPromises).then(() => {
                db.run(
                  'UPDATE tournaments SET status = "active", started_at = CURRENT_TIMESTAMP WHERE id = ?',
                  [tournamentId],
                  (err: Error | null) => {
                    if (err) {
                      reply.status(500).send({ error: 'Failed to start tournament' });
                    } else {
                      reply.send({ message: 'Tournament started successfully' });
                    }
                    resolve();
                  }
                );
              }).catch(err => {
                reply.status(500).send({ error: 'Failed to create matches' });
                reject(err);
              });
            }
          );
        }
      );
    });
  });

  // Get tournament details
  fastify.get<{
    Params: { tournamentId: string };
  }>('/details/:tournamentId', async (request: FastifyRequest<{ Params: { tournamentId: string } }>, reply: FastifyReply) => {
    const { tournamentId } = request.params;
    return new Promise<void>((resolve, reject) => {
      db.get(
        'SELECT * FROM tournaments WHERE id = ?',
        [tournamentId],
        (err: Error | null, tournament: Tournament) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else if (!tournament) {
            reply.status(404).send({ error: 'Tournament not found' });
            resolve();
          } else {
            db.all(
              `SELECT tp.user_id, tp.joined_at, tp.eliminated_at FROM tournament_participants tp WHERE tp.tournament_id = ?`,
              [tournamentId],
              (err: Error | null, participants: TournamentParticipant[]) => {
                if (err) {
                  reply.status(500).send({ error: 'Database error' });
                  reject(err);
                } else {
                  db.all(
                    'SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round, match_number',
                    [tournamentId],
                    (err: Error | null, matches: TournamentMatch[]) => {
                      if (err) {
                        reply.status(500).send({ error: 'Database error' });
                        reject(err);
                      } else {
                        const details: TournamentDetails = {
                          tournament,
                          participants,
                          matches
                        };
                        reply.send(details);
                        resolve();
                      }
                    }
                  );
                }
              }
            );
          }
        }
      );
    });
  });

  // Get all tournaments (mock data)
  fastify.get<{
    Querystring: TournamentQuery;
  }>('/list', async (request: FastifyRequest<{ Querystring: TournamentQuery }>, reply: FastifyReply) => {
    const { status, limit = '50' } = request.query;
    const mockTournaments: Tournament[] = [
      // ...mock data as in original file...
    ];
    let filteredTournaments = mockTournaments;
    if (status) {
      filteredTournaments = mockTournaments.filter(t => t.status === status);
    }
    const limitedTournaments = filteredTournaments.slice(0, parseInt(limit));
    reply.send(limitedTournaments);
  });

  // Update match result
  fastify.post<{
    Body: MatchResultBody;
  }>('/match/result', async (request: FastifyRequest<{ Body: MatchResultBody }>, reply: FastifyReply) => {
    const { matchId, winnerId, player1Score, player2Score } = request.body;
    if (!matchId || !winnerId || player1Score === undefined || player2Score === undefined) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    return new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE tournament_matches SET winner_id = ?, player1_score = ?, player2_score = ?, status = "completed", played_at = CURRENT_TIMESTAMP WHERE id = ?',
        [winnerId, player1Score, player2Score, matchId],
        function(this: sqlite3.RunResult, err: Error | null) {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            checkAndCreateNextRound(matchId);
            reply.send({ message: 'Match result updated successfully' });
            resolve();
          }
        }
      );
    });
  });

  function checkAndCreateNextRound(matchId: number): void {
    db.get(
      'SELECT * FROM tournament_matches WHERE id = ?',
      [matchId],
      (err: Error | null, match: TournamentMatch) => {
        if (err || !match) return;
        db.all(
          'SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? AND status != "completed"',
          [match.tournament_id, match.round],
          (err: Error | null, incompleteMatches: TournamentMatch[]) => {
            if (err || incompleteMatches.length > 0) return;
            db.all(
              'SELECT winner_id FROM tournament_matches WHERE tournament_id = ? AND round = ? ORDER BY match_number',
              [match.tournament_id, match.round],
              (err: Error | null, winners: { winner_id: number }[]) => {
                if (err) return;
                if (winners.length === 1) {
                  db.run(
                    'UPDATE tournaments SET status = "finished", finished_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?',
                    [winners[0].winner_id, match.tournament_id]
                  );
                } else if (winners.length > 1) {
                  const nextRound = match.round + 1;
                  const nextMatches: MatchToCreate[] = [];
                  for (let i = 0; i < winners.length; i += 2) {
                    if (i + 1 < winners.length) {
                      nextMatches.push({
                        player1: winners[i].winner_id,
                        player2: winners[i + 1].winner_id,
                        round: nextRound,
                        matchNumber: Math.floor(i / 2) + 1
                      });
                    }
                  }
                  nextMatches.forEach(nextMatch => {
                    db.run(
                      'INSERT INTO tournament_matches (tournament_id, round, match_number, player1_id, player2_id) VALUES (?, ?, ?, ?, ?)',
                      [match.tournament_id, nextMatch.round, nextMatch.matchNumber, nextMatch.player1, nextMatch.player2]
                    );
                  });
                }
              }
            );
          }
        );
      }
    );
  }

  // Get user tournaments
  fastify.get<{
    Params: { userId: string };
  }>('/user/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;
    return new Promise<void>((resolve, reject) => {
      db.all(
        `SELECT t.*, tp.joined_at, tp.eliminated_at FROM tournaments t JOIN tournament_participants tp ON t.id = tp.tournament_id WHERE tp.user_id = ? ORDER BY t.created_at DESC`,
        [userId],
        (err: Error | null, tournaments: (Tournament & { joined_at: string; eliminated_at: string | null })[]) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send(tournaments);
            resolve();
          }
        }
      );
    });
  });
}

export default routes;
