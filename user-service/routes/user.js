// user-service/routes/user.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/users.db');

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

async function routes(fastify, options) {
  // Get user profile
  fastify.get('/profile/:userId', async (request, reply) => {
    const { userId } = request.params;

    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userId],
        (err, profile) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else if (!profile) {
            // Create default profile if doesn't exist
            db.run(
              'INSERT INTO user_profiles (user_id) VALUES (?)',
              [userId],
              function(err) {
                if (err) {
                  reply.status(500).send({ error: 'Database error' });
                  reject(err);
                } else {
                  reply.send({
                    id: this.lastID,
                    user_id: userId,
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
  fastify.put('/profile/:userId', async (request, reply) => {
    const { userId } = request.params;
    const { displayName, bio, country, preferredLanguage, themePreference } = request.body;

    return new Promise((resolve, reject) => {
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
        function(err) {
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
  fastify.post('/friend/request', async (request, reply) => {
    const { userId, friendId } = request.body;

    if (!userId || !friendId) {
      return reply.status(400).send({ error: 'User ID and Friend ID required' });
    }

    if (userId === friendId) {
      return reply.status(400).send({ error: 'Cannot add yourself as friend' });
    }

    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, ?)',
        [userId, friendId, 'pending'],
        function(err) {
          if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
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
  fastify.put('/friend/respond', async (request, reply) => {
    const { userId, friendId, action } = request.body;

    if (!userId || !friendId || !action) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    if (action !== 'accept' && action !== 'reject') {
      return reply.status(400).send({ error: 'Action must be accept or reject' });
    }

    return new Promise((resolve, reject) => {
      if (action === 'accept') {
        // Update the friendship status
        db.run(
          'UPDATE friendships SET status = ?, accepted_at = CURRENT_TIMESTAMP WHERE friend_id = ? AND user_id = ? AND status = ?',
          ['accepted', userId, friendId, 'pending'],
          function(err) {
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
                (err) => {
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
          function(err) {
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
  fastify.get('/friends/:userId', async (request, reply) => {
    const { userId } = request.params;

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT f.friend_id, f.status, f.accepted_at, up.display_name, up.avatar_url
         FROM friendships f
         LEFT JOIN user_profiles up ON f.friend_id = up.user_id
         WHERE f.user_id = ? AND f.status = 'accepted'`,
        [userId],
        (err, friends) => {
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
  fastify.get('/friend/requests/:userId', async (request, reply) => {
    const { userId } = request.params;

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT f.user_id as requester_id, f.requested_at, up.display_name, up.avatar_url
         FROM friendships f
         LEFT JOIN user_profiles up ON f.user_id = up.user_id
         WHERE f.friend_id = ? AND f.status = 'pending'`,
        [userId],
        (err, requests) => {
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
  fastify.get('/search', async (request, reply) => {
    const { query, limit = 20 } = request.query;

    if (!query) {
      return reply.status(400).send({ error: 'Search query required' });
    }

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT up.user_id, up.display_name, up.avatar_url, up.country
         FROM user_profiles up
         WHERE up.display_name LIKE ? OR CAST(up.user_id AS TEXT) LIKE ?
         ORDER BY up.display_name
         LIMIT ?`,
        [`%${query}%`, `%${query}%`, parseInt(limit)],
        (err, users) => {
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
  fastify.post('/achievement', async (request, reply) => {
    const { userId, achievementType, achievementName, description, metadata } = request.body;

    if (!userId || !achievementType || !achievementName) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, metadata) VALUES (?, ?, ?, ?, ?)',
        [userId, achievementType, achievementName, description || '', JSON.stringify(metadata || {})],
        function(err) {
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
  fastify.get('/achievements/:userId', async (request, reply) => {
    const { userId } = request.params;

    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM user_achievements WHERE user_id = ? ORDER BY earned_at DESC',
        [userId],
        (err, achievements) => {
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
  fastify.get('/leaderboard', async (request, reply) => {
    const { type = 'wins', limit = 50 } = request.query;

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

    return new Promise((resolve, reject) => {
      db.all(query, [parseInt(limit)], async (err, users) => {
        if (err) {
          reply.status(500).send({ error: 'Database error' });
          reject(err);
          return;
        }

        try {
          // Get game stats for each user from game service
          const leaderboard = [];
          
          for (const user of users) {
            try {
              // Call game service to get user stats
              const statsResponse = await fetch(`http://game-service:3000/stats/${user.user_id}`);
              let stats = { wins: 0, losses: 0, total_games: 0, winRate: 0 };
              
              if (statsResponse.ok) {
                stats = await statsResponse.json();
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
              console.log('Could not fetch stats for user', user.user_id, ':', fetchError.message);
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
  fastify.get('/online', async (request, reply) => {
    try {
      // Get real online users from game service
      const gameServiceResponse = await fetch('http://game-service:3000/online');
      
      if (gameServiceResponse.ok) {
        const onlineUsers = await gameServiceResponse.json();
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
  fastify.get('/health', async (request, reply) => {
    reply.send({ status: 'healthy', service: 'user-service', timestamp: new Date().toISOString() });
  });
}

module.exports = routes;