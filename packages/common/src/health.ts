// packages/common/src/health.ts
import { FastifyReply } from 'fastify';

export interface HealthCheckResponse {
  status: 'ok' | 'healthy';
  service: string;
  timestamp: string;
  version?: string;
  modules?: string[];
  accessibility?: {
    compliant: boolean;
    features: string[];
  };
}

export function createHealthCheckResponse(
  serviceName: string,
  options: {
    version?: string;
    modules?: string[];
    accessibility?: {
      compliant: boolean;
      features: string[];
    };
  } = {}
): HealthCheckResponse {
  return {
    status: 'ok',
    service: serviceName,
    timestamp: new Date().toISOString(),
    ...options
  };
}

export function sendHealthCheck(
  reply: FastifyReply,
  serviceName: string,
  options: {
    version?: string;
    modules?: string[];
    accessibility?: {
      compliant: boolean;
      features: string[];
    };
  } = {}
): void {
  const healthResponse = createHealthCheckResponse(serviceName, options);
  reply.send(healthResponse);
}