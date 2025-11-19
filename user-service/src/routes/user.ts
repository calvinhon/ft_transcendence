import { FastifyInstance } from 'fastify';
import userProfile from './user-profile';
import userAchievements from './user-achievements';
import userQueries from './user-queries';

export default async function userRoutes(fastify: FastifyInstance) {
  // Register all user route modules
  await fastify.register(userProfile);
  await fastify.register(userAchievements);
  await fastify.register(userQueries);
}