// tournament-service/src/utils/logger.ts
// Logging utilities for tournament service

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'TOURNAMENT-SERVICE') {
    this.serviceName = serviceName;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `🏆 [${this.serviceName}] [${timestamp}] [${level}] ${message}`;

    console.log(logMessage);
    if (data) {
      console.log(`📊 Data:`, data);
    }
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  error(message: string, error?: any): void {
    this.log(LogLevel.ERROR, message, error);
  }
}

export const logger = new Logger();