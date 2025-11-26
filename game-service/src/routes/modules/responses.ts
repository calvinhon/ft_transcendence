// game-service/src/routes/modules/responses.ts
import { FastifyReply } from 'fastify';
import { logger } from './logger';

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
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  };

  logger.debug(`Sending success response:`, { statusCode, message });
  reply.status(statusCode).send(response);
}

export function sendError(
  reply: FastifyReply,
  error: string,
  statusCode: number = 400,
  additionalData?: any
): void {
  const response: ApiResponse = {
    success: false,
    error,
    ...additionalData
  };

  logger.error(`Sending error response:`, { statusCode, error });
  reply.status(statusCode).send(response);
}

export function validateRequiredFields(body: any, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (!body || body[field] === undefined || body[field] === null || body[field] === '') {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}