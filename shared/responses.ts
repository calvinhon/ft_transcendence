// shared/responses.ts
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