// auth-service/routes/auth.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '../database/auth.db');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);
  }
});

async function routes(fastify, options) {
  // Register user
  fastify.post('/register', async (request, reply) => {
    const { username, email, password } = request.body;
    
    if (!username || !email || !password) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      return new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
          [username, email, hashedPassword],
          function(err) {
            if (err) {
              if (err.code === 'SQLITE_CONSTRAINT') {
                reply.status(409).send({ error: 'Username or email already exists' });
              } else {
                reply.status(500).send({ error: 'Database error' });
              }
              reject(err);
            } else {
              const token = fastify.jwt.sign({ 
                userId: this.lastID, 
                username: username 
              }, { expiresIn: '24h' });
              reply.send({ 
                message: 'User registered successfully',
                userId: this.lastID,
                token: token
              });
              resolve();
            }
          }
        );
      });
    } catch (error) {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Login user
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body;
    
    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password required' });
    }

    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, password_hash FROM users WHERE username = ?',
        [username],
        async (err, user) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else if (!user) {
            reply.status(401).send({ error: 'Invalid credentials' });
            resolve();
          } else {
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (isValid) {
              // Update last login
              db.run(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
              );
              
              const token = fastify.jwt.sign({ 
                userId: user.id, 
                username: user.username 
              }, { expiresIn: '24h' });
              
              reply.send({
                message: 'Login successful',
                userId: user.id,
                username: user.username,
                token: token
              });
            } else {
              reply.status(401).send({ error: 'Invalid credentials' });
            }
            resolve();
          }
        }
      );
    });
  });

  // Verify token
  fastify.post('/verify', async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        console.log('No token provided in authorization header');
        return reply.status(401).send({ error: 'No token provided' });
      }

      console.log('Verifying token:', token.substring(0, 20) + '...');
      const decoded = fastify.jwt.verify(token);
      console.log('Token verified successfully for user:', decoded.username);
      reply.send({ valid: true, user: decoded });
    } catch (error) {
      console.log('Token verification failed:', error.message);
      if (error.message.includes('expired')) {
        return reply.status(401).send({ error: 'Token expired', expired: true });
      }
      reply.status(401).send({ error: 'Invalid token' });
    }
  });

  // Get user profile
  fastify.get('/profile/:userId', async (request, reply) => {
    const { userId } = request.params;
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email, created_at, last_login FROM users WHERE id = ?',
        [userId],
        (err, user) => {
          if (err) {
            reply.status(500).send({ error: 'Database error' });
            reject(err);
          } else if (!user) {
            reply.status(404).send({ error: 'User not found' });
            resolve();
          } else {
            reply.send(user);
            resolve();
          }
        }
      );
    });
  });
}

module.exports = routes;