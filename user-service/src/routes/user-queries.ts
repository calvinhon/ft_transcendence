import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserProfile, SearchQuery, LeaderboardQuery, LeaderboardUser, OnlineUser, GameStats, JWTPayload, ApiResponse, Friend } from '../types.js';
import { db } from '../user-logic.js';

export default async function setupUserQueriesRoutes(fastify: FastifyInstance): Promise<void> {
  // Search users
  fastify.get<{
    Querystring: SearchQuery;
  }>('/search', async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) => {
    const { query, limit = '20' } = request.query;

    if (!query) {
      return reply.status(400).send({
        success: false,
        error: 'Search query required'
      } as ApiResponse);
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
            reply.status(500).send({
              success: false,
              error: 'Database error'
            } as ApiResponse);
            reject(err);
          } else {
            reply.send({
              success: true,
              data: users
            } as ApiResponse<UserProfile[]>);
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
          reply.status(500).send({
            success: false,
            error: 'Database error'
          } as ApiResponse);
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

          reply.send({
            success: true,
            data: leaderboard
          } as ApiResponse<LeaderboardUser[]>);
          resolve();
        } catch (error) {
          console.error('Error building leaderboard:', error);
          reply.status(500).send({
            success: false,
            error: 'Error fetching leaderboard data'
          } as ApiResponse);
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

  // Get current user friends (JWT authenticated)
  fastify.get('/friends', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: 'No token provided'
        } as ApiResponse);
      }

      const token = authHeader.replace('Bearer ', '');
      const decoded = fastify.jwt.verify(token) as JWTPayload;
      const userId = decoded.userId;

      return new Promise<void>((resolve, reject) => {
        // Get friends where status is 'accepted'
        const query = `
          SELECT f.*, up.display_name as friend_display_name, up.avatar_url
          FROM friends f
          JOIN user_profiles up ON f.friend_id = up.user_id
          WHERE f.user_id = ? AND f.status = 'accepted'
          UNION
          SELECT f.*, up.display_name as friend_display_name, up.avatar_url
          FROM friends f
          JOIN user_profiles up ON f.user_id = up.user_id
          WHERE f.friend_id = ? AND f.status = 'accepted'
        `;

        db.all(query, [userId, userId], (err: Error | null, friends: any[]) => {
          if (err) {
            reply.status(500).send({
              success: false,
              error: 'Database error'
            } as ApiResponse);
            reject(err);
          } else {
            // Format the response
            const formattedFriends = friends.map(friend => ({
              id: friend.id,
              user_id: friend.user_id === userId ? friend.friend_id : friend.user_id,
              friend_id: friend.friend_id,
              status: friend.status,
              created_at: friend.created_at,
              updated_at: friend.updated_at,
              friend_username: friend.friend_display_name || `User ${friend.friend_id}`,
              friend_display_name: friend.friend_display_name || `User ${friend.friend_id}`
            }));

            reply.send({
              success: true,
              data: formattedFriends
            } as ApiResponse<Friend[]>);
            resolve();
          }
        });
      });
    } catch (error) {
      console.log('Get friends error:', error);
      if (error instanceof Error && error.message.includes('expired')) {
        return reply.status(401).send({
          success: false,
          error: 'Token expired'
        } as ApiResponse);
      }
      reply.status(401).send({
        success: false,
        error: 'Invalid token'
      } as ApiResponse);
    }
  });

  // Health check
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ status: 'healthy', service: 'user-service', timestamp: new Date().toISOString() });
  });
}