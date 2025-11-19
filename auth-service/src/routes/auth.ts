import { FastifyInstance } from 'fastify';
import authRegistration from './auth-registration';
import authVerification from './auth-verification';
import authPassword from './auth-password';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register all auth route modules
  await fastify.register(authRegistration);
  await fastify.register(authVerification);
  await fastify.register(authPassword);
}