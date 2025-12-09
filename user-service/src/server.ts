// user-service/src/server.ts
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { register, Counter, Histogram } from 'prom-client';
import userRoutes from './routes/index';
import { setupLogging } from './utils/logging';

// Augment FastifyRequest to include startTime
declare global {
  namespace FastifyRequest {
    interface FastifyRequest {
      startTime?: number;
    }
  }
}

const fastify = Fastify({ 
  logger: true
});

// Create metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Register plugins
fastify.register(cors, {
  origin: true
});

// Metrics endpoint
fastify.get('/metrics', async () => {
  return register.metrics();
});

// Request duration tracking middleware
fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
  (request as any).startTime = Date.now();
});

fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
  const duration = (Date.now() - ((request as any).startTime || Date.now())) / 1000;
  httpRequestDuration.observe(
    { method: request.method, route: request.url, status_code: reply.statusCode },
    duration
  );
  httpRequestsTotal.inc({
    method: request.method,
    route: request.url,
    status_code: reply.statusCode
  });
});

// Setup logging
setupLogging(fastify);

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