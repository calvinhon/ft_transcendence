// auth-service/src/types/fastify-jwt.d.ts
import { FastifyInstance } from 'fastify';
import { JWTPayload } from './index';

declare module 'fastify' {
  interface FastifyInstance {
    jwt: {
      sign(payload: object, options?: any): string;
      verify(token: string): JWTPayload;
    };
  }
}

declare module 'fastify-jwt';