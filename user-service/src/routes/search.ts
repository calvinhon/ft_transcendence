// user-service/src/routes/search.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from './database';
import { SearchQuery, OnlineUser } from './types';
import { promisifyDbAll } from './utils';

export async function setupSearchRoutes(fastify: FastifyInstance): Promise<void> {
  // Search users by display name or username
  fastify.get<{
    Querystring: SearchQuery;
  }>('/search/users', async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) => {
    const { query, limit = '10' } = request.query;

    if (!query || query.trim().length < 2) {
      return reply.status(400).send({ error: 'Search query must be at least 2 characters' });
    }

    const searchLimit = Math.min(parseInt(limit) || 10, 50); // Max 50 results

    try {
      const searchPattern = `%${query.trim()}%`;

      const users = await promisifyDbAll<any>(db, `SELECT up.user_id, up.display_name, up.avatar_url, up.country,
                COALESCE(up.games_won, 0) as games_won,
                COALESCE(up.games_played, 0) as games_played
         FROM user_profiles up
         WHERE up.display_name LIKE ? OR CAST(up.user_id AS TEXT) LIKE ?
         ORDER BY up.display_name
         LIMIT ?`, [searchPattern, searchPattern, searchLimit]);

      const formattedUsers = users.map(user => ({
        user_id: user.user_id,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        country: user.country,
        games_won: user.games_won,
        games_played: user.games_played
      }));
      reply.send(formattedUsers);
    } catch (err) {
      reply.status(500).send({ error: 'Database error' });
    }
  });

  // Get online users (placeholder - would need real-time tracking)
  fastify.get('/users/online', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const users = await promisifyDbAll<OnlineUser>(db, `SELECT up.user_id, up.display_name, up.avatar_url,
                'online' as status, 0 as is_bot, CURRENT_TIMESTAMP as last_seen
         FROM user_profiles up
         ORDER BY RANDOM()
         LIMIT 20`);
      reply.send(users);
    } catch (err) {
      reply.status(500).send({ error: 'Database error' });
    }
  });

  // Get leaderboard
  fastify.get<{
    Querystring: { type?: 'wins' | 'games' | 'winrate'; limit?: string };
  }>('/leaderboard', async (request: FastifyRequest<{ Querystring: { type?: 'wins' | 'games' | 'winrate'; limit?: string } }>, reply: FastifyReply) => {
    const { type = 'wins', limit = '50' } = request.query;
    const queryLimit = Math.min(parseInt(limit) || 50, 100); // Max 100 results

    let orderBy: string;
    switch (type) {
      case 'wins':
        orderBy = 'games_won DESC';
        break;
      case 'games':
        orderBy = 'games_played DESC';
        break;
      case 'winrate':
        orderBy = 'CASE WHEN games_played > 0 THEN CAST(games_won AS FLOAT) / games_played ELSE 0 END DESC';
        break;
      default:
        orderBy = 'games_won DESC';
    }

    try {
      const leaderboard = await promisifyDbAll<any>(db, `SELECT up.user_id, up.display_name, up.avatar_url, up.country,
                COALESCE(up.games_won, 0) as wins,
                COALESCE(up.games_lost, 0) as losses,
                COALESCE(up.games_played, 0) as total_games,
                CASE WHEN COALESCE(up.games_played, 0) > 0
                     THEN ROUND(CAST(COALESCE(up.games_won, 0) AS FLOAT) / COALESCE(up.games_played, 0) * 100, 1)
                     ELSE 0 END as winRate
         FROM user_profiles up
         WHERE up.games_played > 0
         ORDER BY ${orderBy}
         LIMIT ?`, [queryLimit]);
      reply.send(leaderboard);
    } catch (err) {
      reply.status(500).send({ error: 'Database error' });
    }
  });
}