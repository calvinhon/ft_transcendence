import cors from '@fastify/cors';
import userRoutes from './routes/index';
import { createServer, createServiceConfig } from '@ft-transcendence/common';

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

  const server = await createServer(serverConfig, userRoutes, serverOptions);
  await server.start();
}

start();