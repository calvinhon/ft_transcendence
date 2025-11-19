// tournament-service/src/routes/tournament-management.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as sqlite3 from 'sqlite3';
import { Tournament, TournamentParticipant, TournamentMatch, TournamentDetails, MatchResultBody } from '../types.js';
import { db } from '../tournament-logic.js';

export default async function setupTournamentManagementRoutes(fastify: FastifyInstance): Promise<void> {
  // Update match result
  fastify.post<{
    Body: MatchResultBody;
  }>('/match/result', async (request: FastifyRequest<{ Body: MatchResultBody }>, reply: FastifyReply) => {
    const { matchId, winnerId, player1Score, player2Score } = request.body;

    fastify.log.info('========== MATCH RESULT ENDPOINT ==========');
    fastify.log.info({
      matchId,
      winnerId,
      player1Score,
      player2Score,
      body: request.body
    }, '[MATCH RESULT] Received request');

    if (!matchId || !winnerId || player1Score === undefined || player2Score === undefined) {
      fastify.log.error({ matchId, winnerId, player1Score, player2Score }, '[MATCH RESULT] Missing required fields');
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    // First, get the match details to see what we're updating
    return new Promise<void>((resolvePromise, rejectPromise) => {
      db.get(
        'SELECT * FROM tournament_matches WHERE id = ?',
        [matchId],
        (err: Error | null, match: TournamentMatch) => {
          if (err || !match) {
            fastify.log.error({ err, matchId }, '[MATCH RESULT] Failed to get match details');
            reply.status(404).send({ error: 'Match not found' });
            rejectPromise(err || new Error('Match not found'));
            return;
          }

          fastify.log.info({
            matchId: match.id,
            currentPlayer1: match.player1_id,
            currentPlayer2: match.player2_id,
            currentWinner: match.winner_id,
            currentStatus: match.status,
            newWinner: winnerId,
            newPlayer1Score: player1Score,
            newPlayer2Score: player2Score
          }, '[MATCH RESULT] Before update');

          // Verify winner is one of the players
          if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
            fastify.log.error({
              winnerId,
              player1Id: match.player1_id,
              player2Id: match.player2_id
            }, '[MATCH RESULT] Winner ID does not match either player!');
            reply.status(400).send({ error: 'Invalid winner ID - must be one of the match players' });
            rejectPromise(new Error('Invalid winner ID'));
            return;
          }

          db.run(
            'UPDATE tournament_matches SET winner_id = ?, player1_score = ?, player2_score = ?, status = "completed", played_at = CURRENT_TIMESTAMP WHERE id = ?',
            [winnerId, player1Score, player2Score, matchId],
            function(this: sqlite3.RunResult, err: Error | null) {
              if (err) {
                fastify.log.error(err, '[MATCH RESULT] Database update error');
                reply.status(500).send({ error: 'Database error' });
                rejectPromise(err);
              } else {
                fastify.log.info({
                  matchId,
                  changes: this.changes,
                  winnerId,
                  player1Score,
                  player2Score
                }, '[MATCH RESULT] Successfully updated match');

                // Check if we need to create next round matches
                checkAndCreateNextRound(matchId, fastify);
                reply.send({ message: 'Match result updated successfully' });
                resolvePromise();
              }
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