// user-service/src/utils/logging.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export function setupLogging(fastify: FastifyInstance): void {
  // Request logging
  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const timestamp = new Date().toISOString();
    console.log(`🟠 [USER-SERVICE] [${timestamp}] ← ${request.method} ${request.url}`);

    if (request.body && typeof request.body === 'object' && Object.keys(request.body).length > 0) {
      console.log(`📝 [USER-SERVICE] Request body:`, request.body);
    }

    if (request.headers.authorization) {
      console.log(`🔐 [USER-SERVICE] Auth header present`);
    }
  });

  // Response logging
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    const timestamp = new Date().toISOString();
    console.log(`🟢 [USER-SERVICE] [${timestamp}] → ${request.method} ${request.url} - Status: ${reply.statusCode}`);

    try {
      if (typeof payload === 'string') {
        const responseData = JSON.parse(payload);
        console.log(`📤 [USER-SERVICE] Response data count: ${Array.isArray(responseData) ? responseData.length : 'object'}`);
      }
    } catch (e) {
      const size = typeof payload === 'string' ? payload.length :
                  payload instanceof Buffer ? payload.length : 0;
      console.log(`📤 [USER-SERVICE] Response size: ${size} bytes`);
    }
  });
}