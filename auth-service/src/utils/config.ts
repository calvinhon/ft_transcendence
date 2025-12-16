// auth-service/src/utils/config.ts
import { ServiceConfig } from '../types';

export const config: ServiceConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  cors: {
    origin: process.env.CORS_ORIGIN === 'true' || true,
    credentials: true
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretkey',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  }
};