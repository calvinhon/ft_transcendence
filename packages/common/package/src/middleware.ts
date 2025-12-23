// packages/common/src/middleware.ts
import { FastifyInstance } from 'fastify';
import { createLogger } from './logger';

export interface MiddlewareConfig {
  enableCors?: boolean;
  corsConfig?: any;
  enableRateLimit?: boolean;
  rateLimitConfig?: any;
  enableRequestLogging?: boolean;
}

export interface RateLimitConfig {
  max: number;
  timeWindow: number; // in milliseconds
  skipOnError?: boolean;
  keyGenerator?: (req: any) => string;
}

/**
 * Default CORS configuration
 */
export const defaultCorsConfig = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

/**
 * Default rate limiting configuration
 */
export const defaultRateLimitConfig: RateLimitConfig = {
  max: 100,
  timeWindow: 60000, // 1 minute
  skipOnError: true
};

/**
 * Apply common middleware to a Fastify instance
 */
export async function applyCommonMiddleware(
  fastify: FastifyInstance,
  config: MiddlewareConfig = {}
): Promise<void> {
  const logger = createLogger('MIDDLEWARE');

  // CORS is handled by the server bootstrap, but we can log it
  if (config.enableCors !== false) {
    logger.info('CORS enabled with default configuration');
  }

  // Request logging middleware
  if (config.enableRequestLogging) {
    fastify.addHook('onRequest', (request, reply, done) => {
      logger.info(`${request.method} ${request.url}`, {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });
      done();
    });

    fastify.addHook('onResponse', (request, reply, done) => {
      logger.info(`${request.method} ${request.url} - ${reply.statusCode}`, {
        responseTime: reply.getResponseTime()
      });
      done();
    });
  }
}

/**
 * Create rate limiting configuration for specific routes
 */
export function createRateLimitConfig(overrides: Partial<RateLimitConfig> = {}): RateLimitConfig {
  return {
    ...defaultRateLimitConfig,
    ...overrides
  };
}

/**
 * Authentication middleware helper
 * Note: This is a basic helper - actual auth logic should be service-specific
 */
export async function requireAuth(request: any, reply: any): Promise<void> {
  const logger = createLogger('AUTH-MIDDLEWARE');

  // Check for authorization header
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing or invalid authorization header');
    reply.code(401).send({ error: 'Authentication required' });
    return;
  }

  // Extract token (actual validation should be done by auth service)
  const token = authHeader.substring(7);

  // Add token to request for further processing
  request.token = token;

  logger.debug('Authentication token extracted');
}

/**
 * Admin role middleware helper
 */
export async function requireAdmin(request: any, reply: any): Promise<void> {
  const logger = createLogger('ADMIN-MIDDLEWARE');

  // This would typically check user roles from a database or JWT
  // For now, it's a placeholder that assumes auth middleware has run
  if (!request.user || !request.user.isAdmin) {
    logger.warn('Admin access denied', { userId: request.user?.id });
    reply.code(403).send({ error: 'Admin access required' });
    return;
  }

  logger.debug('Admin access granted', { userId: request.user.id });
}

/**
 * Request validation middleware helper
 */
export function validateRequestBody(schema: any) {
  return async (request: any, reply: any): Promise<void> => {
    const logger = createLogger('VALIDATION-MIDDLEWARE');

    try {
      // Basic validation - in a real app, you'd use a validation library
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in request.body)) {
            reply.code(400).send({ error: `Missing required field: ${field}` });
            return;
          }
        }
      }

      logger.debug('Request body validation passed');
    } catch (error) {
      logger.error('Request validation error:', error);
      reply.code(400).send({ error: 'Invalid request format' });
    }
  };
}

/**
 * Error handling middleware
 */
export function createErrorHandler(serviceName: string) {
  const logger = createLogger(serviceName);

  return (error: any, request: any, reply: any): void => {
    logger.error('Request error:', {
      error: error.message,
      stack: error.stack,
      method: request.method,
      url: request.url,
      ip: request.ip
    });

    // Don't leak internal errors
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorResponse = {
      error: isDevelopment ? error.message : 'Internal server error',
      ...(isDevelopment && { stack: error.stack })
    };

    reply.code(error.statusCode || 500).send(errorResponse);
  };
}