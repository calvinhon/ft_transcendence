// game-service/src/server.ts
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
// Import the routes directory (index.ts) directly — this is more
// robust during container builds and avoids module resolution issues.
import gameRoutes from './routes';

interface ServiceConfig {
  port: number;
  host: string;
}

const config: ServiceConfig = {
  port: 3000,
  host: '0.0.0.0'
};

async function buildServer(): Promise<FastifyInstance> {
  const fastify: FastifyInstance = Fastify({ 
    logger: true
  });

  // Register plugins
  await fastify.register(cors, {
    origin: true
  });

  await fastify.register(websocket);

  // Register routes
  await fastify.register(gameRoutes);

  return fastify;
}

async function start(): Promise<void> {
  try {
    const server = await buildServer();
    await server.listen({ 
      port: config.port, 
      host: config.host 
    });
    console.log(`Game service running on port ${config.port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

export { buildServer, start }; // important for testing