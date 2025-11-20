// user-service/src/server.ts
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import userRoutes from './routes/user';

interface ServiceConfig {
  port: number;
  host: string;
  cors: {
    origin: boolean | string | string[];
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

const config: ServiceConfig = {
  port: 3000,
  host: '0.0.0.0',
  cors: {
    origin: true
  },
  jwt: {
    secret: 'supersecretkey',
    expiresIn: '1h'
  }
};

const fastify: FastifyInstance = Fastify({ 
  logger: true
});

async function buildServer(): Promise<FastifyInstance> {
  // Register plugins
  await fastify.register(cors, config.cors);
  
  await fastify.register(jwt, {
    secret: config.jwt!.secret
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
  await fastify.register(userRoutes);

  return fastify;
}

async function start(): Promise<void> {
  try {
    const server = await buildServer();
    await server.listen({ port: config.port, host: config.host });
    console.log('User service running on port 3000');
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

export { buildServer, start };
export default fastify;