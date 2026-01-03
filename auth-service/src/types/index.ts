// auth-service/src/types/index.ts
import { User, DatabaseUser } from '@ft-transcendence/common';

export { User, DatabaseUser };

export interface RegisterRequestBody {
  username: string;
  email: string;
  password: string;
}

export interface ServiceConfig {
  port: number;
  host: string;
  cors: {
    origin: boolean | string | string[];
    credentials?: boolean;
  };
}