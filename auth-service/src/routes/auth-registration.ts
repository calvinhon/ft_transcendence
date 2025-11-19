import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { RegisterRequestBody, LoginRequestBody, AuthResponse, ApiResponse, JWTPayload, DatabaseUser } from '../types.js';
import { db } from '../auth-logic.js';

export default async function setupAuthRegistrationRoutes(fastify: FastifyInstance): Promise<void> {
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
}