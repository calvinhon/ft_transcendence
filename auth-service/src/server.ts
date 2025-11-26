// auth-service/src/server.ts
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import authRoutes from './routes/auth';
import { config } from './utils/config';

const fastify: FastifyInstance = Fastify({
  logger: true
});

export async function buildServer(): Promise<FastifyInstance> {
  // Register plugins
  await fastify.register(cors, config.cors);
  await fastify.register(jwt, {
    secret: config.jwt.secret
  });

  // Register routes
  await fastify.register(authRoutes);

  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      modules: ['auth']
    };
  });

  return fastify;
}

export async function start(): Promise<void> {
  try {
    const server = await buildServer();
    await server.listen({
      port: config.port,
      host: config.host
    });
    console.log(`Auth service running on port ${config.port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}