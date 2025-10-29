// user-service/src/routes/user.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import sqlite3 from 'sqlite3';
import path from 'path';

// Type definitions
interface UserProfile {
  id: number;
  user_id: number;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  preferred_language: string;
  theme_preference: string;
  notification_settings: string;
  privacy_settings: string;
  created_at: string;
  updated_at: string;
}

interface Friendship {
  id: number;
  user_id: number;
  friend_id: number;
  status: 'pending' | 'accepted';
  requested_at: string;
  accepted_at: string | null;
}

interface FriendRequest {
  requester_id: number;
  requested_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Friend {
  friend_id: number;
  status: string;
  accepted_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Achievement {
  id: number;
  user_id: number;
  achievement_type: string;
  achievement_name: string;
  description: string;
  earned_at: string;
  metadata: string;
}

interface GameStats {
  wins: number;
  losses: number;
  total_games: number;
  winRate: number;
}

interface LeaderboardUser extends UserProfile {
  wins: number;
  losses: number;
  total_games: number;
  winRate: number;
}

interface OnlineUser {
  user_id: number | string;
  username: string;
  display_name: string;
  status: 'online';
  is_bot: boolean;
  last_seen: string;
}

interface UpdateProfileBody {
  displayName?: string;
  bio?: string;
  country?: string;
  preferredLanguage?: string;
  themePreference?: string;
}

interface FriendRequestBody {
  userId: number;
  friendId: number;
}

interface FriendResponseBody {
  userId: number;
  friendId: number;
  action: 'accept' | 'reject';
}

interface AddAchievementBody {
  userId: number;
  achievementType: string;
  achievementName: string;
  description?: string;
  metadata?: any;
}

interface SearchQuery {
  query: string;
  limit?: string;
}

interface LeaderboardQuery {
  type?: 'wins' | 'games' | 'winrate';
  limit?: string;
}

const dbPath = path.join(__dirname, '../../database/users.db');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to Users SQLite database');
    
    // Create extended user profiles table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        bio TEXT,
        country TEXT,
        preferred_language TEXT DEFAULT 'en',
        theme_preference TEXT DEFAULT 'dark',
        notification_settings TEXT DEFAULT '{}',
        privacy_settings TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create friends table
    db.run(`
      CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accepted_at DATETIME,
        UNIQUE(user_id, friend_id)
      )
    `);

    // Create user achievements table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_type TEXT NOT NULL,
        achievement_name TEXT NOT NULL,
        description TEXT,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT DEFAULT '{}'
      )
    `);
  }
});

async function routes(fastify: FastifyInstance): Promise<void> {
  // Get user profile
  fastify.get<{
    Params: { userId: string };
  }>('/profile/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    return new Promise<void>((resolve, reject) => {
      db.get(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userId],
        (err: Error | null, profile: UserProfile) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else if (!profile) {
            // Create default profile if doesn't exist
            db.run(
              'INSERT INTO user_profiles (user_id) VALUES (?)',
              [userId],
              function(this: sqlite3.RunResult, err: Error | null) {
                if (err) {
                  reply.status(500).send({ error: 'Database error' });
                  reject(err);
                } else {
                  reply.send({
                    id: this.lastID,
                    user_id: parseInt(userId),
                    display_name: null,
                    avatar_url: null,
                    bio: null,
                    country: null,
                    preferred_language: 'en',
                    theme_preference: 'dark',
                    notification_settings: '{}',
                    privacy_settings: '{}',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });
                  resolve();
                }
              }
            );
          } else {
            reply.send(profile);
            resolve();
          }
        }
      );
    });
  });

  // Update user profile
  fastify.put<{
    Params: { userId: string };
    Body: UpdateProfileBody;
  }>('/profile/:userId', async (request: FastifyRequest<{ Params: { userId: string }; Body: UpdateProfileBody }>, reply: FastifyReply) => {
    const { userId } = request.params;
    const { displayName, bio, country, preferredLanguage, themePreference } = request.body;

    return new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE user_profiles SET 
         display_name = COALESCE(?, display_name),
         bio = COALESCE(?, bio),
         country = COALESCE(?, country),
         preferred_language = COALESCE(?, preferred_language),

    // Update game stats (wins, total_games, xp, level, etc)
    fastify.post<{
      Params: { userId: string };
      Body: {
        wins?: number;
        total_games?: number;
        xp?: number;
        level?: number;
        winRate?: number;
        lost?: number;
        [key: string]: any;
      };
    }>('/game/update-stats/:userId', async (request: FastifyRequest<{ Params: { userId: string }; Body: any }>, reply: FastifyReply) => {
      const { userId } = request.params;
      const { wins, total_games, xp, level, winRate, lost } = request.body;

      // Build dynamic SQL for only provided fields
      const fields = [];
      const values = [];
      if (typeof wins === 'number') { fields.push('wins = ?'); values.push(wins); }
      if (typeof total_games === 'number') { fields.push('total_games = ?'); values.push(total_games); }
      if (typeof xp === 'number') { fields.push('xp = ?'); values.push(xp); }
      if (typeof level === 'number') { fields.push('level = ?'); values.push(level); }
      if (typeof winRate === 'number') { fields.push('winRate = ?'); values.push(winRate); }
      if (typeof lost === 'number') { fields.push('lost = ?'); values.push(lost); }
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);

      if (fields.length === 1) {
        // Only updated_at, nothing to update
        return reply.status(400).send({ error: 'No stats provided' });
      }

      const sql = 'UPDATE user_profiles SET ' + fields.join(', ') + ' WHERE user_id = ?';
      db.run(sql, values, function(this: sqlite3.RunResult, err: Error | null) {
        if (err) {
          reply.status(500).send({ error: 'Database error', details: err });
        } else {
          reply.send({ message: 'Game stats updated successfully' });
        }
      });
    });
         theme_preference = COALESCE(?, theme_preference),
         updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [displayName, bio, country, preferredLanguage, themePreference, userId],
        function(this: sqlite3.RunResult, err: Error | null) {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send({ message: 'Profile updated successfully' });
            resolve();
          }
        }
      );
    });
  });

  // Send friend request
  fastify.post<{
    Body: FriendRequestBody;
  }>('/friend/request', async (request: FastifyRequest<{ Body: FriendRequestBody }>, reply: FastifyReply) => {
    const { userId, friendId } = request.body;

    if (!userId || !friendId) {
      return reply.status(400).send({ error: 'User ID and Friend ID required' });
    }

    if (userId === friendId) {
      return reply.status(400).send({ error: 'Cannot add yourself as friend' });
    }

    return new Promise<void>((resolve, reject) => {
      db.run(
        'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, ?)',
        [userId, friendId, 'pending'],
        function(this: sqlite3.RunResult, err: Error | null) {
          if (err) {
            if ((err as any).code === 'SQLITE_CONSTRAINT') {
              reply.status(409).send({ error: 'Friend request already exists' });
            } else {
              reply.status(500).send({ error: 'Database error' });
            }
            reject(err);
          } else {
            reply.send({ message: 'Friend request sent successfully' });
            resolve();
          }
        }
      );
    });
  });

  // Accept/reject friend request
  fastify.put<{
    Body: FriendResponseBody;
  }>('/friend/respond', async (request: FastifyRequest<{ Body: FriendResponseBody }>, reply: FastifyReply) => {
    const { userId, friendId, action } = request.body;

    if (!userId || !friendId || !action) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    if (action !== 'accept' && action !== 'reject') {
      return reply.status(400).send({ error: 'Action must be accept or reject' });
    }

    return new Promise<void>((resolve, reject) => {
      if (action === 'accept') {
        // Update the friendship status
        db.run(
          'UPDATE friendships SET status = ?, accepted_at = CURRENT_TIMESTAMP WHERE friend_id = ? AND user_id = ? AND status = ?',
          ['accepted', userId, friendId, 'pending'],
          function(this: sqlite3.RunResult, err: Error | null) {
            if (err) {
              reply.status(500).send({ error: 'Database error' });
              reject(err);
            } else if (this.changes === 0) {
              reply.status(404).send({ error: 'Friend request not found' });
              resolve();
            } else {
              // Create reciprocal friendship
              db.run(
                'INSERT INTO friendships (user_id, friend_id, status, accepted_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
                [userId, friendId, 'accepted'],
                (err: Error | null) => {
                  if (err) {
                    reply.status(500).send({ error: 'Database error' });
                    reject(err);
                  } else {
                    reply.send({ message: 'Friend request accepted' });
                    resolve();
                  }
                }
              );
            }
          }
        );
      } else {
        // Reject - just delete the request
        db.run(
          'DELETE FROM friendships WHERE friend_id = ? AND user_id = ? AND status = ?',
          [userId, friendId, 'pending'],
          function(this: sqlite3.RunResult, err: Error | null) {
            if (err) {
              reply.status(500).send({ error: 'Database error' });
              reject(err);
            } else {
              reply.send({ message: 'Friend request rejected' });
              resolve();
            }
          }
        );
      }
    });
  });

  // Get user's friends
  fastify.get<{
    Params: { userId: string };
  }>('/friends/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    return new Promise<void>((resolve, reject) => {
      db.all(
        `SELECT f.friend_id, f.status, f.accepted_at, up.display_name, up.avatar_url
         FROM friendships f
         LEFT JOIN user_profiles up ON f.friend_id = up.user_id
         WHERE f.user_id = ? AND f.status = 'accepted'`,
        [userId],
        (err: Error | null, friends: Friend[]) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send(friends);
            resolve();
          }
        }
      );
    });
  });

  // Get pending friend requests
  fastify.get<{
    Params: { userId: string };
  }>('/friend/requests/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    return new Promise<void>((resolve, reject) => {
      db.all(
        `SELECT f.user_id as requester_id, f.requested_at, up.display_name, up.avatar_url
         FROM friendships f
         LEFT JOIN user_profiles up ON f.user_id = up.user_id
         WHERE f.friend_id = ? AND f.status = 'pending'`,
        [userId],
        (err: Error | null, requests: FriendRequest[]) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send(requests);
            resolve();
          }
        }
      );
    });
  });

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

  // Add achievement
  fastify.post<{
    Body: AddAchievementBody;
  }>('/achievement', async (request: FastifyRequest<{ Body: AddAchievementBody }>, reply: FastifyReply) => {
    const { userId, achievementType, achievementName, description, metadata } = request.body;

    if (!userId || !achievementType || !achievementName) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    return new Promise<void>((resolve, reject) => {
      db.run(
        'INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, metadata) VALUES (?, ?, ?, ?, ?)',
        [userId, achievementType, achievementName, description || '', JSON.stringify(metadata || {})],
        function(this: sqlite3.RunResult, err: Error | null) {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send({ 
              message: 'Achievement added successfully',
              achievementId: this.lastID
            });
            resolve();
          }
        }
      );
    });
  });

  // Get user achievements
  fastify.get<{
    Params: { userId: string };
  }>('/achievements/:userId', async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;

    return new Promise<void>((resolve, reject) => {
      db.all(
        'SELECT * FROM user_achievements WHERE user_id = ? ORDER BY earned_at DESC',
        [userId],
        (err: Error | null, achievements: Achievement[]) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else {
            reply.send(achievements);
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

export default routes;