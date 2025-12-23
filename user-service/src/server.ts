// user-service/src/server.ts
import cors from '@fastify/cors';
import userRoutes from './routes/index';
import { createServer, createServiceConfig } from '@ft-transcendence/common';

const serverConfig = createServiceConfig('USER-SERVICE', 3000);

const serverOptions = {
  healthCheckModules: ['users', 'profiles'],
  corsPlugin: cors
};

async function start(): Promise<void> {
  const server = await createServer(serverConfig, userRoutes, serverOptions);
  await server.start();
}

start();