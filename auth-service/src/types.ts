export interface User {
  userId: number;
  username: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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

export interface LoginRequestBody {
  username: string;
  password: string;
}

export interface UserProfileParams {
  userId: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  token: string;
  newPassword: string;
}