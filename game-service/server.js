// game-service/server.js
const fastify = require('fastify')({ logger: true });

// Register plugins
fastify.register(require('@fastify/cors'), {
  origin: true
});

fastify.register(require('@fastify/websocket'));

// Register routes
fastify.register(require('./routes/game'));

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Game service running on port 3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();