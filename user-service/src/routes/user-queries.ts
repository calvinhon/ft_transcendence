import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserProfile, SearchQuery, LeaderboardQuery, LeaderboardUser, OnlineUser, GameStats } from '../types.js';
import { db } from '../user-logic.js';

export default async function setupUserQueriesRoutes(fastify: FastifyInstance): Promise<void> {
  // Search users
  fastify.get<{
    Querystring: SearchQuery;
  }>('/search', async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) => {
    const { query, limit = '20' } = request.query;

    if (!query) {
      return reply.status(400).send({ error: 'Search query required' });
    }

    return new Promise<void>((resolve, reject) => {
      db.all(
        `SELECT up.user_id, up.display_name, up.avatar_url, up.country
         FROM user_profiles up
         WHERE up.display_name LIKE ? OR CAST(up.user_id AS TEXT) LIKE ?
         ORDER BY up.display_name
         LIMIT ?`,
        [`%${query}%`, `%${query}%`, parseInt(limit)],
        (err: Error | null, users: UserProfile[]) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send(users);
            resolve();
          }
        }
      );
    });
  });

  // Get leaderboard
  fastify.get<{
    Querystring: LeaderboardQuery;
  }>('/leaderboard', async (request: FastifyRequest<{ Querystring: LeaderboardQuery }>, reply: FastifyReply) => {
    const { type = 'wins', limit = '50' } = request.query;

    // First get all user profiles
    const query = `
      SELECT
        user_id,
        display_name,
        avatar_url,
        country
      FROM user_profiles
      ORDER BY user_id
      LIMIT ?
    `;

    return new Promise<void>((resolve, reject) => {
      db.all(query, [parseInt(limit)], async (err: Error | null, users: UserProfile[]) => {
        if (err) {
          reply.status(500).send({ error: 'Database error' });
          reject(err);
          return;
        }

        try {
          // Get game stats for each user from game service
          const leaderboard: LeaderboardUser[] = [];

          for (const user of users) {
            try {
              // Call game service to get user stats
              const statsResponse = await fetch(`http://game-service:3000/stats/${user.user_id}`);
              let stats: GameStats = { wins: 0, losses: 0, total_games: 0, winRate: 0 };

              if (statsResponse.ok) {
                stats = await statsResponse.json() as GameStats;
              }

              leaderboard.push({
                ...user,
                wins: stats.wins || 0,
                losses: stats.losses || 0,
                total_games: stats.total_games || 0,
                winRate: stats.winRate || 0
              });
            } catch (fetchError) {
              // If game service is unavailable, use default stats
              console.log('Could not fetch stats for user', user.user_id, ':', (fetchError as Error).message);
              leaderboard.push({
                ...user,
                wins: 0,
                losses: 0,
                total_games: 0,
                winRate: 0
              });
            }
          }

          // Sort based on type
          if (type === 'wins') {
            leaderboard.sort((a, b) => b.wins - a.wins || b.total_games - a.total_games);
          } else if (type === 'games') {
            leaderboard.sort((a, b) => b.total_games - a.total_games || b.wins - a.wins);
          } else if (type === 'winrate') {
            leaderboard.sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
          }

          reply.send(leaderboard);
          resolve();
        } catch (error) {
          console.error('Error building leaderboard:', error);
          reply.status(500).send({ error: 'Error fetching leaderboard data' });
          reject(error);
        }
      });
    });
  });

  // Get online players (from game service WebSocket tracking)
  fastify.get('/online', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get real online users from game service
      const gameServiceResponse = await fetch('http://game-service:3000/online');

      if (gameServiceResponse.ok) {
        const onlineUsers = await gameServiceResponse.json() as OnlineUser[];
        console.log(`User service: Retrieved ${onlineUsers.length} online users from game service`);
        reply.send(onlineUsers);
      } else {
        console.error('Failed to get online users from game service:', gameServiceResponse.status);
        // Fallback to bot players only
        reply.send([
          {
            user_id: 'bot_easy',
            username: 'EasyBot',
            display_name: 'Easy Bot ⚡',
            status: 'online',
            is_bot: true,
            last_seen: new Date().toISOString()
          },
          {
            user_id: 'bot_medium',
            username: 'MediumBot',
            display_name: 'Medium Bot ⚔️',
            status: 'online',
            is_bot: true,
            last_seen: new Date().toISOString()
          },
          {
            user_id: 'bot_hard',
            username: 'HardBot',
            display_name: 'Hard Bot 🔥',
            status: 'online',
            is_bot: true,
            last_seen: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error getting online players:', error);
      // Fallback to bot players only
      reply.send([
        {
          user_id: 'bot_easy',
          username: 'EasyBot',
          display_name: 'Easy Bot ⚡',
          status: 'online',
          is_bot: true,
          last_seen: new Date().toISOString()
        }
      ]);
    }
  });

  // Health check
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ status: 'healthy', service: 'user-service', timestamp: new Date().toISOString() });
  });
}