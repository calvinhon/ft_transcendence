// tournament-service/src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import routes from './routes';

const fastify = Fastify({ 
  logger: true
});

// Register plugins
fastify.register(cors, {
  origin: true
});

// Initialize and start the server
async function init(): Promise<void> {
  console.log('🏆 [SERVER] Initializing server...');
  // Register routes by calling the function directly
  await routes(fastify);
  console.log('🏆 [SERVER] Routes registered');
  
  // Start the server
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Tournament service running on port 3000');
  } catch (err) {
    fastify.log.error({ err }, 'Failed to start tournament-service');
    process.exit(1);
  }
}

init();