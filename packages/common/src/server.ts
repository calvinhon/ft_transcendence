// packages/common/src/server.ts
// Shared server bootstrap utilities for all services

import fs from 'fs';
import Fastify, { FastifyInstance } from 'fastify';
import { Logger, createLogger } from './logger';

export interface ServiceConfig {
  port: number;
  host: string;
  cors?: {
    origin: boolean | string | string[];
    credentials?: boolean;
  };
  serviceName: string;
}

export interface ServerOptions {
  enableCors?: boolean;
  corsConfig?: any;
  enableHealthCheck?: boolean;
  healthCheckModules?: string[];
  corsPlugin?: any; // Allow injecting the cors plugin
}

export class ServerBootstrap {
  private fastify: FastifyInstance;
  private config: ServiceConfig;
  private logger: Logger;
  private options: ServerOptions;

  constructor(config: ServiceConfig, options: ServerOptions = {}) {
    this.config = config;
    this.options = {
      enableCors: true,
      enableHealthCheck: true,
      ...options
    };
    this.logger = createLogger(config.serviceName);
    this.fastify = Fastify({ logger: true, trustProxy: true, https: { cert: fs.readFileSync(process.env.HTTPS_CERT_PATH!), key: fs.readFileSync(process.env.HTTPS_KEY_PATH!) } });
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing server...');

    // Register CORS if enabled and plugin is provided
    if (this.options.enableCors && this.options.corsPlugin) {
      const corsConfig = this.options.corsConfig || this.config.cors || { origin: true };
      await this.fastify.register(this.options.corsPlugin, corsConfig);
      this.logger.info('CORS registered');
    }

    // Register health check if enabled
    if (this.options.enableHealthCheck) {
      this.registerHealthCheck();
      this.logger.info('Health check registered');
    }
  }

  private registerHealthCheck(): void {
    const { sendHealthCheck } = require('./health');
    this.fastify.get('/health', async (request, reply) => {
      sendHealthCheck(reply, this.config.serviceName.toLowerCase(), {
        modules: this.options.healthCheckModules || []
      });
    });
  }

  getFastify(): FastifyInstance {
    return this.fastify;
  }

  getLogger(): Logger {
    return this.logger;
  }

  async start(): Promise<void> {
    try {
      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host
      });
      this.logger.info(`${this.config.serviceName} service running on port ${this.config.port}`);
    } catch (err) {
      this.logger.error('Error starting server', err);
      process.exit(1);
    }
  }

  async registerRoutes(routes: (fastify: FastifyInstance) => Promise<void> | void): Promise<void> {
    await routes(this.fastify);
    this.logger.info('Routes registered');
  }
  
}

// Utility function for quick server setup
export async function createServer(
  config: ServiceConfig,
  routes: (fastify: FastifyInstance) => Promise<void> | void,
  options: ServerOptions = {}
): Promise<ServerBootstrap> {
  const server = new ServerBootstrap(config, options);
  await server.initialize();
  await server.registerRoutes(routes);
  return server;
}
// Shared configuration utility
export function createServiceConfig(serviceName: string, defaultPort: number = 3000): ServiceConfig {
  return {
    port: parseInt(defaultPort.toString(), 10),
    host: process.env.HOST || '0.0.0.0',
    serviceName,
    cors: {
      origin: process.env.CORS_ORIGIN === 'true' || true,
      credentials: true
    }
  };
}