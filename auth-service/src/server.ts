// auth-service/src/server.ts
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import authRoutes from './routes/auth';

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
    console.log(`🟡 [AUTH-SERVICE] [${timestamp}] ← ${request.method} ${request.url}`);
    
    if (request.body && typeof request.body === 'object' && Object.keys(request.body).length > 0) {
      const sanitizedBody = { ...request.body as Record<string, any> };
      if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
      console.log(`📝 [AUTH-SERVICE] Request body:`, sanitizedBody);
    }
    
    if (request.headers.authorization) {
      console.log(`🔐 [AUTH-SERVICE] Auth header present: ${request.headers.authorization.substring(0, 20)}...`);
    }
  });

  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    const timestamp = new Date().toISOString();
    console.log(`🟢 [AUTH-SERVICE] [${timestamp}] → ${request.method} ${request.url} - Status: ${reply.statusCode}`);
    
    try {
      if (typeof payload === 'string') {
        const responseData = JSON.parse(payload);
        const sanitizedResponse = { ...responseData };
        if (sanitizedResponse.token && typeof sanitizedResponse.token === 'string') {
          sanitizedResponse.token = sanitizedResponse.token.substring(0, 10) + '...[REDACTED]';
        }
        console.log(`📤 [AUTH-SERVICE] Response:`, sanitizedResponse);
      }
    } catch (e) {
      // Non-JSON response, just log size
      const size = typeof payload === 'string' ? payload.length : 
                  payload instanceof Buffer ? payload.length : 0;
      console.log(`📤 [AUTH-SERVICE] Response size: ${size} bytes`);
    }
  });

  // Register routes
  await fastify.register(authRoutes);

  return fastify;
}

async function start(): Promise<void> {
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

export { buildServer, start };
export default fastify;