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

// Add request/response logging middleware
fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
  const timestamp = new Date().toISOString();
  console.log(`🟠 [USER-SERVICE] [${timestamp}] ← ${request.method} ${request.url}`);
  
  if (request.body && typeof request.body === 'object' && Object.keys(request.body).length > 0) {
    console.log(`📝 [USER-SERVICE] Request body:`, request.body);
  }
  
  if (request.headers.authorization) {
    console.log(`🔐 [USER-SERVICE] Auth header present`);
  }
});

fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: string) => {
  const timestamp = new Date().toISOString();
  console.log(`🟢 [USER-SERVICE] [${timestamp}] → ${request.method} ${request.url} - Status: ${reply.statusCode}`);
  
  try {
    const responseData = JSON.parse(payload);
    console.log(`📤 [USER-SERVICE] Response data count: ${Array.isArray(responseData) ? responseData.length : 'object'}`);
  } catch (e) {
    console.log(`📤 [USER-SERVICE] Response size: ${payload ? payload.length : 0} bytes`);
  }
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