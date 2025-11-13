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

  // Health check
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ status: 'healthy', service: 'user-service', timestamp: new Date().toISOString() });
  });
}

export default routes;