// auth-service/src/types/index.ts
export interface User {
  userId: number;
  username: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseUser {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  last_login?: string;
}

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