import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import blockchainRoutes from './routes/blockchain.js';

dotenv.config();

const fastify = Fastify({ logger: true });

// Register plugins
await fastify.register(cors, {
  origin: true
});

// Register routes
await fastify.register(blockchainRoutes);

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`Blockchain service running on port 3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();