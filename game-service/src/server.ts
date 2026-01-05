// game-service/src/server.ts
import '@fastify/cookie';
import '@fastify/session';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import gameRoutes from './routes';
import { createServer, createServiceConfig, sessionSecret } from '@ft-transcendence/common';

const serverConfig = createServiceConfig('GAME-SERVICE', 3000);

const serverOptions = {
  healthCheckModules: ['websocket', 'game-history', 'game-stats', 'online-users', 'friend-service'],
  corsPlugin: cors,
  corsConfig: { origin: true }
};

async function start(): Promise<void> {
  const server = await createServer(serverConfig, async (fastify) => {
    // Register additional plugins
    await fastify.register(websocket);
    await fastify.register(sessionSecret);

    // Register routes
    await fastify.register(gameRoutes);
  }, serverOptions);

  await server.start();
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

export { start }; // important for testing