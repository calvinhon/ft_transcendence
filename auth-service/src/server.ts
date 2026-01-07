// auth-service/src/server.ts
import '@fastify/cookie';
import '@fastify/session';
import cors from '@fastify/cors';
import authRoutes from './routes/auth';
import { createServer, createServiceConfig, sessionSecret } from '@ft-transcendence/common';
import { initializeDatabase } from './utils/database';

const serverConfig = createServiceConfig('AUTH-SERVICE', 3000);

const serverOptions = {
  healthCheckModules: ['authentication', 'users', 'sessions'],
  corsPlugin: cors
};

async function start(): Promise<void> {
  try {
    await initializeDatabase();

    const server = await createServer(serverConfig, async (fastify) => {
      // Register additional plugins
      await fastify.register(sessionSecret);

      // Register routes
      await authRoutes(fastify);
    }, serverOptions);

    await server.start();
  } catch (error) {
    console.error('Failed to start AUTH-SERVICE:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}