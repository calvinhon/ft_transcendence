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
      message,
      error
    };
    reply.code(statusCode).send(response);
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    reply: FastifyReply,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message: string = 'Success'
  ): void {
    const totalPages = Math.ceil(total / limit);
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      message,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
    reply.send(response);
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

  /**
   * Send not found response
   */
  static notFound(reply: FastifyReply, message: string = 'Resource not found'): void {
    this.error(reply, message, 404);
  }

  /**
   * Send bad request response
   */
  static badRequest(reply: FastifyReply, message: string = 'Bad request'): void {
    this.error(reply, message, 400);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(reply: FastifyReply, message: string = 'Unauthorized'): void {
    this.error(reply, message, 401);
  }

  /**
   * Send forbidden response
   */
  static forbidden(reply: FastifyReply, message: string = 'Forbidden'): void {
    this.error(reply, message, 403);
  }

  /**
   * Send conflict response
   */
  static conflict(reply: FastifyReply, message: string = 'Conflict'): void {
    this.error(reply, message, 409);
  }
}