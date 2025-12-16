// user-service/src/server.ts
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import userRoutes from './routes/index';

const fastify = Fastify({ 
  logger: true
});

// Register plugins
fastify.register(cors, {
  origin: true
});

// Register routes
fastify.register(userRoutes);

const start = async (): Promise<void> => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('User service running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();