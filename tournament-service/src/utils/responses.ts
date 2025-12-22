// tournament-service/src/utils/responses.ts
// Response utilities for consistent API responses

import { FastifyReply } from 'fastify';
import { ApiResponse, PaginatedResponse } from '../types';

export class ResponseUtil {
  /**
   * Send success response
   */
  static success<T = any>(
    reply: FastifyReply,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message
    };
    reply.code(statusCode).send(response);
  }

  /**
   * Send error response
   */
  static error(
    reply: FastifyReply,
    message: string = 'Internal server error',
    statusCode: number = 500,
    error?: string
  ): void {
    const response: ApiResponse = {
      success: false,
      error: message,
      message: error
    };
    reply.code(statusCode).send(response);
  }

  /**
   * Send created response
   */
  static created<T = any>(
    reply: FastifyReply,
    data: T,
    message: string = 'Resource created successfully'
  ): void {
    this.success(reply, data, message, 201);
  }
}