// tournament-service/src/routes/tournament.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import sqlite3 from 'sqlite3';
import path from 'path';
import { recordTournamentOnBlockchain, isBlockchainAvailable } from '../blockchain';

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
  user_id: number;
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

const dbPath = path.join(__dirname, '../../database/tournaments.db');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
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
  }
});

/**
 * Generate single-elimination bracket for tournament
 * Supports any number of participants with byes for non-power-of-2
 * @param participantIds Array of user IDs
 * @returns Array of matches to create
 */
function generateBracket(participantIds: number[]): MatchToCreate[] {
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
      // Get tournament and participants
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

          // Get participants
          db.all(
            'SELECT user_id FROM tournament_participants WHERE tournament_id = ? ORDER BY joined_at',
            [tournamentId],
            (err: Error | null, participants: { user_id: number }[]) => {
              if (err) {
                reply.status(500).send({ error: 'Database error' });
                reject(err);
                return;
              }

              // Generate single-elimination bracket
              const matches = generateBracket(participants.map(p => p.user_id));

              // Insert matches into database
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
                // Update tournament status
                db.run(
                  'UPDATE tournaments SET status = "active", started_at = CURRENT_TIMESTAMP WHERE id = ?',
                  [tournamentId],
                  (err: Error | null) => {
                    if (err) {
                      reply.status(500).send({ error: 'Failed to start tournament' });
                      resolve();
                    } else {
                      // Auto-complete BYE matches (where player1_id = 0 or player2_id = 0)
                      db.run(
                        `UPDATE tournament_matches 
                         SET status = 'completed', 
                             winner_id = CASE 
                               WHEN player1_id = 0 THEN player2_id 
                               WHEN player2_id = 0 THEN player1_id 
                               ELSE winner_id 
                             END,
                             player1_score = CASE WHEN player1_id = 0 THEN 0 ELSE 0 END,
                             player2_score = CASE WHEN player2_id = 0 THEN 0 ELSE 0 END,
                             played_at = CURRENT_TIMESTAMP
                         WHERE tournament_id = ? 
                         AND (player1_id = 0 OR player2_id = 0)
                         AND status = 'pending'`,
                        [tournamentId],
                        (err: Error | null) => {
                          if (err) {
                            fastify.log.error(err, '[START] Failed to auto-complete BYE matches');
                          } else {
                            fastify.log.info('[START] Auto-completed BYE matches');
                            // Trigger next round creation for completed BYEs
                            db.get(
                              'SELECT id FROM tournament_matches WHERE tournament_id = ? AND round = 1 LIMIT 1',
                              [tournamentId],
                              (err: Error | null, match: any) => {
                                if (!err && match) {
                                  checkAndCreateNextRound(match.id);
                                }
                              }
                            );
                          }
                          
                          reply.send({ 
                            message: 'Tournament started successfully',
                            totalRounds: Math.ceil(Math.log2(participants.length)),
                            firstRoundMatches: matches.filter(m => m.round === 1).length
                          });
                          resolve();
                        }
                      );
                    }
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
            // Get participants
            db.all(
              `SELECT tp.user_id, tp.joined_at, tp.eliminated_at 
               FROM tournament_participants tp 
               WHERE tp.tournament_id = ?`,
              [tournamentId],
              (err: Error | null, participants: TournamentParticipant[]) => {
                if (err) {
                  reply.status(500).send({ error: 'Database error' });
                  reject(err);
                } else {
                  // Get matches
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

  // Get all tournaments (with mock data for testing)
  fastify.get<{
    Querystring: TournamentQuery;
  }>('/list', async (request: FastifyRequest<{ Querystring: TournamentQuery }>, reply: FastifyReply) => {
    const { status, limit = '50' } = request.query;

    // For now, return mock tournaments for testing
    // In a real system, this would query the actual database
    const mockTournaments: Tournament[] = [
      {
        id: 1,
        name: 'Weekly Championship',
        description: 'Join our weekly championship tournament! Winner takes glory and bragging rights.',
        max_participants: 8,
        current_participants: 3,
        status: 'open',
        created_by: 1,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        started_at: null,
        finished_at: null,
        winner_id: null
      },
      {
        id: 2,
        name: 'Speed Pong Masters',
        description: 'Fast-paced tournament for skilled players. Quick matches, intense competition!',
        max_participants: 16,
        current_participants: 7,
        status: 'open',
        created_by: 2,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        started_at: null,
        finished_at: null,
        winner_id: null
      },
      {
        id: 3,
        name: 'Beginner Friendly Cup',
        description: 'Perfect for newcomers! Learn the ropes in a friendly competitive environment.',
        max_participants: 8,
        current_participants: 2,
        status: 'open',
        created_by: 3,
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        started_at: null,
        finished_at: null,
        winner_id: null
      },
      {
        id: 4,
        name: 'Elite Tournament',
        description: 'For the most skilled players only. High stakes, ultimate bragging rights.',
        max_participants: 4,
        current_participants: 4,
        status: 'full',
        created_by: 4,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        started_at: null,
        finished_at: null,
        winner_id: null
      }
    ];

    // Filter by status if specified
    let filteredTournaments = mockTournaments;
    if (status) {
      filteredTournaments = mockTournaments.filter(t => t.status === status);
    }

    // Apply limit
    const limitedTournaments = filteredTournaments.slice(0, parseInt(limit));

    reply.send(limitedTournaments);
  });

  // Update match result
  fastify.post<{
    Body: MatchResultBody;
  }>('/match/result', async (request: FastifyRequest<{ Body: MatchResultBody }>, reply: FastifyReply) => {
    const { matchId, winnerId, player1Score, player2Score } = request.body;

    fastify.log.info({ matchId, winnerId, player1Score, player2Score }, '[MATCH RESULT] Received');

    if (!matchId || !winnerId || player1Score === undefined || player2Score === undefined) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    return new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE tournament_matches SET winner_id = ?, player1_score = ?, player2_score = ?, status = "completed", played_at = CURRENT_TIMESTAMP WHERE id = ?',
        [winnerId, player1Score, player2Score, matchId],
        function(this: sqlite3.RunResult, err: Error | null) {
          if (err) {
            fastify.log.error(err, '[MATCH RESULT] Database error');
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            fastify.log.info({ matchId, changes: this.changes }, '[MATCH RESULT] Updated match');
            // Check if we need to create next round matches
            checkAndCreateNextRound(matchId);
            reply.send({ message: 'Match result updated successfully' });
            resolve();
          }
        }
      );
    });
  });

  function checkAndCreateNextRound(matchId: number): void {
    fastify.log.info({ matchId }, '[CHECK NEXT ROUND] Starting check');
    
    // Get match details
    db.get(
      'SELECT * FROM tournament_matches WHERE id = ?',
      [matchId],
      (err: Error | null, match: TournamentMatch) => {
        if (err || !match) {
          fastify.log.error({ err, matchId }, '[CHECK NEXT ROUND] Failed to get match');
          return;
        }

        fastify.log.info({ tournamentId: match.tournament_id, round: match.round }, '[CHECK NEXT ROUND] Checking incomplete matches');

        // Check if all matches in current round are completed
        db.all(
          'SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? AND status != "completed"',
          [match.tournament_id, match.round],
          (err: Error | null, incompleteMatches: TournamentMatch[]) => {
            if (err) {
              fastify.log.error({ err }, '[CHECK NEXT ROUND] Failed to get incomplete matches');
              return;
            }

            fastify.log.info({ incompleteCount: incompleteMatches.length }, '[CHECK NEXT ROUND] Incomplete matches');

            if (incompleteMatches.length > 0) return;

            // All matches in round completed, create next round
            db.all(
              'SELECT id, match_number, player1_id, player2_id, winner_id FROM tournament_matches WHERE tournament_id = ? AND round = ? ORDER BY match_number ASC',
              [match.tournament_id, match.round],
              (err: Error | null, completedMatches: (TournamentMatch & { id: number; match_number: number; player1_id: number; player2_id: number; winner_id: number })[]) => {
                if (err) {
                  fastify.log.error({ err }, '[CHECK NEXT ROUND] Failed to get completed matches');
                  return;
                }

                fastify.log.info({ 
                  matchCount: completedMatches.length,
                  matches: completedMatches.map(m => ({ 
                    id: m.id, 
                    matchNum: m.match_number, 
                    p1: m.player1_id, 
                    p2: m.player2_id, 
                    winner: m.winner_id 
                  }))
                }, '[CHECK NEXT ROUND] Completed matches with winners');

                const winners = completedMatches.map(m => m.winner_id);

                if (winners.length === 1) {
                  // Tournament finished
                  fastify.log.info({ tournamentId: match.tournament_id, winnerId: winners[0] }, '[CHECK NEXT ROUND] Tournament finished');
                  db.run(
                    'UPDATE tournaments SET status = "finished", finished_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?',
                    [winners[0], match.tournament_id]
                  );
                } else if (winners.length > 1) {
                  // Create next round matches
                  const nextRound = match.round + 1;
                  const nextMatches: MatchToCreate[] = [];

                  fastify.log.info({ nextRound, winnerCount: winners.length, winners }, '[CHECK NEXT ROUND] Creating next round');

                  for (let i = 0; i < winners.length; i += 2) {
                    if (i + 1 < winners.length) {
                      nextMatches.push({
                        player1: winners[i],
                        player2: winners[i + 1],
                        round: nextRound,
                        matchNumber: Math.floor(i / 2) + 1
                      });
                      fastify.log.info({ 
                        matchNum: Math.floor(i / 2) + 1,
                        player1: winners[i], 
                        player2: winners[i + 1] 
                      }, '[CHECK NEXT ROUND] Created match pairing');
                    }
                  }

                  nextMatches.forEach(nextMatch => {
                    db.run(
                      'INSERT INTO tournament_matches (tournament_id, round, match_number, player1_id, player2_id) VALUES (?, ?, ?, ?, ?)',
                      [match.tournament_id, nextMatch.round, nextMatch.matchNumber, nextMatch.player1, nextMatch.player2],
                      function(this: sqlite3.RunResult, err: Error | null) {
                        if (err) {
                          fastify.log.error({ err }, '[CHECK NEXT ROUND] Failed to insert next match');
                        } else {
                          fastify.log.info({ matchId: this.lastID }, '[CHECK NEXT ROUND] Inserted next round match');
                        }
                      }
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
        `SELECT t.*, tp.joined_at, tp.eliminated_at
         FROM tournaments t
         JOIN tournament_participants tp ON t.id = tp.tournament_id
         WHERE tp.user_id = ?
         ORDER BY t.created_at DESC`,
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

  // Get tournament match by match ID
  fastify.get<{
    Params: { matchId: string };
  }>('/match/:matchId', async (request: FastifyRequest<{ Params: { matchId: string } }>, reply: FastifyReply) => {
    const { matchId } = request.params;

    return new Promise<void>((resolve, reject) => {
      db.get(
        'SELECT * FROM tournament_matches WHERE id = ?',
        [matchId],
        (err: Error | null, match: TournamentMatch) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else if (!match) {
            reply.status(404).send({ error: 'Match not found' });
            resolve();
          } else {
            reply.send(match);
            resolve();
          }
        }
      );
    });
  });

  // Record tournament result on blockchain
  fastify.post<{
    Body: { tournamentId: number; winnerId: number };
  }>('/blockchain/record', async (request: FastifyRequest<{ Body: { tournamentId: number; winnerId: number } }>, reply: FastifyReply) => {
    const { tournamentId, winnerId } = request.body;

    if (!tournamentId || !winnerId) {
      return reply.status(400).send({ error: 'Tournament ID and winner ID required' });
    }

    return new Promise<void>((resolve, reject) => {
      // Get tournament details
      db.get(
        'SELECT * FROM tournaments WHERE id = ? AND status = "finished"',
        [tournamentId],
        async (err: Error | null, tournament: Tournament) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
            return;
          }
          if (!tournament) {
            reply.status(404).send({ error: 'Finished tournament not found' });
            resolve();
            return;
          }

          // Get all participants with their final rankings
          db.all(
            `SELECT tp.user_id, 
                    CASE 
                      WHEN tp.user_id = ? THEN 1
                      ELSE 2
                    END as rank
             FROM tournament_participants tp
             WHERE tp.tournament_id = ?
             ORDER BY rank`,
            [winnerId, tournamentId],
            async (err: Error | null, participants: { user_id: number; rank: number }[]) => {
              if (err) {
                reply.status(500).send({ error: 'Database error' });
                reject(err);
                return;
              }

              try {
                // Check if blockchain is available
                const blockchainAvailable = await isBlockchainAvailable();
                if (!blockchainAvailable) {
                  reply.status(503).send({ 
                    error: 'Blockchain service unavailable',
                    message: 'Tournament completed but blockchain recording failed' 
                  });
                  resolve();
                  return;
                }

                // Record on blockchain
                // Map database field names to blockchain function parameters
                const rankingsForBlockchain = participants.map(p => ({
                  userId: p.user_id,
                  rank: p.rank
                }));
                const txHash = await recordTournamentOnBlockchain(tournamentId, rankingsForBlockchain);
                
                // Store blockchain reference in database (add column if needed)
                reply.send({ 
                  message: 'Tournament recorded on blockchain successfully',
                  transactionHash: txHash,
                  participants: participants.length,
                  winner: winnerId
                });
                resolve();
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                reply.status(500).send({ 
                  error: 'Blockchain recording failed',
                  details: errorMessage
                });
                reject(error);
              }
            }
          );
        }
      );
    });
  });
  
  // Get user's tournament rankings
  fastify.get<{
    Params: { userId: string };
  }>('/user/:userId/rankings', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;
    
    return new Promise<void>((resolve, reject) => {
      // Get all tournaments the user participated in, with their ranking
      db.all(
        `SELECT 
          t.id as tournament_id,
          t.name as tournament_name,
          t.created_at,
          t.finished_at,
          t.status,
          t.winner_id,
          t.current_participants,
          tp.final_rank,
          tp.eliminated_at
         FROM tournaments t
         INNER JOIN tournament_participants tp ON t.id = tp.tournament_id
         WHERE tp.user_id = ?
         ORDER BY t.created_at DESC
         LIMIT 20`,
        [userId],
        (err: Error | null, tournaments: any[]) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
            return;
          }
          
          const rankings = tournaments.map(t => ({
            tournamentId: t.tournament_id,
            tournamentName: t.tournament_name,
            date: t.finished_at || t.created_at,
            rank: t.final_rank || '--',
            totalParticipants: t.current_participants,
            status: t.status,
            isWinner: t.winner_id === parseInt(userId)
          }));
          
          reply.send(rankings);
          resolve();
        }
      );
    });
  });
}

export default routes;