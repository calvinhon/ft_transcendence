// tournament-service/src/server.ts
import '@fastify/cookie';
import '@fastify/session';
import cors from '@fastify/cors';
import routes from './routes';
import { createServer, createServiceConfig, sessionSecret } from '@ft-transcendence/common';

const serverConfig = createServiceConfig('TOURNAMENT-SERVICE', 3000);

const serverOptions = {
  healthCheckModules: ['tournaments', 'matches', 'participants'],
  corsPlugin: cors
};

async function start(): Promise<void> {
  const server = await createServer(serverConfig, async (fastify) => {
    await fastify.register(sessionSecret);
    await routes(fastify);
  }, serverOptions);

  await server.start();
}

start();