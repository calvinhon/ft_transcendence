// auth-service/src/utils/middleware.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sanitizeLogData } from './responses';

export function setupLogging(fastify: FastifyInstance): void {
  // Request logging
  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    const timestamp = new Date().toISOString();
    console.log(`🟡 [AUTH-SERVICE] [${timestamp}] ← ${request.method} ${request.url}`);

    if (request.body && typeof request.body === 'object' && Object.keys(request.body).length > 0) {
      console.log(`📝 [AUTH-SERVICE] Request body:`, sanitizeLogData(request.body));
    }

    if (request.headers.authorization) {
      console.log(`🔐 [AUTH-SERVICE] Auth header present: ${request.headers.authorization.substring(0, 20)}...`);
    }
  });

  // Response logging
  fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    const timestamp = new Date().toISOString();
    console.log(`🟢 [AUTH-SERVICE] [${timestamp}] → ${request.method} ${request.url} - Status: ${reply.statusCode}`);

    try {
      if (typeof payload === 'string') {
        const responseData = JSON.parse(payload);
        console.log(`📤 [AUTH-SERVICE] Response:`, sanitizeLogData(responseData));
      }
    } catch (e) {
      const size = typeof payload === 'string' ? payload.length :
                  payload instanceof Buffer ? payload.length : 0;
      console.log(`📤 [AUTH-SERVICE] Response size: ${size} bytes`);
    }
  });
}