// game-service/src/server.ts
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import gameRoutes from './routes';
import { createServer, createServiceConfig } from '@ft-transcendence/common';

const serverConfig = createServiceConfig('GAME-SERVICE', 3000);

const serverOptions = {
  healthCheckModules: ['games', 'websocket', 'real-time'],
  corsPlugin: cors,
  corsConfig: { origin: true }
};

async function start(): Promise<void> {
  const server = await createServer(serverConfig, async (fastify) => {
    // Register additional plugins
    await fastify.register(websocket);

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