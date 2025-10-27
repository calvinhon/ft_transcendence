// auth-service/server.js
const fastify = require('fastify')({ logger: true });
const path = require('path');

// Register plugins
fastify.register(require('@fastify/cors'), {
  origin: true
});

fastify.register(require('@fastify/jwt'), {
  secret: 'supersecretkey'
});

// Register routes
fastify.register(require('./routes/auth'));

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Auth service running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();