import '@fastify/cookie';
import '@fastify/session';
import cors from '@fastify/cors';
import userRoutes from './routes/index';
// Hoach - campaign progression- backend
import { campaignRoutes } from './routes/campaign';
import { createServer, createServiceConfig, sessionSecret } from '@ft-transcendence/common';

const serverConfig = createServiceConfig('USER-SERVICE', 3000);

const serverOptions = {
  healthCheckModules: ['users', 'profiles'],
  corsPlugin: cors
};

async function start(): Promise<void> {
  try {
    const { initializeDatabase } = await import('./database');
    await initializeDatabase();
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }

  const server = await createServer(serverConfig, async (fastify) => {
    await fastify.register(sessionSecret);
    await userRoutes(fastify);
    // Hoach - campaign progression- backend
    await fastify.register(campaignRoutes, { prefix: '/api/user' });
  }, serverOptions);

  await server.start();
}

start();