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

  // Get leaderboard
  fastify.get('/leaderboard', async (request, reply) => {
    const { type = 'wins', limit = 50 } = request.query;

    let query = `
      SELECT 
        up.user_id,
        up.display_name,
        up.avatar_url,
        up.country,
        COUNT(CASE WHEN g.winner_id = up.user_id THEN 1 END) as wins,
        COUNT(CASE WHEN (g.player1_id = up.user_id OR g.player2_id = up.user_id) AND g.status = 'finished' THEN 1 END) as total_games
      FROM user_profiles up
      LEFT JOIN games g ON (g.player1_id = up.user_id OR g.player2_id = up.user_id)
      GROUP BY up.user_id
      HAVING total_games > 0
    `;

    if (type === 'wins') {
      query += ' ORDER BY wins DESC, total_games DESC';
    } else if (type === 'games') {
      query += ' ORDER BY total_games DESC, wins DESC';
    } else if (type === 'winrate') {
      query += ' ORDER BY (CAST(wins AS FLOAT) / total_games) DESC, wins DESC';
    }

    query += ` LIMIT ?`;

    return new Promise((resolve, reject) => {
      db.all(query, [parseInt(limit)], (err, leaderboard) => {
        if (err) {
          reply.status(500).send({ error: 'Database error' });
          reject(err);
        } else {
          // Calculate win rate for each user
          const enrichedLeaderboard = leaderboard.map(user => ({
            ...user,
            winRate: user.total_games > 0 ? ((user.wins / user.total_games) * 100).toFixed(2) : 0
          }));
          
          reply.send(enrichedLeaderboard);
          resolve();
        }
      });
    });
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    reply.send({ status: 'healthy', service: 'user-service', timestamp: new Date().toISOString() });
  });
}

module.exports = routes;