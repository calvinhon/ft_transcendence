// tournament-service/src/routes/tournament-creation.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as sqlite3 from 'sqlite3';
import { Tournament, CreateTournamentBody, JoinTournamentBody } from '../types.js';
import { db, generateBracket } from '../tournament-logic.js';

export default async function setupTournamentCreationRoutes(fastify: FastifyInstance): Promise<void> {
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
                                  checkAndCreateNextRound(match.id, fastify);
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
}

function checkAndCreateNextRound(matchId: number, fastify: FastifyInstance): void {
  fastify.log.info({ matchId }, '[CHECK NEXT ROUND] Starting check');

  // Get match details
  db.get(
    'SELECT * FROM tournament_matches WHERE id = ?',
    [matchId],
    (err: Error | null, match: any) => {
      if (err || !match) {
        fastify.log.error({ err, matchId }, '[CHECK NEXT ROUND] Failed to get match');
        return;
      }

      fastify.log.info({ tournamentId: match.tournament_id, round: match.round }, '[CHECK NEXT ROUND] Checking incomplete matches');

      // Check if all matches in current round are completed
      db.all(
        'SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? AND status != "completed"',
        [match.tournament_id, match.round],
        (err: Error | null, incompleteMatches: any[]) => {
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
            (err: Error | null, completedMatches: any[]) => {
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
                // Tournament finished - calculate and store final rankings
                const tournamentId = match.tournament_id;
                const winnerId = winners[0];

                fastify.log.info({ tournamentId, winnerId }, '[CHECK NEXT ROUND] Tournament finished - calculating rankings');

                // Update tournament status
                db.run(
                  'UPDATE tournaments SET status = "finished", finished_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?',
                  [winnerId, tournamentId],
                  (err: Error | null) => {
                    if (err) {
                      fastify.log.error({ err }, '[CHECK NEXT ROUND] Failed to update tournament status');
                      return;
                    }

                    // Calculate rankings based on elimination rounds
                    // Winner gets rank 1
                    db.run(
                      'UPDATE tournament_participants SET final_rank = 1 WHERE tournament_id = ? AND user_id = ?',
                      [tournamentId, winnerId],
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
                      [tournamentId],
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
                            [rankRangeStart, tournamentId, loser],
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
                // Create next round matches
                const nextRound = match.round + 1;
                const nextMatches: any[] = [];

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