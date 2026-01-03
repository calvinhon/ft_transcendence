// tournament-service/src/server.ts
import cors from '@fastify/cors';
import routes from './routes';
import { createServer, createServiceConfig } from '@ft-transcendence/common';

const serverConfig = createServiceConfig('TOURNAMENT-SERVICE', 3000);

const serverOptions = {
  healthCheckModules: ['tournaments', 'matches', 'participants'],
  corsPlugin: cors
};

async function start(): Promise<void> {
  const { initializeDatabase } = await import('./database');
  await initializeDatabase();
  const server = await createServer(serverConfig, routes, serverOptions);
  await server.start();
}

start();