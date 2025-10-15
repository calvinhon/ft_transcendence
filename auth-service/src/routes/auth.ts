// auth-service/src/routes/auth.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import path from 'path';

// Local type definitions
interface User {
  userId: number;
  username: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

interface JWTPayload {
  userId: number;
  username: string;
  iat?: number;
  exp?: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const dbPath = path.join(__dirname, '../../database/auth.db');

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

interface DatabaseUser {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  last_login?: string;
}

interface RegisterRequestBody {
  username: string;
  email: string;
  password: string;
}

interface LoginRequestBody {
  username: string;
  password: string;
}

interface UserProfileParams {
  userId: string;
}

async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Register user
  fastify.post<{
    Body: RegisterRequestBody;
  }>('/register', async (request: FastifyRequest<{ Body: RegisterRequestBody }>, reply: FastifyReply) => {
    const { username, email, password } = request.body;
    
    if (!username || !email || !password) {
      return reply.status(400).send({ 
        success: false,
        error: 'Missing required fields' 
      } as ApiResponse);
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      return new Promise<void>((resolve, reject) => {
        db.run(
          'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
          [username, email, hashedPassword],
          function(this: sqlite3.RunResult, err: Error | null) {
            if (err) {
              if (err.message.includes('UNIQUE constraint failed')) {
                reply.status(409).send({ 
                  success: false,
                  error: 'Username or email already exists' 
                } as ApiResponse);
              } else {
                reply.status(500).send({ 
                  success: false,
                  error: 'Database error' 
                } as ApiResponse);
              }
              reject(err);
            } else {
              const token = fastify.jwt.sign({ 
                userId: this.lastID, 
                username: username 
              } as JWTPayload, { expiresIn: '24h' });
              
              reply.send({ 
                success: true,
                message: 'User registered successfully',
                data: {
                  userId: this.lastID,
                  username: username
                },
                token: token
              } as AuthResponse);
              resolve();
            }
          }
        );
      });
    } catch (error) {
      console.error('Registration error:', error);
      return reply.status(500).send({ 
        success: false,
        error: 'Internal server error' 
      } as ApiResponse);
    }
  });

  // Login user
  fastify.post<{
    Body: LoginRequestBody;
  }>('/login', async (request: FastifyRequest<{ Body: LoginRequestBody }>, reply: FastifyReply) => {
    const { username, password } = request.body;
    
    if (!username || !password) {
      return reply.status(400).send({ 
        success: false,
        error: 'Username and password required' 
      } as ApiResponse);
    }

    return new Promise<void>((resolve, reject) => {
      db.get(
        'SELECT id, username, password_hash FROM users WHERE username = ?',
        [username],
        async (err: Error | null, user: DatabaseUser | undefined) => {
          if (err) {
            reply.status(500).send({ 
              success: false,
              error: 'Database error' 
            } as ApiResponse);
            reject(err);
          } else if (!user) {
            reply.status(401).send({ 
              success: false,
              error: 'Invalid credentials' 
            } as ApiResponse);
            resolve();
          } else {
            try {
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
                } as JWTPayload, { expiresIn: '24h' });
                
                reply.send({
                  success: true,
                  message: 'Login successful',
                  user: {
                    userId: user.id,
                    username: user.username
                  },
                  token: token
                } as AuthResponse);
              } else {
                reply.status(401).send({ 
                  success: false,
                  error: 'Invalid credentials' 
                } as ApiResponse);
              }
              resolve();
            } catch (bcryptError) {
              console.error('Bcrypt error:', bcryptError);
              reply.status(500).send({ 
                success: false,
                error: 'Internal server error' 
              } as ApiResponse);
              resolve();
            }
          }
        }
      );
    });
  });

  // Verify token
  fastify.post('/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token) {
        console.log('No token provided in authorization header');
        return reply.status(401).send({ 
          success: false,
          error: 'No token provided' 
        } as ApiResponse);
      }

      console.log('Verifying token:', token.substring(0, 20) + '...');
      const decoded = fastify.jwt.verify(token) as JWTPayload;
      console.log('Token verified successfully for user:', decoded.username);
      
      reply.send({ 
        success: true,
        valid: true, 
        user: decoded 
      } as ApiResponse<{ valid: boolean; user: JWTPayload }>);
    } catch (error) {
      console.log('Token verification failed:', error);
      if (error instanceof Error && error.message.includes('expired')) {
        return reply.status(401).send({ 
          success: false,
          error: 'Token expired', 
          expired: true 
        } as ApiResponse);
      }
      reply.status(401).send({ 
        success: false,
        error: 'Invalid token' 
      } as ApiResponse);
    }
  });

  // Get user profile
  fastify.get<{
    Params: UserProfileParams;
  }>('/profile/:userId', async (request: FastifyRequest<{ Params: UserProfileParams }>, reply: FastifyReply) => {
    const { userId } = request.params;
    
    return new Promise<void>((resolve, reject) => {
      db.get(
        'SELECT id, username, email, created_at, last_login FROM users WHERE id = ?',
        [userId],
        (err: Error | null, user: DatabaseUser | undefined) => {
          if (err) {
            reply.status(500).send({ 
              success: false,
              error: 'Database error' 
            } as ApiResponse);
            reject(err);
          } else if (!user) {
            reply.status(404).send({ 
              success: false,
              error: 'User not found' 
            } as ApiResponse);
            resolve();
          } else {
            const userProfile: User = {
              userId: user.id,
              username: user.username,
              email: user.email,
              created_at: user.created_at
            };
            
            reply.send({ 
              success: true,
              data: userProfile 
            } as ApiResponse<User>);
            resolve();
          }
        }
      );
    });
  });

  // Forgot password endpoint
  fastify.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as { email: string };

    console.log('Forgot password request received for email:', email);

    if (!email) {
      return reply.status(400).send({
        success: false,
        error: 'Email is required'
      } as ApiResponse);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid email format'
      } as ApiResponse);
    }

    return new Promise<void>((resolve, reject) => {
      // First check if user exists
      db.get(
        'SELECT id, email FROM users WHERE email = ?',
        [email],
        async (err: Error | null, user: any) => {
          if (err) {
            console.error('Database error during forgot password:', err);
            reply.status(500).send({
              success: false,
              error: 'Database error'
            } as ApiResponse);
            reject(err);
            return;
          }

          if (!user) {
            // Return success even if user doesn't exist for security
            console.log('Password reset requested for non-existent email:', email);
            reply.send({
              success: true,
              message: 'If an account with that email exists, a password reset link has been sent.'
            } as ApiResponse);
            resolve();
            return;
          }

          // Generate a reset token
          const resetToken = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

          console.log('Generated reset token for user:', user.id, 'Token:', resetToken);

          // Create password_reset_tokens table if it doesn't exist
          db.run(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              token TEXT NOT NULL UNIQUE,
              expires_at DATETIME NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              used BOOLEAN DEFAULT FALSE,
              FOREIGN KEY (user_id) REFERENCES users (id)
            )
          `, (createErr: Error | null) => {
            if (createErr) {
              console.error('Error creating password_reset_tokens table:', createErr);
              reply.status(500).send({
                success: false,
                error: 'Database error'
              } as ApiResponse);
              reject(createErr);
              return;
            }

            // Insert the reset token
            db.run(
              'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
              [user.id, resetToken, expiresAt.toISOString()],
              function(insertErr: Error | null) {
                if (insertErr) {
                  console.error('Error storing reset token:', insertErr);
                  reply.status(500).send({
                    success: false,
                    error: 'Database error'
                  } as ApiResponse);
                  reject(insertErr);
                  return;
                }

                console.log('Reset token stored successfully for user:', user.id);
                
                // In a real app, you would send an email here
                // For development, we'll just log the reset link
                const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
                console.log('\n=== PASSWORD RESET EMAIL (Development) ===');
                console.log(`To: ${email}`);
                console.log(`Reset Link: ${resetLink}`);
                console.log('==========================================\n');

                reply.send({
                  success: true,
                  message: 'If an account with that email exists, a password reset link has been sent.',
                  // In development, include the token for testing
                  ...(process.env.NODE_ENV === 'development' && { resetToken, resetLink })
                } as ApiResponse);
                resolve();
              }
            );
          });
        }
      );
    });
  });
}

export default authRoutes;