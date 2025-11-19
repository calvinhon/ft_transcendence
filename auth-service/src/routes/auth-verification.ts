import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserProfileParams, ApiResponse, JWTPayload, DatabaseUser, User } from '../types.js';
import { db } from '../auth-logic.js';

export default async function setupAuthVerificationRoutes(fastify: FastifyInstance): Promise<void> {
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
}