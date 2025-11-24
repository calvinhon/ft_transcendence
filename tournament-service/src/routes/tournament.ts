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
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error opening database:', err);
  else {
    console.log('Connected to Tournaments SQLite database');
    
    // Create tournaments table
    db.run(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        min_participants INTEGER DEFAULT 4,
        max_participants INTEGER DEFAULT 4,
        current_participants INTEGER DEFAULT 0,
        started_at DATETIME,
        winner_id INTEGER
      )
    `);

    // Create tournament participants table
    db.run(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        eliminated_at DATETIME,
        final_rank INTEGER,
        FOREIGN KEY (tournament_id) REFERENCES tournaments (id)
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

// Route definitions
async function routes(fastify: FastifyInstance): Promise<void> {
  // Create tournament
//   fastify.post<{
//     Body: CreateTournamentBody;
//   }>('/create', async (request: FastifyRequest<{ Body: CreateTournamentBody }>, reply: FastifyReply) => {
//     const { name, description, maxParticipants, createdBy } = request.body;
    
//     return new Promise<void>((resolve, reject) => {
//       db.run(
//         'INSERT INTO tournaments (name, description, max_participants, created_by) VALUES (?, ?, ?, ?)',
//         [name, description || '', maxParticipants || 8, createdBy],
//         function(this: sqlite3.RunResult, err: Error | null) {
//           if (err) {
//             reply.status(500).send({ error: 'Database error' });
//             reject(err);
//           } else {
//             reply.send({ 
//               message: 'Tournament created successfully',
//               tournamentId: this.lastID
//             });
//             resolve();
//           }
//         }
//       );
//     });
//   });

  // Join tournament
//   fastify.post<{
//     Body: JoinTournamentBody;
//   }>('/join', async (request: FastifyRequest<{ Body: JoinTournamentBody }>, reply: FastifyReply) => {
//     const { tournamentId, userId } = request.body;
//     if (!tournamentId || !userId) {
//       return reply.status(400).send({ error: 'Tournament ID and User ID required' });
//     }
//     return new Promise<void>((resolve, reject) => {
//       // First check if tournament exists and is open
//       db.get(
//         'SELECT * FROM tournaments WHERE id = ? AND status = "open"',
//         [tournamentId],
//         (err: Error | null, tournament: Tournament) => {
//           if (err) {
//             reply.status(500).send({ error: 'Database error' });
//             reject(err);
//           } else if (!tournament) {
//             reply.status(404).send({ error: 'Tournament not found or not open' });
//             resolve();
//           } else if (tournament.current_participants >= tournament.max_participants) {
//             reply.status(409).send({ error: 'Tournament is full' });
//             resolve();
//           } else {
//             // Add participant
//             db.run(
//               'INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)',
//               [tournamentId, userId],
//               function(this: sqlite3.RunResult, err: Error | null) {
//                 if (err) {
//                   if ((err as any).code === 'SQLITE_CONSTRAINT') {
//                     reply.status(409).send({ error: 'Already joined this tournament' });
//                   } else {
//                     reply.status(500).send({ error: 'Database error' });
//                   }
//                   reject(err);
//                 } else {
//                   // Update participant count
//                   db.run(
//                     'UPDATE tournaments SET current_participants = current_participants + 1 WHERE id = ?',
//                     [tournamentId],
//                     (err: Error | null) => {
//                       if (!err) {
//                         reply.send({ message: 'Successfully joined tournament' });
//                       }
//                       resolve();
//                     }
//                   );
//                 }
//               }
//             );
//           }
//         }
//       );
//     });
//   });

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
      fastify.log.error({ matchId, winnerId, player1Score, player2Score }, '[MATCH RESULT] Missing required fields');
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
    // Get match details
    db.get(
      'SELECT * FROM tournament_matches WHERE id = ?',
      [matchId],
      (err: Error | null, match: TournamentMatch) => {
        if (err || !match) return;

        // Check if all matches in current round are completed
        db.all(
          'SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? AND status != "completed"',
          [match.tournament_id, match.round],
          (err: Error | null, incompleteMatches: TournamentMatch[]) => {
            if (err || incompleteMatches.length > 0) return;

            // All matches in round completed, create next round
            db.all(
              'SELECT id, match_number, player1_id, player2_id, winner_id FROM tournament_matches WHERE tournament_id = ? AND round = ? ORDER BY match_number ASC',
              [match.tournament_id, match.round],
              (err: Error | null, winners: { winner_id: number }[]) => {
                if (err) return;

                if (winners.length === 1) {
                  // Tournament finished
                  db.run(
                    'UPDATE tournaments SET status = "finished", finished_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?',
                    [match.winner_id, match.tournament_id],
                    (err: Error | null) => {
                      if (err) {
                        fastify.log.error({ err }, '[CHECK NEXT ROUND] Failed to update tournament status');
                        return;
                      }
                      
                      // Calculate rankings based on elimination rounds
                      // Winner gets rank 1
                      db.run(
                        'UPDATE tournament_participants SET final_rank = 1 WHERE tournament_id = ? AND user_id = ?',
                        [match.tournament_id, match.winner_id],
                        (err: Error | null) => {
                          if (err) {
                            fastify.log.error({ err }, '[RANKINGS] Failed to set winner rank');
                          }
                        }
                      );
                      
                      // Get all matches to determine elimination rounds for other participants
                      db.all(
                        `SELECT round, player1_id, player2_id, winner_id 
                         FROM tournament_matches 
                         WHERE tournament_id = ? AND status = 'completed' AND winner_id IS NOT NULL
                         ORDER BY round DESC`,
                        [match.tournament_id],
                        (err: Error | null, matches: any[]) => {
                          if (err) {
                            fastify.log.error({ err }, '[RANKINGS] Failed to get matches for ranking');
                            return;
                          }
                          
                          const maxRound = Math.max(...matches.map(m => m.round));
                          
                          // Assign ranks based on elimination round (later rounds = better placement)
                          matches.forEach(match => {
                            const loser = match.winner_id === match.player1_id ? match.player2_id : match.player1_id;
                            
                            // Calculate rank: final = 1st, semi-final = 2nd-3rd, quarter-final = 4th-7th, etc.
                            // Rank range for each round: 2^(maxRound - round + 1) to 2^(maxRound - round + 2) - 1
                            const rankRangeStart = Math.pow(2, maxRound - match.round) + 1;
                            
                            db.run(
                              `UPDATE tournament_participants 
                               SET final_rank = ? 
                               WHERE tournament_id = ? AND user_id = ? AND final_rank IS NULL`,
                              [rankRangeStart, match.tournament_id, loser],
                              (err: Error | null) => {
                                if (err) {
                                  fastify.log.error({ err, loser, rank: rankRangeStart }, '[RANKINGS] Failed to set participant rank');
                                } else {
                                  fastify.log.info({ loser, rank: rankRangeStart, round: match.round }, '[RANKINGS] Set participant rank');
                                }
                              }
                            );
                          });
                        }
                      );
                    }
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
