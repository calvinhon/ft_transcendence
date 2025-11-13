const fastify = require('fastify')({ logger: true });

// Register plugins
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Register routes
fastify.register(require('./routes/party'));

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('User service running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();