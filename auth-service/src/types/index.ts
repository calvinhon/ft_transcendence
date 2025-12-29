// auth-service/src/types/index.ts
import { User, DatabaseUser } from '@ft-transcendence/common';

export { User, DatabaseUser };

//Hoach edited: Added JWTPayload interface for JWT token structure
export interface JWTPayload {
  userId: number;
  username: string;
}
//Hoach edit ended

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