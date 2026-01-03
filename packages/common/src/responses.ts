// packages/common/src/responses.ts
import { FastifyReply } from 'fastify';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export function sendSuccess<T>(
  reply: FastifyReply,
  data?: T,
  message?: string,
  statusCode: number = 200
): void {
  reply.status(statusCode).send({
    success: true,
    data,
    message
  } as ApiResponse<T>);
}

export function sendError(
  reply: FastifyReply,
  error: string,
  statusCode: number = 400,
  additionalData?: any
): void {
  reply.status(statusCode).send({
    success: false,
    error,
    ...additionalData
  } as ApiResponse);
}

export function validateRequiredFields(body: any, fields: string[]): string | null {
  for (const field of fields) {
    if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
      return `${field} is required`;
    }
  }
  return null;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return null;
}

// Common error messages
export const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'Internal server error',
  INVALID_EMAIL_FORMAT: 'Invalid email format',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters'
} as const;

// Utility functions
export function clampLimit(limit: string | undefined, defaultValue: number, maxValue: number): number {
  return Math.min(parseInt(limit || defaultValue.toString(), 10) || defaultValue, maxValue);
}