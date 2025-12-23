// auth-service/src/server.ts
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import authRoutes from './routes/auth';
import { createServer, createServiceConfig } from '@ft-transcendence/common';

const serverConfig = createServiceConfig('AUTH-SERVICE', 3000);

const serverOptions = {
  healthCheckModules: ['authentication', 'users', 'sessions'],
  corsPlugin: cors
};

async function start(): Promise<void> {
  const server = await createServer(serverConfig, async (fastify) => {
    // Register additional plugins
    await fastify.register(cookie);

    // Register routes
    await fastify.register(authRoutes);
  }, serverOptions);

  await server.start();
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}