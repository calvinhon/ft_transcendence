// auth-service/src/utils/config.ts
import { ServiceConfig } from '../types';

export const config: ServiceConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  cors: {
    origin: process.env.CORS_ORIGIN === 'true' || true,
    credentials: true
  }
};