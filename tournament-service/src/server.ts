// tournament-service/src/server.ts
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import routes from './routes';

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
  console.log(`🟣 [TOURNAMENT-SERVICE] [${timestamp}] ← ${request.method} ${request.url}`);
  
  if (request.body && typeof request.body === 'object' && Object.keys(request.body).length > 0) {
    console.log(`📝 [TOURNAMENT-SERVICE] Request body:`, request.body);
  }
  
  if (request.headers.authorization) {
    console.log(`🔐 [TOURNAMENT-SERVICE] Auth header present`);
  }
});

fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: string) => {
  const timestamp = new Date().toISOString();
  console.log(`🟢 [TOURNAMENT-SERVICE] [${timestamp}] → ${request.method} ${request.url} - Status: ${reply.statusCode}`);
  
  try {
    const responseData = JSON.parse(payload);
    console.log(`📤 [TOURNAMENT-SERVICE] Response data count: ${Array.isArray(responseData) ? responseData.length : 'object'}`);
  } catch (e) {
    console.log(`📤 [TOURNAMENT-SERVICE] Response size: ${payload ? payload.length : 0} bytes`);
  }
});

// Initialize and start the server
async function init(): Promise<void> {
  console.log('🏆 [SERVER] Initializing server...');
  // Register routes by calling the function directly
  await routes(fastify);
  console.log('🏆 [SERVER] Routes registered');
  
  // Start the server
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Tournament service running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

init();