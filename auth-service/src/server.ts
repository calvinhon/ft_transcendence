// auth-service/src/server.ts
import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { register, Counter, Histogram } from 'prom-client';
import authRoutes from './routes/auth';
import { config } from './utils/config';

// Augment FastifyRequest to include startTime
declare global {
  namespace FastifyRequest {
    interface FastifyRequest {
      startTime?: number;
    }
  }
}

const fastify: FastifyInstance = Fastify({
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

export async function buildServer(): Promise<FastifyInstance> {
  // Register plugins
  await fastify.register(cors, config.cors);
  await fastify.register(cookie);
  await fastify.register(jwt, {
    secret: config.jwt.secret
  });

  // Metrics endpoint
  fastify.get('/metrics', async () => {
    return register.metrics();
  });

  // Request duration tracking middleware
  fastify.addHook('preHandler', async (request) => {
    (request as any).startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
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

  // Register routes
  await fastify.register(authRoutes);

  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'healthy',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      modules: ['auth']
    };
  });

  return fastify;
}

export async function start(): Promise<void> {
  try {
    const server = await buildServer();
    await server.listen({
      port: config.port,
      host: config.host
    });
    console.log(`Auth service running on port ${config.port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}