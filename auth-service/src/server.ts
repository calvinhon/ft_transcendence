// auth-service/src/server.ts
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import authRoutes from './routes/auth';
import { config } from './utils/config';
import axios from 'axios';

// Vault client setup for server initialization
const vault = require('node-vault')({
  endpoint: process.env.VAULT_ADDR || 'http://vault:8200',
  token: process.env.VAULT_TOKEN,
  tls: {
    rejectUnauthorized: false // Skip TLS verification for self-signed cert
  }
});

const fastify: FastifyInstance = Fastify({
  logger: true
});

/**
 * Load JWT secret from Vault and update config
 */
async function loadJWTSecret(): Promise<void> {
  try {
    console.log('🔐 Loading JWT secret from Vault...');

    const vaultAddr = process.env.VAULT_ADDR || 'http://vault:8200';
    const vaultToken = process.env.VAULT_TOKEN;

    const response = await axios.get(`${vaultAddr}/v1/kv/data/jwt`, {
      headers: { 'X-Vault-Token': vaultToken }
    });

    const jwtSecret = response.data.data.data.secret;

    // Update config with Vault secret
    (config.jwt as any).secret = jwtSecret;
    console.log('✅ JWT secret loaded from Vault and config updated');
  } catch (error) {
    console.error('❌ Failed to load JWT secret from Vault:', error);
    // Fallback to environment variable (already set in config)
    console.log('⚠️ Using fallback JWT secret from environment');
  }
}

export async function buildServer(): Promise<FastifyInstance> {
  // Load secrets from Vault before building server
  await loadJWTSecret();
  // Register plugins
  await fastify.register(cors, config.cors);
  await fastify.register(cookie);
  await fastify.register(jwt, {
    secret: config.jwt.secret
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