// auth-service/src/server.ts
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
// @ts-ignore
const jwt = require('fastify-jwt');
import authRoutes from './routes/auth';
import { createServer, createServiceConfig } from '@ft-transcendence/common';
import { config } from './config';

const serverConfig = createServiceConfig('AUTH-SERVICE', 3000);

const serverOptions = {
  healthCheckModules: ['authentication', 'users', 'sessions'],
  corsPlugin: cors
};

async function start(): Promise<void> {
  const server = await createServer(serverConfig, async (fastify) => {
    // Register additional plugins
    await fastify.register(cookie);
    await fastify.register(jwt, { secret: config.jwtSecret });

    // Add a test route
    fastify.get('/test', async (request, reply) => {
      reply.send({ message: 'Test route works' });
    });

    // Register routes
    // await fastify.register(authRoutes);
    await authRoutes(fastify);
  }, serverOptions);

  await server.start();
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}