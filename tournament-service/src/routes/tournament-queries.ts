// tournament-service/src/routes/tournament-queries.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Tournament, TournamentQuery } from '../types.js';
import { db } from '../tournament-logic.js';
import { recordTournamentOnBlockchain, isBlockchainAvailable } from '../blockchain';

export default async function setupTournamentQueryRoutes(fastify: FastifyInstance): Promise<void> {
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
        (err: Error | null, tournaments: any[]) => {
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
}